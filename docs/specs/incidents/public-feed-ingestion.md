---
type: feature
---
# New York public alerts and 311 reports are ingested into incidents automatically, so the Feed tab fills without manual entry

## Why
The Feed tab ([incident-feed.md](incident-feed.md)) only shows what is in the
`Incident` table. Pulling open public data for New York City into that table
keeps the feed populated with real, current events — weather warnings and
safety-relevant city reports — before live dispatch audio is available.

## Where it lives
- `apps/worker/src/ingest/nws.ts`: fetches National Weather Service alerts for
  New York City and turns each into an incident record.
- `apps/worker/src/ingest/nyc311.ts`: fetches recent NYC 311 service requests
  and turns the safety-relevant ones into incident records.
- `apps/worker/src/ingest/run.ts`: the polling loop that runs both sources and
  saves their records.
- `apps/worker/src/incidents.ts`: `upsertIncident`, the single write path that
  saves a record and indexes its coordinates.
- `apps/worker/src/index.ts`: starts the polling loop alongside the job queue.
- `Incident.externalId` (unique) and `Incident.source` in the Prisma schema
  carry the de-duplication key; no schema change.

## Behavior
**Polling.** The worker runs both sources every 5 minutes. A source that fails
(network error, non-200, unparseable body) is logged and skipped for that
round; the other source and the next round are unaffected. No error reaches
the web app.

**NWS alerts** (`source = "nws"`).
- Requests all active alerts for New York State (`area=NY`) with a descriptive
  `User-Agent`, as the service requires.
- `externalId` is `nws:<alert id>`; `title` is the alert's event name
  (for example "Flood Warning"); `description` is its headline; `category` is
  `SEVERE_WEATHER`.
- Severity maps from the alert's severity: Extreme → `CRITICAL`,
  Severe → `HIGH`, Moderate → `MEDIUM`, anything else → `LOW`.
- Coordinates are the centre of the alert's bounding box: its own polygon when
  it has one, otherwise the union of its affected zones (each zone's geometry is
  fetched once and kept for the life of the worker). An alert whose location
  cannot be determined is skipped.
- An alert that has expired or been cancelled by the next poll is set to
  `RESOLVED`.

**NYC 311** (`source = "nyc311"`).
- Requests service requests created in the last 72 hours, newest first, up to
  500 per round.
- Only these complaint types are ingested, each with a fixed category; every
  other type is ignored because it is not a safety event:

  | Complaint type | Category |
  |---|---|
  | Non-Emergency Police Matter | `CRIME` |
  | SAFETY | `OTHER` |
  | Traffic Signal Condition | `TRAFFIC_HAZARD` |
  | Damaged Tree | `TRAFFIC_HAZARD` |

- `externalId` is `nyc311:<unique_key>`; `title` is the complaint type and
  descriptor; `address` is the incident address when present; severity is
  always `LOW`.
- A request without usable latitude and longitude is skipped.
- A request whose 311 status is "Closed" is saved as `RESOLVED`; every other
  status is `ACTIVE`.

**Saving.**
- Records are saved by `externalId`: a new one is created, an existing one has
  its status updated. Running the same round twice creates no duplicates.
- `createdAt` is the time the source reports for the event, not the time of
  ingestion, so the Feed's "x ago" label reflects the real event. 311 times
  are read as New York local time whatever the worker's own time zone. 311 data
  arrives with a delay of up to about a day, so those cards read as hours old.
- Each created incident's coordinates are indexed for the map, exactly as for
  any other incident. If indexing fails the incident is still saved and the
  failure is logged.
- One record failing to save is logged and skipped; the rest of the round
  still saves.

## Examples
| State / input | Behavior |
|---|---|
| NWS returns a Severe "Flood Warning" for Sullivan County | One `SEVERE_WEATHER` / `HIGH` incident, pinned in Sullivan County, appears in the Feed |
| The same alert on the next poll | No second incident; row unchanged |
| An alert from an earlier poll is no longer active | Its incident becomes `RESOLVED` and leaves the Feed |
| An NWS alert with no polygon and no resolvable zones | Skipped |
| 311 request "Noise - Residential" | Ignored |
| 311 request "Traffic Signal Condition" with coordinates | A `TRAFFIC_HAZARD` / `LOW` incident, `createdAt` = the 311 creation time |
| 311 request of an allowed type without coordinates | Skipped |
| The 311 service times out | Logged; NWS still ingests; next round retries |
| 311 returns exactly 500 rows | Only those 500 are processed; older ones are picked up only if still within 72 hours of a later round |

## Verify
- `pnpm vitest run tests/integration/public-feed-ingestion.test.ts` covers
  the parsing, mapping, de-duplication and failure cases against fixture
  responses (no network).
- Manual: `pnpm dev`, wait one round, open `/incident_feed` and confirm cards
  with `source` `nyc311` (check with `pnpm prisma studio` or the incident
  detail page) appear; restart the worker and confirm the count does not grow.

## Constraints & decisions
- Both sources are free and need no API key. NYC's fire and police dispatch
  datasets are updated too rarely to be a live feed, so they are not used.
- 311 is an allow-list, not a block-list: most 311 traffic is noise, parking
  and similar, and would bury real events in a 50-item feed.
- Every 311 incident is `LOW`: these are citizen reports, not verified
  emergencies, and `verifiedAt` stays empty.
- Polling rather than push: neither source offers push. 5 minutes stays well
  under both services' rate limits.
- NWS is queried for the whole state, so alerts far from New York City (for
  example the Adirondacks) appear in the Feed; the Feed has no region filter
  yet. NWS alerts are zone-based and rarely carry a polygon, so the pin is the
  middle of the affected area, not a precise point.

## Out of scope
- Live dispatch audio (`apps/worker/src/scanner.ts`): not built yet.
- Other cities or sources: only New York City.
- Reverse-geocoding NWS alerts that have no address.
- Filtering the feed by source: the Feed filters by category only, see
  [incident-feed.md](incident-feed.md).
