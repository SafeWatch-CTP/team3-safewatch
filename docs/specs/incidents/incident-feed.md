---
type: feature
---
# A user can browse recent incidents in the Feed tab, filter them by category, and open one for its details

## Why
The home page is a map-first dashboard sorted by severity. A user who wants
to know "what just happened" needs a plain list, newest first, that they can
narrow to the kind of event they care about (fire, medical, crime) and open
for the full story, without reading raw dispatch data.

## Where it lives
- `apps/web/app/incident_feed/page.tsx`: the Feed tab (`/incident_feed`); reads the
  `category` query parameter and lays out the header, filter and list.
- `apps/web/app/incident_feed/incident-feed-list.tsx`: reads the incidents and
  renders the cards and the empty states.
- `apps/web/app/incident_feed/category-filter.tsx`: the category links.
- `apps/web/app/incident_feed/feed-refresh.tsx`: the 60-second refresh and the
  "Refresh" button.
- `apps/web/app/incident_feed/relative-time.ts`, `relative-time-label.tsx`: the
  relative-time wording and the self-updating label.
- `apps/web/app/incident_feed/labels.ts`: the display words for categories,
  severities and statuses.
- `apps/web/app/incident_feed/[id]/page.tsx`: the incident detail view.
- `apps/web/components/bottom-nav.tsx`: the Feed tab link, marked current on
  `/incident_feed` and on every page under it.
- `packages/domain/src/queries/incidents.ts`: `listRecentIncidents` and
  `getIncidentDetail`.
- `packages/domain/src/zod_schemas/incidents.ts`: `ListRecentIncidentsSchema`
  (the existing `GetIncidentByIdSchema` validates the detail id).

## Behavior
Both pages derive the acting user via the identity seam (see
[auth](../auth.md)). A signed-out visitor, or a session that has expired, is
sent to the landing page.

**Feed — `/incident_feed`**
- Lists incidents whose status is `ACTIVE` or `INVESTIGATING`, newest first
  by `createdAt`, at most 50. Severity does not affect the order.
- Uses the same frosted blue panel, rounded surfaces, and accent gradients as
  the Contacts screen. Category filters and refresh controls use the shared
  accent palette; incident cards remain translucent neutral surfaces with
  severity shown as a word.
- Each card shows the title, category, severity (as a word, not only a
  color), address (or "Location unavailable") and the time as a relative
  label: "Just now", "5 mins ago", "2 hrs ago", "3 days ago" ("1 min ago",
  "1 hr ago", "1 day ago" for one). The exact time is the `<time>` element's
  `dateTime` and its tooltip. The whole card is a link to the detail view,
  and carries the selected category so the detail's back link can restore it.
- The labels are recomputed every 30 seconds without a request.
- **Filter.** A row of links — All, Crime, Fire, Medical, Severe weather,
  Traffic hazard, Civil unrest, Other, Uncategorized — selects one category
  at a time. The choice is the `category` query parameter
  (`/incident_feed?category=FIRE`), so a filtered feed can be linked and survives
  a reload. The current choice carries `aria-current="true"`.
- The `category` value is validated with `ListRecentIncidentsSchema` against
  the `IncidentCategory` enum. An unknown value is ignored and the unfiltered
  feed is shown; it is not an error page.
- **Refresh.** The list re-reads every 60 seconds while the browser tab is
  visible, and the "Refresh" button re-reads on demand. A refresh keeps the
  selected category and does not replace the list with a spinner; the button
  is disabled while a refresh is in flight.
- **Empty.** With no incidents at all: "No active incidents right now" and a
  "Check again" button. With a category selected and none matching: "No
  <category> incidents right now" and a "Show all" link.
- **Loading and error.** The list streams in behind a skeleton the size of a
  few cards. If the read fails, only the list region is replaced by the retry
  card "Couldn't load the incident feed" with "Try again"; the header, filter
  and bottom nav stay usable (see [web](../web.md), async honesty).

**Detail — `/incident_feed/[id]`**
- Shows the title, category, severity, status, address, description, created
  time, and the incident's updates as a timeline, oldest first.
- Any status can be opened by id, so a link to an incident that has since
  resolved still works and shows its status.
- A back link returns to the feed with the previous category still selected.
- An id that is not a well-formed cuid, or matches no incident, shows the
  not-found page (404, never 403).
- The incident's alerts are not read and never reach the browser.

## Examples

| State / input | Behavior |
|---|---|
| Three active incidents created 2 min, 40 min and 3 hr ago | `/incident_feed` lists them in that order, labelled "2 mins ago", "40 mins ago", "3 hrs ago" |
| A CRITICAL incident from yesterday and a LOW incident from a minute ago | The LOW one is listed first (newest wins, not severity) |
| `?category=FIRE`, one FIRE and two MEDICAL incidents | Only the FIRE card; "Fire" is `aria-current` |
| `?category=FIRE`, no FIRE incidents | "No Fire incidents right now" and a "Show all" link |
| `?category=BANANA` | The unfiltered feed; "All" is current |
| An incident is `RESOLVED` | It is not in the feed |
| 60 seconds pass and a new incident was created | It appears at the top without a page reload |
| Select a card | `/incident_feed/<id>` with its details and timeline |
| `/incident_feed/<well-formed id, no such incident>` | 404 page |
| `/incident_feed/not-a-cuid` | 404 page |
| `/incident_feed/<id of a RESOLVED incident>` | The detail view, status "RESOLVED" |
| Database stopped | "Couldn't load the incident feed" with "Try again"; header, filter and nav still work |
| Signed out | Redirected to `/` |

## Verify
- Run `pnpm vitest run tests/integration/incident-feed.test.ts
  tests/integration/incident-feed-ui.test.ts` for the queries (order,
  category filter, status filter, limit, detail without alerts), the
  relative-time wording and the category labels, and `pnpm test` for the
  schema rules.
- Manual check with `pnpm dev` running and some seeded incidents:
  - Open `/incident_feed` and confirm newest-first order and relative labels.
  - Click "Fire", reload the page, and confirm the filter persists in the URL.
  - Create an incident, wait up to 60 seconds without touching the page, and
    confirm it appears.
  - Stop the database and press "Refresh": only the list region shows the
    retry card.
  - Keyboard only: Tab reaches each filter link and each card, and Enter
    opens the detail view; every stop shows a visible outline.

## Constraints & decisions
- Incidents are public safety data with no owning user, so these queries are
  not scoped by the current user; every signed-in user sees the same feed.
  The user is still required, so the pages are not open to the internet.
- The feed is ordered by recency, unlike the home page list, which is
  severity first. They answer different questions ("what just happened" vs
  "what is worst right now"), so each has its own query.
- The category filter is a query parameter read on the server, not client
  state, so it works without JavaScript and cannot disagree with the URL.
- Auto-refresh is a 60-second poll, not a push channel. A live stream would
  need its own decision (see [ADR-0007](../../adr/0007-pg-notify-sse.md)).
- Auto-refresh pauses while the browser tab is hidden, so a background tab
  does not poll the database.
- The feed is not paginated; it shows the newest 50.
- "Police" in the issue's vocabulary is the `CRIME` category; the label is
  "Crime".
- Severity is shown as a word on a neutral or blue chip, never red: red means
  SOS only (see [design-system](../design-system.md)).
- The detail view omits alerts because they are per-user notification
  records, not incident content.
- The relative label is computed from the client clock and may differ from
  the server-rendered text at a boundary; hydration warnings are suppressed
  on that one element and nothing else.

## Out of scope
- Filtering by region. `Incident` has coordinates and a free-text address
  but no region field, so there is nothing to filter on yet; no spec yet.
  Radius search from the user's location is
  [nearby-and-detail](nearby-and-detail.md).
- Dispatch audio on the detail view: no audio is stored or played; no spec yet.
- User-submitted incident reports and community flagging; no spec yet.
- The map and the severity-ordered list on the home page — see
  [incident-map](incident-map.md).
- The JSON detail and nearby APIs — see
  [nearby-and-detail](nearby-and-detail.md).
