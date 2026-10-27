import { beforeAll, describe, expect, it } from "vitest";

describe("incident feed ordering", () => {
  let prisma: any;
  let listActiveIncidents: any;

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const dbModule = await import("@project/db");
    const domainModule = await import("@project/domain");

    prisma = dbModule.prisma;
    listActiveIncidents = domainModule.listActiveIncidents;

    // The PGlite test door applies the real migrations when the client opens
    // (packages/db/src/client.ts), so the schema already exists here.

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
          latitude: 40.7128,
          longitude: -74.006,
          userId: user.id,
          createdAt: new Date("2025-01-01T00:00:00Z"),
        },
        {
          title: "High priority event",
          status: "ACTIVE",
          severity: "HIGH",
          latitude: 40.7128,
          longitude: -74.006,
          userId: user.id,
          createdAt: new Date("2025-01-03T00:00:00Z"),
        },
        {
          title: "Critical newest",
          status: "ACTIVE",
          severity: "CRITICAL",
          latitude: 40.7128,
          longitude: -74.006,
          userId: user.id,
          createdAt: new Date("2025-01-05T00:00:00Z"),
        },
        {
          title: "Critical older",
          status: "INVESTIGATING",
          severity: "CRITICAL",
          latitude: 40.7128,
          longitude: -74.006,
          userId: user.id,
          createdAt: new Date("2025-01-02T00:00:00Z"),
        },
        {
          title: "Low priority event",
          status: "ACTIVE",
          severity: "LOW",
          latitude: 40.7128,
          longitude: -74.006,
          userId: user.id,
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
});
