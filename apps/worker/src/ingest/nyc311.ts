// NYC 311 service requests: docs/specs/incidents/public-feed-ingestion.md
import type { IncidentCategory } from "@project/db";
import type { HttpGet, IngestRecord } from "./types";
import { defaultGet } from "./nws";

const URL_311 = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const WINDOW_HOURS = 72;
const ROW_LIMIT = 500;

// 311 timestamps carry no zone; they are New York wall-clock time.
export function newYorkLocalToDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return new Date(NaN);
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, se);
  const offsetMs = (at: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", hourCycle: "h23",
        year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
      }).formatToParts(new Date(at)).map((p) => [p.type, Number(p.value)]),
    );
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - at;
  };
  const guess = asUtc - offsetMs(asUtc);
  return new Date(asUtc - offsetMs(guess));
}

export const ALLOWED_311: Record<string, IncidentCategory> = {
  "Non-Emergency Police Matter": "CRIME",
  SAFETY: "OTHER",
  "Traffic Signal Condition": "TRAFFIC_HAZARD",
  "Damaged Tree": "TRAFFIC_HAZARD",
};

export function parse311(rows: any[]): IngestRecord[] {
  const records: IngestRecord[] = [];
  for (const r of rows) {
    const category = ALLOWED_311[r.complaint_type];
    if (!category || !r.unique_key) continue;
    const latitude = Number(r.latitude);
    const longitude = Number(r.longitude);
    const createdAt = newYorkLocalToDate(String(r.created_date));
    if (!r.latitude || !r.longitude || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (Number.isNaN(createdAt.getTime())) continue;
    records.push({
      externalId: `nyc311:${r.unique_key}`,
      source: "nyc311",
      title: r.descriptor ? `${r.complaint_type} — ${r.descriptor}` : r.complaint_type,
      category,
      severity: "LOW",
      status: r.status === "Closed" ? "RESOLVED" : "ACTIVE",
      latitude,
      longitude,
      address: r.incident_address ?? undefined,
      createdAt,
    });
  }
  return records;
}

export async function fetch311Records(get: HttpGet = defaultGet, now = new Date()): Promise<IngestRecord[]> {
  const since = new Date(now.getTime() - WINDOW_HOURS * 3_600_000);
  const sinceNy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "medium" })
    .format(since).replace(" ", "T");
  const types = Object.keys(ALLOWED_311).map((t) => `'${t}'`).join(",");
  const rows = await get(URL_311, {
    $where: `created_date > '${sinceNy}' AND complaint_type in(${types})`,
    $order: "created_date DESC",
    $limit: ROW_LIMIT,
  });
  return parse311(Array.isArray(rows) ? rows : []);
}
