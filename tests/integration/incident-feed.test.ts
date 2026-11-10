import { beforeAll, describe, expect, it } from "vitest";

// Feed tab queries: docs/specs/incidents/incident-feed.md
describe("recent incidents for the Feed tab", () => {
  let prisma: any;
  let listRecentIncidents: any;
  let getIncidentDetail: any;
  let ids: Record<string, string>;

  const base = { latitude: 40.7, longitude: -74.0 };

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const dbModule = await import("@project/db");
    const domainModule = await import("@project/domain");

    prisma = dbModule.prisma;
    listRecentIncidents = domainModule.listRecentIncidents;
    getIncidentDetail = domainModule.getIncidentDetail;

    await prisma.incident.deleteMany();

    const make = (title: string, data: Record<string, unknown>) =>
      prisma.incident.create({ data: { title, ...base, ...data } });

    const rows = {
      criticalYesterday: await make("Critical yesterday", {
        severity: "CRITICAL",
        category: "FIRE",
        createdAt: new Date("2025-01-04T00:00:00Z"),
      }),
      lowNewest: await make("Low newest", {
        severity: "LOW",
        category: "MEDICAL",
        createdAt: new Date("2025-01-05T00:00:00Z"),
      }),
      fireInvestigating: await make("Fire investigating", {
        severity: "MEDIUM",
        category: "FIRE",
        status: "INVESTIGATING",
        createdAt: new Date("2025-01-03T00:00:00Z"),
      }),
      resolvedFire: await make("Resolved fire", {
        severity: "HIGH",
        category: "FIRE",
        status: "RESOLVED",
        createdAt: new Date("2025-01-06T00:00:00Z"),
      }),
      cancelled: await make("Cancelled", {
        severity: "HIGH",
        status: "CANCELLED",
        createdAt: new Date("2025-01-07T00:00:00Z"),
      }),
    };
    ids = Object.fromEntries(Object.entries(rows).map(([k, v]: any) => [k, v.id]));

    await prisma.incidentUpdate.createMany({
      data: [
        { incidentId: ids.criticalYesterday, message: "Second", createdAt: new Date("2025-01-04T02:00:00Z") },
        { incidentId: ids.criticalYesterday, message: "First", createdAt: new Date("2025-01-04T01:00:00Z") },
      ],
    });
  });

  it("lists active and investigating incidents newest first, ignoring severity", async () => {
    const incidents = await listRecentIncidents();

    expect(incidents.map((i: any) => i.title)).toEqual([
      "Low newest",
      "Critical yesterday",
      "Fire investigating",
    ]);
  });

  it("leaves out resolved and cancelled incidents", async () => {
    const titles = (await listRecentIncidents()).map((i: any) => i.title);

    expect(titles).not.toContain("Resolved fire");
    expect(titles).not.toContain("Cancelled");
  });

  it("narrows to one category", async () => {
    const incidents = await listRecentIncidents({ category: "FIRE" });

    expect(incidents.map((i: any) => i.title)).toEqual(["Critical yesterday", "Fire investigating"]);
  });

  it("returns an empty list when no incident has the category", async () => {
    expect(await listRecentIncidents({ category: "CRIME" })).toEqual([]);
  });

  it("returns only what a card shows", async () => {
    const [first] = await listRecentIncidents();

    expect(Object.keys(first).sort()).toEqual(
      ["address", "category", "createdAt", "id", "severity", "title"]
    );
  });

  it("returns at most 50 incidents", async () => {
    await prisma.incident.createMany({
      data: Array.from({ length: 55 }, (_, n) => ({
        title: `Bulk ${n}`,
        severity: "LOW",
        category: "OTHER",
        createdAt: new Date(Date.UTC(2025, 1, 1, 0, n)),
        ...base,
      })),
    });

    const incidents = await listRecentIncidents();

    expect(incidents).toHaveLength(50);
    expect(incidents[0].title).toBe("Bulk 54");

    await prisma.incident.deleteMany({ where: { category: "OTHER" } });
  });

  it("gives an incident's timeline oldest first, without alerts", async () => {
    const detail = await getIncidentDetail(ids.criticalYesterday);

    expect(detail.title).toBe("Critical yesterday");
    expect(detail.updates.map((u: any) => u.message)).toEqual(["First", "Second"]);
    expect(detail).not.toHaveProperty("alerts");
  });

  it("opens a resolved incident by id", async () => {
    const detail = await getIncidentDetail(ids.resolvedFire);

    expect(detail.status).toBe("RESOLVED");
  });

  it("returns null for a well-formed id that matches nothing", async () => {
    expect(await getIncidentDetail("cjld2cjxh0000qzrmn831i7rn")).toBeNull();
  });
});
