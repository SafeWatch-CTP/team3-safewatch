// Polling loop for public feeds: docs/specs/incidents/public-feed-ingestion.md
import { log } from "@project/log";
import { upsertIncident, resolveMissing } from "../incidents";
import { fetchNwsRecords } from "./nws";
import { fetch311Records } from "./nyc311";
import type { IngestRecord } from "./types";

export const INGEST_INTERVAL_MS = 5 * 60_000;

async function save(records: IngestRecord[]) {
  let created = 0;
  for (const rec of records) {
    try {
      if ((await upsertIncident(rec)) === "created") created++;
    } catch (err) {
      log.error({ err: String(err), externalId: rec.externalId }, "ingest: record failed to save — skipped");
    }
  }
  return created;
}

export interface IngestSources {
  nws: () => Promise<IngestRecord[]>;
  nyc311: () => Promise<IngestRecord[]>;
}

export async function runIngestRound(sources: IngestSources = { nws: fetchNwsRecords, nyc311: fetch311Records }) {
  try {
    const records = await sources.nws();
    const created = await save(records);
    const resolved = await resolveMissing("nws", records.map((r) => r.externalId));
    log.info({ source: "nws", fetched: records.length, created, resolved }, "ingest round done");
  } catch (err) {
    log.error({ err: String(err), source: "nws" }, "ingest round failed — will retry");
  }
  try {
    const records = await sources.nyc311();
    const created = await save(records);
    log.info({ source: "nyc311", fetched: records.length, created }, "ingest round done");
  } catch (err) {
    log.error({ err: String(err), source: "nyc311" }, "ingest round failed — will retry");
  }
}

export function startIngestLoop() {
  const tick = async () => {
    await runIngestRound();
    setTimeout(tick, INGEST_INTERVAL_MS);
  };
  void tick();
}
