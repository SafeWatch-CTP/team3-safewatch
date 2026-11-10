import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../packages/redis/src/index", () => ({
  indexIncident: vi.fn(async () => {}),
  removeIncident: vi.fn(async () => {}),
}));

// Public feed ingestion: docs/specs/incidents/public-feed-ingestion.md
describe("public feed ingestion", () => {
  let prisma: any;
  let fetchNwsRecords: any;
  let parse311: any;
  let runIngestRound: any;
  let indexIncident: any;

  const zoneUrl = "https://api.weather.gov/zones/county/NYC105";
  const zoneGeometry = {
    geometry: {
      type: "Polygon",
      coordinates: [[[-75, 41], [-74, 41], [-74, 42], [-75, 42], [-75, 41]]],
    },
  };
  const alert = (id: string, severity: string, extra: Record<string, unknown> = {}) => ({
    geometry: null,
    properties: {
      id,
      event: "Flood Warning",
      headline: "Flood Warning issued",
      severity,
      sent: "2026-10-29T15:13:00-04:00",
      affectedZones: [zoneUrl],
      ...extra,
    },
  });
  const nwsGet = (features: unknown[]) => async (url: string) =>
    url === zoneUrl ? zoneGeometry : { features };

  const row = (key: string, type: string, extra: Record<string, unknown> = {}) => ({
    unique_key: key,
    complaint_type: type,
    descriptor: "Detail",
    created_date: "2026-10-28T02:05:57.000",
    latitude: "40.70",
    longitude: "-74.00",
    status: "Open",
    ...extra,
  });

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    prisma = (await import("@project/db")).prisma;
    ({ fetchNwsRecords } = await import("../../apps/worker/src/ingest/nws"));
    ({ parse311 } = await import("../../apps/worker/src/ingest/nyc311"));
    ({ runIngestRound } = await import("../../apps/worker/src/ingest/run"));
    ({ indexIncident } = await import("../../packages/redis/src/index"));
  });

  beforeEach(async () => {
    await prisma.incident.deleteMany();
    indexIncident.mockClear();
  });

  it("maps an NWS alert: severity, category, zone-centre pin, sent time", async () => {
    const [rec] = await fetchNwsRecords(nwsGet([alert("a1", "Severe")]));
    expect(rec).toMatchObject({
      externalId: "nws:a1",
      source: "nws",
      title: "Flood Warning",
      category: "SEVERE_WEATHER",
      severity: "HIGH",
      latitude: 41.5,
      longitude: -74.5,
    });
    expect(rec.createdAt.toISOString()).toBe("2026-10-29T19:13:00.000Z");
  });

  it.each([
    ["Extreme", "CRITICAL"],
    ["Severe", "HIGH"],
    ["Moderate", "MEDIUM"],
    ["Minor", "LOW"],
    ["Unknown", "LOW"],
  ])("NWS severity %s → %s", async (nws, ours) => {
    const [rec] = await fetchNwsRecords(nwsGet([alert("s", nws)]));
    expect(rec.severity).toBe(ours);
  });

  it("skips an NWS alert whose location cannot be resolved", async () => {
    const emptyZone = "https://api.weather.gov/zones/county/NYC999";
    const recs = await fetchNwsRecords(async (url: string) =>
      url === emptyZone ? { geometry: null } : { features: [alert("x", "Severe", { affectedZones: [emptyZone] })] },
    );
    expect(recs).toEqual([]);
  });

  it("ingests only allow-listed 311 types with coordinates", () => {
    const recs = parse311([
      row("1", "Traffic Signal Condition"),
      row("2", "Noise - Residential"),
      row("3", "SAFETY", { latitude: undefined, longitude: undefined }),
      row("4", "Non-Emergency Police Matter", { status: "Closed", incident_address: "100 WATER STREET" }),
    ]);
    expect(recs.map((r: any) => r.externalId)).toEqual(["nyc311:1", "nyc311:4"]);
    expect(recs[0]).toMatchObject({ category: "TRAFFIC_HAZARD", severity: "LOW", status: "ACTIVE" });
    expect(recs[0].createdAt.toISOString()).toBe("2026-10-28T06:05:57.000Z");
    expect(recs[1]).toMatchObject({ category: "CRIME", status: "RESOLVED", address: "100 WATER STREET" });
  });

  it("reads 311 timestamps as New York time, across daylight saving", () => {
    const at = (s: string) => parse311([row("t", "SAFETY", { created_date: s })])[0].createdAt.toISOString();
    expect(at("2026-07-01T12:00:00.000")).toBe("2026-07-01T16:00:00.000Z");
    expect(at("2026-12-01T12:00:00.000")).toBe("2026-12-01T17:00:00.000Z");
  });

  it("saves once, never duplicates, and indexes only on create", async () => {
    const sources = {
      nws: async () => [],
      nyc311: async () => parse311([row("9", "Damaged Tree")]),
    };
    await runIngestRound(sources);
    await runIngestRound(sources);
    const rows = await prisma.incident.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].createdAt.toISOString()).toBe("2026-10-28T06:05:57.000Z");
    expect(indexIncident).toHaveBeenCalledTimes(1);
  });

  it("updates status when 311 later reports the request closed", async () => {
    const open = parse311([row("5", "SAFETY")]);
    await runIngestRound({ nws: async () => [], nyc311: async () => open });
    await runIngestRound({ nws: async () => [], nyc311: async () => parse311([row("5", "SAFETY", { status: "Closed" })]) });
    const [r] = await prisma.incident.findMany();
    expect(r.status).toBe("RESOLVED");
    expect(r.resolvedAt).not.toBeNull();
  });

  it("resolves an NWS incident that is no longer reported, but not other sources", async () => {
    const recs = await fetchNwsRecords(nwsGet([alert("gone", "Severe")]));
    await runIngestRound({ nws: async () => recs, nyc311: async () => parse311([row("7", "SAFETY")]) });
    await runIngestRound({ nws: async () => [], nyc311: async () => parse311([row("7", "SAFETY")]) });
    const byId = Object.fromEntries((await prisma.incident.findMany()).map((i: any) => [i.externalId, i.status]));
    expect(byId["nws:gone"]).toBe("RESOLVED");
    expect(byId["nyc311:7"]).toBe("ACTIVE");
  });

  it("a failing source does not stop the other or leave NWS rows resolved", async () => {
    const recs = await fetchNwsRecords(nwsGet([alert("keep", "Severe")]));
    await runIngestRound({ nws: async () => recs, nyc311: async () => [] });
    await runIngestRound({
      nws: async () => {
        throw new Error("nws down");
      },
      nyc311: async () => parse311([row("8", "SAFETY")]),
    });
    const byId = Object.fromEntries((await prisma.incident.findMany()).map((i: any) => [i.externalId, i.status]));
    expect(byId["nws:keep"]).toBe("ACTIVE");
    expect(byId["nyc311:8"]).toBe("ACTIVE");
  });

  it("still saves the incident when coordinate indexing fails", async () => {
    indexIncident.mockRejectedValueOnce(new Error("redis down"));
    await runIngestRound({ nws: async () => [], nyc311: async () => parse311([row("6", "SAFETY")]) });
    expect(await prisma.incident.count()).toBe(1);
  });
});
