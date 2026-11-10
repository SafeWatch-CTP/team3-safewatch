---
type: feature
---
# A user can catch up on the alerts that reached them

## Why
An alert that arrives while the app is closed is, today, gone. A user who was
away from their phone needs one screen that answers "what did I miss, and
when" — the bell in the bottom nav leads there.

## Where it lives
- `apps/web/app/alerts/page.tsx` — the route and its identity check
- `apps/web/app/alerts/alerts-panel.tsx` — window selection and paging
- `apps/web/app/alerts/alerts-feed.tsx` — the row card and `relativeTime`
- `apps/web/app/alerts/alert-type-icon.tsx` — one glyph per emergency type
- `apps/web/app/alerts/sample-alerts.ts` — the placeholder rows this screen
  reads until the user-scoped query exists
- `apps/web/app/globals.css` — the `--color-alert-*` severity tokens
- `apps/web/components/bottom-nav.tsx` — the bell that links here

## Behavior
- `/alerts` renders the alerts that reached the current user, newest first.
- The acting user comes from the identity seam (see [auth](../auth.md)). A
  visitor with no session, or one whose session has expired, is redirected to
  `/` where signing in happens — the screen is never served signed-out, and no
  user id is read from the URL or the client.
- The screen is `force-dynamic`: it is never served from a cached render.
- A time window narrows the list. Two windows exist: **24 hours** (the
  default) and **7 days**. An alert appears only when it arrived at or after
  the window's cutoff.
- At most **5** alerts are rendered at once. When the selected window holds
  more, a button offers the next 5 and appends them in place. The button
  states how many it will add and disappears once the window is exhausted.
- Switching windows re-filters the list and returns paging to the first 5, so
  a count is never carried across a differently sized list.
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
- Nothing on a row is interactive: the feed is read-only.

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

## Verify
- `pnpm typecheck` and `pnpm test` pass.
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

## Constraints & decisions
- **The rows are placeholder data.** `sample-alerts.ts` holds a fixed set; no
  database is read and no route is called. Every component is written against
  the `AlertFeedItem` type alone, so the user-scoped query replaces one import
  in `page.tsx` without touching the screen. Until then this spec describes a
  shell, and the ownership rule it will have to satisfy — a user sees only
  `AlertLog` rows whose `userId` is their own — is not yet enforced by code.
- **The clock is frozen.** Relative timestamps are rendered on the server and
  hydrated on the client; a clock that moves between the two renders different
  text in each, which React reports as a hydration mismatch. Placeholder data
  stands still to avoid it. A real feed cannot, and will need the row's own
  timestamp to settle it.
- **Windowing and paging happen in the browser**, over an array already sent
  to the client. That is honest for a fixed set and wrong for a real feed,
  which pages server-side. [nearby-and-detail](../incidents/nearby-and-detail.md)
  deliberately has no pagination at all, so a cursor here is a new pattern and
  a decision, not a default.
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
- `GET /api/v1/alerts` and the user-scoped query behind it — no spec yet; this
  screen reads placeholder rows until one exists.
- The short "Your alerts" strip on the home page, which reuses this feed's row
  — no spec yet.
- Marking an alert read or dismissing one. `AlertLog.readAt` exists and is
  never written.
- Delivering alerts over SMS, push or in-app. Raising one is
  [trigger-sos](trigger-sos.md); moving a delivery log past `PENDING` is worker
  behavior with no spec yet.
- An alert detail view.
- Deriving an alert's title and body from CAD codes rather than storing them
  as written — no spec yet.
- The `/incidents` route the nav's Feed tab points at, which does not exist.
