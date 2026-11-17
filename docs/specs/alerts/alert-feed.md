---
type: feature
---
# A user can catch up on the alerts that reached them

## Why
An alert that arrives while the app is closed is, today, gone. A user who was
away from their phone needs one screen that answers "what did I miss, and
when" — the bell in the bottom nav leads there.

## Where it lives
- `apps/web/app/alerts/page.tsx` — the route, its identity check, and the
  first page of rows
- `apps/web/app/alerts/alerts-panel.tsx` — the window switch and "show more",
  which read `GET /api/v1/alerts`
- `apps/web/app/alerts/alerts-feed.tsx` — the row card
- `apps/web/app/alerts/relative-time.ts` — `relativeTime`, pure
- `apps/web/app/alerts/relative-time-label.tsx` — the client component that
  keeps each row's "8m ago" current
- `apps/web/app/alerts/alert-type-icon.tsx` — one glyph per emergency type
- `packages/domain/src/queries/alerts.ts` — `listAlertFeed`, the user-scoped
  query, and the `AlertFeedItem` shape it returns
- `packages/domain/src/zod_schemas/alerts.ts` — `alertFeedQuerySchema`, which
  validates the window, the page size and the cursor
- `apps/web/app/api/v1/alerts/route.ts` — `GET`, serving the same list over
  HTTP; its `POST` is [trigger-sos](trigger-sos.md)
- `apps/web/app/globals.css` — the `--color-alert-*` severity tokens
- `apps/web/components/bottom-nav.tsx` — the bell that links here

## Behavior
- `/alerts` renders the alerts that reached the current user, newest first.
- An alert reached a user when an `AlertLog` row exists with that user's id.
  The feed reads those rows and the `Alert` each belongs to. A log addressed
  to an emergency contact rather than to a user — every log
  [trigger-sos](trigger-sos.md) writes — is not in anyone's feed.
- Rows are ordered by `AlertLog.sentAt`, newest first, and that is also the
  time the row displays. `receivedAt` is delivery tracking, is often null, and
  is not what the feed shows.
- A row's emergency type is its alert's incident category. An alert with no
  incident behind it shows as `SOS` when it went to emergency contacts and
  `OTHER` otherwise.
- An alert the user has not marked read carries an unread dot. Reading is
  `AlertLog.readAt`; the dot is gone once it is set.
- A dismissed alert leaves the feed. Dismissing is `AlertLog.dismissedAt`, a
  separate column from `readAt`, because a read alert stays and a dismissed
  one does not.
- Dismissing an alert also marks it read: it cannot be cleared without having
  been seen, and leaving it unread would keep it counted as missed.
- Both are one-way. Nothing on this screen un-reads or restores an alert.
- The acting user comes from the identity seam (see [auth](../auth.md)). A
  visitor with no session, or one whose session has expired, is redirected to
  `/` where signing in happens — the screen is never served signed-out, and no
  user id is read from the URL or the client.
- The screen is `force-dynamic`: it is never served from a cached render.
- A time window narrows the list. Two windows exist: **24 hours** (the
  default) and **7 days**. An alert appears only when its `sentAt` is at or
  after the window's cutoff.
- **The window and the page size are applied in the query, never in the
  browser.** A user's whole history is never sent to the client for the client
  to hide most of it.
- At most **5** alerts are fetched and rendered at once. When more exist in
  the window, a button offers the next 5 and appends them in place; it
  disappears once the window is exhausted.
- Paging is by cursor, not by offset: the next page is "the rows older than
  this one". An alert arriving between two pages therefore cannot shift the
  boundary and cause a row to be served twice or skipped.
- Switching windows starts the list again from the newest row, so a cursor is
  never carried across a differently sized list.
- A window holding no alerts says so in words naming that window, rather than
  rendering an empty list.
- Each row shows: a glyph for its emergency type, the title, the type as a
  pill, the body in full, and how long ago it arrived. Underscores in a type
  read as spaces (`SEVERE_WEATHER` → `SEVERE WEATHER`).
- Arrival time is relative: under a minute is `just now`, then `Nm ago`,
  `Nh ago`, and `Nd ago` past 24 hours. The row also carries the exact
  timestamp in a machine-readable `datetime`.
- Severity is carried by color — a badge filled with that severity's hue,
  a card border in the same hue, and a soft glow beneath the card — and, because the pill is spent on the type, also by text
  only a screen reader reads.
- A row carries two controls: **Mark read**, shown only while the alert is
  unread, and **Dismiss**. Each names its alert to a screen reader, because
  "Dismiss" repeated down a list says nothing about which alert it clears.
- Nothing else on a row is interactive, and the row itself is not a target.

### `GET /api/v1/alerts`

- Serves the same rows as the screen, scoped the same way, for the same
  current user. The screen's own "show more" reads it, so there is one code
  path and not two.
- Query parameters: `window` (`24h` or `7d`, default `24h`), `limit` (1–50,
  default 5) and `cursor` (an `AlertLog` id). An unknown or malformed value is
  a `400`, never a silent clamp to the default.
- Returns `200` with `{ alerts: AlertFeedItem[], nextCursor: string | null }`.
  `nextCursor` is null when the window holds nothing older.
- A cursor that is not the caller's own row, or does not exist, returns `404`
  — the same rule as [contact-management](../contact-management.md), and never
  a `403`, which would confirm the row exists.

### `PATCH /api/v1/alerts/:id`

- The id is an `AlertLog` id — the row addressed to this user, not the `Alert`
  itself, which may have reached many people.
- Body is `{ read?: true }`, `{ dismissed?: true }` or both. `false` is a
  `400`: there is no screen for undoing either, and accepting it would imply
  there is. A body asking for nothing is also a `400`.
- Returns `204` with no body. An id that is not the caller's own, or does not
  exist, returns `404`.
- No session returns `401`. Every error carries the one shape,
  `{ error: { code, message } }` ([web](../web.md)), and no Prisma error or
  stack trace reaches a client.

## Examples

| State / input | Behavior |
|---|---|
| No session | Redirected to `/`; a cookieless request answers `307` |
| Default window, 5 alerts within 24h | 5 rows, newest first, no paging button |
| Default window, 9 alerts within 24h | 5 rows and a button offering 4 more |
| That button is pressed | The remaining 4 append; the button disappears |
| Switch to 7 days with 9 alerts shown | List re-filters and returns to 5 rows |
| No alerts in the last 24 hours | "No alerts in the last 24 hours." |
| Alert arrived 8 minutes ago | `8m ago` |
| Alert arrived 3 hours ago | `3h ago` |
| Alert arrived 2 days ago, 7-day window | `2d ago` |
| Alert arrived 9 days ago, 7-day window | Not shown |
| Alert of type `TRAFFIC_HAZARD` | Pill reads `TRAFFIC HAZARD`, cone glyph |
| Another user's alert log | Never appears, in the screen or the API |
| An SOS the user triggered | Not in their own feed — its logs belong to their contacts |
| `GET /api/v1/alerts`, no session | `401` with `{ error: { code, message } }` |
| `GET /api/v1/alerts?window=30d` | `400`; the window is not clamped to a default |
| `GET /api/v1/alerts?limit=5`, 9 alerts in window | 5 rows and a `nextCursor` |
| That cursor passed back | The remaining 4 and `nextCursor: null` |
| A cursor belonging to another user | `404`, never `403` |
| An alert not yet marked read | Unread dot, and a Mark read control |
| `PATCH` `{ read: true }` on own alert | `204`; the row stays, the dot goes |
| `PATCH` `{ dismissed: true }` on own alert | `204`; the row leaves the feed and is marked read |
| `PATCH` `{ read: false }` | `400` — reading is one-way |
| `PATCH` on another user's alert | `404`, and nothing changes |

## Verify
- `pnpm typecheck` and `pnpm test` pass.
- **Ownership test.** Seed two users, each with alert logs, and assert the
  feed and the API return only the caller's rows. Delete the `userId` filter
  from the query and the test must fail — if it still passes, it is not
  testing ownership.
- **Window test.** Seed a log older than the window and assert it is absent,
  and one inside it and assert it is present.
- **Cursor test.** With 9 rows in the window, two pages return 5 then 4 with
  no row repeated, and the second page's `nextCursor` is null.
- **State tests.** `read` sets `readAt` and leaves `dismissedAt` null;
  `dismissed` sets both; another user's id returns `404` and changes neither
  column. `tests/integration/alert-feed.test.ts` and `alert-state.test.ts`.
- **Seeded feed.** `pnpm db:seed` gives every user nine alerts — five inside
  24 hours, three more inside 7 days, one outside both — so the window drill
  and the paging drill both have something to prove.
- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/v1/alerts` with
  no session cookie returns `401`.
- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/alerts` with no
  session cookie returns `307`, with `pnpm dev` running.
- `grep -rE '\[#[0-9a-fA-F]{3,8}\]' apps/web/app apps/web/components` returns
  nothing — the severity colors are tokens, not literals
  ([design-system](../design-system.md)).
- **Keyboard pass.** Tab through `/alerts` from the top: the window switch's
  two buttons, the paging button, then the nav. Every stop shows a visible
  outline, and the rows themselves take no focus because nothing on them acts.
- **Window drill.** With the 24-hour window selected, switch to 7 days and
  back: the list grows and shrinks, and paging returns to 5 each time.
- **Clock drill.** Load `/alerts` and watch the console through hydration:
  no mismatch warning. Leave the page open past a minute boundary and the
  newest row's label advances on its own without a reload.

## Constraints & decisions
- **Ownership is a query filter, not a check.** Every read is scoped by the
  current user's id taken from the identity seam; no id arrives from the URL,
  the body or the client. A cursor is matched on both its id and that user id,
  so a foreign one matches zero rows and becomes a `404` rather than leaking
  that it exists.
- **The relative label is rendered twice from one instant, then corrected.**
  `page.tsx` takes a single `new Date()` and passes it to the window filter
  and to every row. Because the label is a pure function of the row's
  timestamp and that instant, the server's HTML and React's first client
  render are computed from identical inputs and cannot disagree — the
  hydration mismatch that a live `Date()` on each side would produce never
  arises, and no `suppressHydrationWarning` is needed. `RelativeTime` then
  recomputes against the browser's clock on mount and every 30 seconds, which
  is what the server instant alone cannot do: a page left open overnight would
  otherwise still claim every alert arrived minutes ago. A visitor without
  JavaScript keeps the label as rendered.
- **Paging is keyset, and that is a new pattern here.**
  [nearby-and-detail](../incidents/nearby-and-detail.md) has no pagination at
  all, so this is a decision rather than a default. Offset paging was rejected
  because this list is ordered by arrival and grows at the end a reader starts
  from: an alert arriving between two requests shifts every offset by one and
  the reader silently loses a row. A cursor names a position in the data, so
  it cannot drift.
- **Dismissing is its own column, not a second meaning for `readAt`.** Two
  states exist because they answer different questions — "have I seen this"
  and "do I still want it on screen" — and collapsing them would make a read
  alert disappear. The migration adds `dismissedAt` and the index
  `[userId, dismissedAt]`, which is the shape of the feed's own query.
- **An SOS does not appear in the sender's own feed.** The logs
  [trigger-sos](trigger-sos.md) writes carry `emergencyContactId`, never
  `userId`, so nothing addresses the person who pressed the button. Changing
  that is a change to that spec's behavior, not this one's, and until it
  happens the feed of a user who has only ever sent SOS alerts is empty.
- **The first screen is rendered on the server; later pages are fetched.**
  `page.tsx` runs the query directly for the first 5 rows, so the feed is
  complete in the HTML with no loading state and no request from the client.
  The window switch and "show more" then call `GET /api/v1/alerts`, which is
  why both the screen and the API read one query rather than two.
- **Severity uses four `--color-alert-*` tokens**, which is the one standing
  exception to the single-hue palette, named in
  [design-system](../design-system.md). The hues are used for the badge fill,
  the card's border and its glow — never for text, so a pale color never has to pass a contrast bar
  it would fail. Severity is additionally exposed as screen-reader-only text,
  because the pill carries the type instead.
- **Body text is never truncated.** Clamping would compact the rows, but with
  no alert detail view there would be no way to read the rest, and a safety
  alert that is half-readable is worse than a longer row.
- **The two windows are fixed** at one day and seven days. A custom range is a
  change to this spec.

## Out of scope
- The short "Your alerts" strip on the home page, which reuses this feed's row
  — no spec yet.
- Un-reading or restoring a dismissed alert. Both state changes are one-way
  and there is no screen for reversing either.
- A count of unread alerts anywhere outside this screen — the bell in the nav
  carries no badge.
- Writing an `AlertLog` for the user who triggers an SOS, which would put
  their own SOS in their feed — [trigger-sos](trigger-sos.md) owns that.
- Delivering alerts over SMS, push or in-app. Raising one is
  [trigger-sos](trigger-sos.md); moving a delivery log past `PENDING` is worker
  behavior with no spec yet.
- An alert detail view.
- Deriving an alert's title and body from CAD codes rather than storing them
  as written — no spec yet.
- The `/incidents` route the nav's Feed tab points at, which does not exist.
