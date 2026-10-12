---
type: feature
---
# A user can see the incidents near them and open one for its details

## Why
The live map shows a user what is happening around them, and tapping a pin
or a push notification opens the full story of that one incident. Both need
the server to answer "what is near this point" and "what is this incident".

## Where it lives
- `apps/web/app/api/v1/incidents/nearby/route.ts`
- `apps/web/app/api/v1/incidents/[id]/route.ts`
- `packages/domain/src/queries/incidents.ts` (`listNearbyIncidents`, `getIncidentById`)
- `packages/domain/src/zod_schemas/incidents.ts` (`ListNearbyIncidentsSchema`, `GetIncidentByIdSchema`)
- `packages/redis/src/geo.ts` (`getIncidentIdsInRadius`)
- `packages/db/prisma/schema/incident.prisma` (`Incident`, `IncidentUpdate`)

## Behavior
Both routes derive the acting user via the identity seam (see
[auth](../auth.md)) and answer only when one is established. Errors always
have the shape `{ error: { code, message } }`.

**Nearby — `GET /api/v1/incidents/nearby`**
- The query string is validated with `ListNearbyIncidentsSchema`. Values
  arrive as strings and are coerced to numbers.
  - `latitude` (−90 to 90) and `longitude` (−180 to 180) are required.
  - `radiusInMiles` is optional, greater than 0, at most 50, default 10.
  - `limit` is optional, a positive whole number, at most 100, default 20.
- Redis returns the ids of indexed incidents inside the radius, nearest
  first. The radius is converted from miles to meters for the search.
- The first `limit` ids are loaded from Postgres, keeping only incidents
  whose status is `ACTIVE` or `INVESTIGATING`.
- Success returns `200` with a list of pins in nearest-first order. Each pin
  has `id`, `title`, `category`, `severity`, `latitude`, `longitude` and
  `createdAt`, and nothing else.
- When nothing is in range the response is `200` with an empty list.

**Detail — `GET /api/v1/incidents/[id]`**
- The id is validated with `GetIncidentByIdSchema` and must be a cuid.
- Success returns `200` with the incident, its timeline `updates` and its
  `alerts`.
- A well-formed id that matches no incident returns `404` with code
  `NOT_FOUND`.

**Both**
- Validation failures return `400` with code `VALIDATION_ERROR`, before
  Redis or Postgres is touched.
- Unknown or invalid auth state returns `401`.
- Anything unexpected returns `500` with code `INTERNAL_ERROR` and a generic
  message. Raw errors are logged on the server and never reach the client.

## Examples

| State / input | Behavior |
|---|---|
| Two active incidents in range; `?latitude=40.71&longitude=-74.00` | 200; two pins, nearest first |
| An in-range incident is `RESOLVED` | It is left out of the list |
| No incidents in range | 200 with `[]` |
| `radiusInMiles` and `limit` omitted | Searches 10 miles, returns at most 20 |
| `?longitude=-74.00` (no latitude) | 400 `VALIDATION_ERROR`; no search runs |
| `radiusInMiles=51` | 400 `VALIDATION_ERROR` |
| Redis is unreachable | 500 `INTERNAL_ERROR` |
| `/incidents/<id of an existing incident>` | 200; the incident with `updates` and `alerts` |
| `/incidents/<well-formed id, no such incident>` | 404 `NOT_FOUND` |
| `/incidents/not-a-cuid` | 400 `VALIDATION_ERROR` |

## Verify
- Run `pnpm vitest run tests/integration/incident-routes.test.ts` for the
  routes and `pnpm test` for the schema rules.
- Manual check with `pnpm dev` running:
  - `curl "localhost:3000/api/v1/incidents/nearby?latitude=40.71&longitude=-74.00"`
    returns `200` and a list.
  - `curl "localhost:3000/api/v1/incidents/nearby?longitude=-74.00"` returns
    `400` `VALIDATION_ERROR`.
  - `curl localhost:3000/api/v1/incidents/cjld2cjxh0000qzrmn831i7rn` returns
    `404` `NOT_FOUND`.

## Constraints & decisions
- Incidents are public safety data with no owning user, so these queries are
  not scoped by the current user: every signed-in user sees the same
  incidents for the same area. The user is still required, so the routes are
  not open to the internet.
- Redis answers "which ids are in range" and Postgres is the source of truth
  for everything else. An id that Redis returns but Postgres no longer has,
  or that is no longer active, is dropped.
- `limit` is applied to the Redis result before the status filter, so a
  response can hold fewer than `limit` pins even when more active incidents
  are in range.
- An incident appears in nearby results only once it is in the Redis index.
  A missing or stale index hides incidents; it never exposes extra ones.
- The pin shape is deliberately small. The description, address, updates
  and alerts are served by the detail route only.
- The order of `updates` and `alerts` in the detail response is not
  guaranteed.
- No pagination: a client that needs more widens `limit` up to 100.

## Out of scope
- Creating incidents, appending updates and changing status. The schemas
  exist (`CreateIncidentSchema`, `AppendIncidentUpdateSchema`,
  `UpdateIncidentStatusSchema`) but no route uses them yet; no spec yet.
- Writing incidents into the Redis index and removing resolved ones — worker
  behavior, no spec yet.
- The city-wide active incident feed on the home page
  (`listActiveIncidents`) — no spec yet.
- Sending alerts for an incident — see [trigger-sos](../alerts/trigger-sos.md)
  for user-triggered alerts; incident-driven alerts have no spec yet.
