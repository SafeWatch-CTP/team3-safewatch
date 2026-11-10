// NWS alerts for New York State: docs/specs/incidents/public-feed-ingestion.md
import axios from "axios";
import { log } from "@project/log";
import type { HttpGet, IngestRecord } from "./types";

const ALERTS_URL = "https://api.weather.gov/alerts/active";
const USER_AGENT = "safewatch (team3-safewatch)";

export const defaultGet: HttpGet = async (url, params) =>
  (await axios.get(url, { params, timeout: 20_000, headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" } })).data;

const SEVERITY = { Extreme: "CRITICAL", Severe: "HIGH", Moderate: "MEDIUM" } as const;

type Bounds = { minLat: number; maxLat: number; minLon: number; maxLon: number };

function extend(b: Bounds | null, coords: unknown): Bounds | null {
  if (!Array.isArray(coords)) return b;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const [lon, lat] = coords as number[];
    return b
      ? { minLat: Math.min(b.minLat, lat), maxLat: Math.max(b.maxLat, lat), minLon: Math.min(b.minLon, lon), maxLon: Math.max(b.maxLon, lon) }
      : { minLat: lat, maxLat: lat, minLon: lon, maxLon: lon };
  }
  return coords.reduce<Bounds | null>((acc, c) => extend(acc, c), b);
}

const zoneBounds = new Map<string, Bounds | null>();

async function boundsOfZone(url: string, get: HttpGet): Promise<Bounds | null> {
  if (zoneBounds.has(url)) return zoneBounds.get(url)!;
  const zone: any = await get(url);
  const bounds = extend(null, zone?.geometry?.coordinates);
  zoneBounds.set(url, bounds);
  return bounds;
}

async function locate(feature: any, get: HttpGet): Promise<{ latitude: number; longitude: number } | null> {
  let bounds = extend(null, feature.geometry?.coordinates);
  if (!bounds) {
    const zones: string[] = feature.properties?.affectedZones ?? [];
    for (const url of zones) {
      try {
        const zb = await boundsOfZone(url, get);
        if (zb) bounds = bounds ? extend(extend(bounds, [zb.minLon, zb.minLat]), [zb.maxLon, zb.maxLat]) : zb;
      } catch (err) {
        log.warn({ err: String(err), url }, "nws: zone lookup failed");
      }
    }
  }
  if (!bounds) return null;
  return { latitude: (bounds.minLat + bounds.maxLat) / 2, longitude: (bounds.minLon + bounds.maxLon) / 2 };
}

export async function fetchNwsRecords(get: HttpGet = defaultGet): Promise<IngestRecord[]> {
  const body: any = await get(ALERTS_URL, { area: "NY" });
  const records: IngestRecord[] = [];
  for (const feature of body.features ?? []) {
    const p = feature.properties ?? {};
    if (!p.id || !p.event) continue;
    const where = await locate(feature, get);
    if (!where) {
      log.warn({ id: p.id }, "nws: alert has no resolvable location — skipped");
      continue;
    }
    const sent = new Date(p.sent ?? p.effective ?? Date.now());
    records.push({
      externalId: `nws:${p.id}`,
      source: "nws",
      title: p.event,
      description: p.headline ?? undefined,
      category: "SEVERE_WEATHER",
      severity: SEVERITY[p.severity as keyof typeof SEVERITY] ?? "LOW",
      status: "ACTIVE",
      createdAt: Number.isNaN(sent.getTime()) ? new Date() : sent,
      ...where,
    });
  }
  return records;
}
