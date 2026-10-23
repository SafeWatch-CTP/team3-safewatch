import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("../../packages/auth/src/auth", () => ({ auth: authMock }));

// The nearby route asks Redis which incident ids are in range. Tests have no
// Redis, so the spatial lookup is replaced; Postgres (PGlite) stays real.
const { getIncidentIdsInRadius } = vi.hoisted(() => ({ getIncidentIdsInRadius: vi.fn() }));
vi.mock("../../packages/redis/src/index", () => ({ getIncidentIdsInRadius }));

describe("incident routes", () => {
  let prisma: any;
  let getNearby: any;
  let getById: any;

  const nearby = (query: string) =>
    getNearby(new Request(`http://localhost/api/v1/incidents/nearby${query}`));

  const byId = (id: string) =>
    getById(new Request(`http://localhost/api/v1/incidents/${id}`), {
      params: Promise.resolve({ id }),
    });

  const createIncident = (title: string, status = "ACTIVE") =>
    prisma.incident.create({
      data: { title, status, severity: "HIGH", latitude: 40.7128, longitude: -74.006 },
    });

  const inRange = (...incidents: Array<{ id: string }>) =>
    getIncidentIdsInRadius.mockResolvedValue(incidents.map((i) => ({ member: i.id })));

  beforeAll(async () => {
    // The PGlite door applies the real migrations when the client is created.
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    prisma = (await import("@project/db")).prisma;
    getNearby = (await import("../../apps/web/app/api/v1/incidents/nearby/route")).GET;
    getById = (await import("../../apps/web/app/api/v1/incidents/[id]/route")).GET;
  });

  beforeEach(async () => {
    await prisma.incident.deleteMany();
    getIncidentIdsInRadius.mockReset();
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "incident-user" } });
  });

  describe("GET /api/v1/incidents/nearby", () => {
    it("requires a session before searching for incidents", async () => {
      authMock.mockResolvedValueOnce(null);
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const response = await nearby("?latitude=40.71&longitude=-74.00");

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
          error: { code: "UNAUTHORIZED", message: "Authentication is required." },
        });
        expect(getIncidentIdsInRadius).not.toHaveBeenCalled();
      } finally {
        logged.mockRestore();
      }
    });

    it("returns in-range incidents as pins, nearest first", async () => {
      const far = await createIncident("Far");
      const near = await createIncident("Near");
      inRange(near, far);

      const response = await nearby("?latitude=40.71&longitude=-74.00");

      expect(response.status).toBe(200);
      const pins = await response.json();
      expect(pins.map((p: any) => p.title)).toEqual(["Near", "Far"]);
      expect(Object.keys(pins[0]).sort()).toEqual(
        ["category", "createdAt", "id", "latitude", "longitude", "severity", "title"]
      );
    });

    it("leaves out incidents that are no longer active", async () => {
      const active = await createIncident("Active");
      const investigating = await createIncident("Investigating", "INVESTIGATING");
      const resolved = await createIncident("Resolved", "RESOLVED");
      inRange(active, investigating, resolved);

      const pins = await (await nearby("?latitude=40.71&longitude=-74.00")).json();

      expect(pins.map((p: any) => p.title)).toEqual(["Active", "Investigating"]);
    });

    it("searches a 10 mile radius by default and converts it to meters", async () => {
      inRange();

      await nearby("?latitude=40.71&longitude=-74.00");

      expect(getIncidentIdsInRadius).toHaveBeenCalledWith(40.71, -74, 10 * 1609.34);
    });

    it("returns an empty list when nothing is in range", async () => {
      inRange();

      const response = await nearby("?latitude=40.71&longitude=-74.00");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    it("rejects a missing latitude with 400 before searching", async () => {
      const response = await nearby("?longitude=-74.00");

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
      expect(getIncidentIdsInRadius).not.toHaveBeenCalled();
    });

    it("rejects a radius over 50 miles with 400", async () => {
      const response = await nearby("?latitude=40.71&longitude=-74.00&radiusInMiles=51");

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 500 in the standard error shape when the lookup fails", async () => {
      getIncidentIdsInRadius.mockRejectedValue(new Error("redis unreachable"));
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await nearby("?latitude=40.71&longitude=-74.00");

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
      });
      logged.mockRestore();
    });
  });

  describe("GET /api/v1/incidents/[id]", () => {
    it("requires a session before returning incident details", async () => {
      const incident = await createIncident("Private to signed-in users");
      authMock.mockResolvedValueOnce(null);
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const response = await byId(incident.id);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
          error: { code: "UNAUTHORIZED", message: "Authentication is required." },
        });
      } finally {
        logged.mockRestore();
      }
    });

    it("returns the incident with its timeline updates and alerts", async () => {
      const incident = await createIncident("Warehouse fire");
      await prisma.incidentUpdate.create({
        data: { incidentId: incident.id, message: "Crews on scene" },
      });

      const response = await byId(incident.id);

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.title).toBe("Warehouse fire");
      expect(payload.updates.map((u: any) => u.message)).toEqual(["Crews on scene"]);
      expect(payload.alerts).toEqual([]);
    });

    it("returns 404 for a well-formed id that matches no incident", async () => {
      const response = await byId("cjld2cjxh0000qzrmn831i7rn");

      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });

    it("rejects a malformed id with 400", async () => {
      const response = await byId("not-a-cuid");

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    });
  });
});

// pnpm vitest run tests/integration/incident-routes.test.ts
