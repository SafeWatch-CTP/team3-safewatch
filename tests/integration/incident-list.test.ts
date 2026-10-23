import { beforeAll, describe, expect, it } from "vitest";

describe("incident feed ordering", () => {
  let prisma: any;
  let listActiveIncidents: any;

  beforeAll(async () => {
    // The PGlite door applies the real migrations when the client is created.
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const dbModule = await import("@project/db");
    const domainModule = await import("@project/domain");

    prisma = dbModule.prisma;
    listActiveIncidents = domainModule.listActiveIncidents;

    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: "incident-feed@example.com",
        phoneNumber: "+15550000000",
        password: "hashed-password",
      },
    });

    await prisma.incident.createMany({
      data: [
        {
          title: "Resolved event",
          status: "RESOLVED",
          severity: "LOW",
          latitude: 40.7000,
          longitude: -74.0000,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        },
        {
          title: "High priority event",
          status: "ACTIVE",
          severity: "HIGH",
          latitude: 40.7300,
          longitude: -73.9900,
          createdAt: new Date("2025-01-03T00:00:00Z"),
        },
        {
          title: "Critical newest",
          status: "ACTIVE",
          severity: "CRITICAL",
          latitude: 40.7580,
          longitude: -73.9855,
          createdAt: new Date("2025-01-05T00:00:00Z"),
        },
        {
          title: "Critical older",
          status: "INVESTIGATING",
          severity: "CRITICAL",
          latitude: 40.6892,
          longitude: -74.0445,
          createdAt: new Date("2025-01-02T00:00:00Z"),
        },
        {
          title: "Low priority event",
          status: "ACTIVE",
          severity: "LOW",
          latitude: 40.7829,
          longitude: -73.9654,
          createdAt: new Date("2025-01-04T00:00:00Z"),
        },
      ],
    });

    expect(user.id).toBeTruthy();
  });

  it("lists active incidents by severity and recency", async () => {
    const incidents = await listActiveIncidents();

    expect(incidents.map((incident) => incident.title)).toEqual([
      "Critical newest",
      "Critical older",
      "High priority event",
      "Low priority event",
    ]);
    expect(incidents.some((incident) => incident.title === "Resolved event")).toBe(false);
  });

  it("gives each incident its coordinates, for the map", async () => {
    const incidents = await listActiveIncidents();

    expect(
      incidents.map(({ title, latitude, longitude }) => ({ title, latitude, longitude }))
    ).toEqual([
      { title: "Critical newest", latitude: 40.758, longitude: -73.9855 },
      { title: "Critical older", latitude: 40.6892, longitude: -74.0445 },
      { title: "High priority event", latitude: 40.73, longitude: -73.99 },
      { title: "Low priority event", latitude: 40.7829, longitude: -73.9654 },
    ]);
  });
});
