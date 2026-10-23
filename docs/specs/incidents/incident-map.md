---
type: feature
---
# The home page plots every incident in the feed on a street map

## Why
The incident feed tells a user what is happening but not where. A map shows
at a glance which incidents are close together and which are near them. The
map adds to the list and does not replace it: everything the map shows is
also in the list as text, so a user who can't see the map or can't use a
pointer doesn't lose anything.

## Where it lives
- `apps/web/app/page.tsx`: places the map between the location picker and
  the feed, and gives each feed card an anchor id
- `apps/web/app/_components/incident-map-section.tsx`: server-rendered
  heading, summary, severity key and skip link
- `apps/web/app/_components/incident-map.tsx`: client boundary that loads
  the map only in the browser
- `apps/web/app/_components/incident-map-leaflet.tsx`: the react-leaflet map,
  pins, popups and keyboard handling
- `apps/web/app/_components/incident-map-model.ts`: pure helpers for the
  severity styles, pin names, labels and initial view
- `apps/web/app/globals.css`: pin, focus-ring and popup styles
- `packages/domain/src/queries/incidents.ts`: `listActiveIncidents` returns
  `latitude` and `longitude` on each item

## Behavior
**Data**
- The map shows exactly the incidents in the feed: the same
  `listActiveIncidents()` call, the same items, in the same order. Each item
  has `latitude` and `longitude`.
- The page sends the client only the fields the map uses: `id`, `title`,
  `severity`, `category`, `address`, `latitude` and `longitude`.

**Rendering**
- Leaflet needs a browser, so the map loads only on the client. While it
  loads, a box the same size as the map says "Loading map…". The heading,
  summary, severity key and skip link are rendered on the server and don't
  wait for the map.
- Tiles come from OpenStreetMap, and the map shows the OpenStreetMap
  attribution.
- Scrolling with the mouse wheel over the map scrolls the page; it doesn't
  zoom the map, so the page can't trap the scroll. Zoom uses the zoom
  buttons, `+`/`-` or a pinch.
- With one or more incidents, the first view fits all the pins with padding
  and zooms in no further than level 15. With none, it centers on New York
  City (40.7128, −74.006) at zoom 11, and the summary says there are no
  active incidents.
- If a map tile fails to load, a status message under the map says so and
  points the user to the list. The message area is on the page from the
  start, so screen readers announce the message when it appears.

**Pins**
- Each pin is a circle colored by severity, with the severity's first letter
  (C, H, M, L) printed in white. Because of the letter, severity doesn't
  depend on color alone. A visible key next to the map explains the colors
  and letters.
- Every pin color has at least 4.5:1 contrast with its white letter, and
  each pin has a white border so it stands out from the map tiles.
- Each pin is a button whose accessible name is
  "<Severity> severity: <title>", for example
  "Critical severity: Building fire". The letter is hidden from assistive
  technology so the name isn't read twice.
- Pins are added in feed order, so pressing Tab moves through the pins in
  the same order as the list.

**Popup**
- Activating a pin opens a popup with the title as a heading, the severity,
  the category in plain words ("Severe weather", not `SEVERE_WEATHER`), the
  address (or "Address unavailable"), and a "Show in list" link to that
  incident's feed card.
- When the popup opens, focus moves to its title. When the popup closes and
  focus was inside it (or nowhere), focus goes back to the pin that opened
  it.

**Keyboard**

| Key | Where focus is | What happens |
|---|---|---|
| Tab | before the map | Moves to "Skip map to incident list" (hidden until focused) |
| Enter | skip link | Moves focus to the feed and skips every pin |
| Tab | skip link | Moves to the map, which shows a focus ring |
| Arrow keys | map | Pan the map |
| `+` / `-` | map | Zoom in or out |
| Tab | map | Moves to each pin in feed order, then the zoom buttons and attribution |
| Enter or Space | pin | Opens the popup and moves focus to its title (Enter on an open pin closes it) |
| Tab / Shift+Tab | inside popup | Move between "Show in list" and "Close popup" |
| Escape | pin or inside popup | Closes the popup; focus goes back to the pin |
| Enter | "Show in list" | Moves focus to that incident's card in the feed |

Every focusable part of the map shows a visible focus ring. Leaflet's own
link styles and focus handling are not relied on for this.

## Examples

| State / input | Behavior |
|---|---|
| Three active incidents: CRITICAL, HIGH and LOW | Three pins in feed order: red "C", orange "H", blue "L"; the view fits all three |
| One active incident | One pin; the view zooms to level 15, not closer |
| No active incidents | Map centered on NYC at zoom 11; summary says no active incidents are shown |
| An incident is `RESOLVED` | It isn't in the feed, so it has no pin |
| Tab to a pin, press Space | Popup opens; screen reader says the title heading |
| Press Escape in the popup | Popup closes; focus is back on the same pin |
| Activate "Show in list" | The page scrolls to that card, and the card has focus |
| Tile server unreachable | Status message: tiles couldn't load and the list below has the same information |
| JavaScript still loading | "Loading map…" placeholder; heading, key and skip link are already there |

## Verify
- `pnpm vitest run tests/unit/incident-map-model.test.ts`: severity styles
  (distinct colors and letters, 4.5:1 contrast with white), pin names,
  category labels and initial view.
- `pnpm vitest run tests/integration/incident-list.test.ts`: feed order, and
  each item includes its coordinates.
- With `pnpm dev` running and incidents seeded, at `http://localhost:3000`:
  - **Keyboard only, mouse in a drawer:** walk the table above row by row.
    After every row, check where focus ended up.
  - **Screen reader (NVDA or VoiceOver):** Tab to a pin and confirm it's read
    as "Critical severity: <title>, button". Open it and confirm the title
    is read as a heading. Press Escape and confirm focus is back on the pin.
  - Narrow the window to about 400px: no horizontal scrolling, and the map
    still pans.
  - Block `tile.openstreetmap.org` in devtools (request blocking) and reload:
    the tile error message appears.

## Constraints & decisions
- The map uses `listActiveIncidents` (city-wide, at most 25 items, most
  severe first), not the nearby route. That way it works on a fresh clone
  without Upstash and always matches the list. Switching to
  `/api/v1/incidents/nearby` around the user's location is a behavior change
  to this spec.
- The list is the text alternative for the map. Information shown only on
  the map would break that, so popups show only data the feed card also
  has (its address, category and severity).
- OpenStreetMap's public tile server is for light use only, under the OSMF
  tile usage policy. The tile URL is one constant, and production traffic
  needs a tile provider that permits it.
- Leaflet is browser-only, so the map is loaded with `next/dynamic` and
  `ssr: false` inside a client component. A server component can't use
  `ssr: false` itself.
- Pins use `L.divIcon` with CSS rather than Leaflet's default image marker.
  This avoids the bundler's broken default icon path, and the pin's name can
  be text inside the button.
- Leaflet only handles Escape while the map container itself has focus, and
  doesn't handle Space on pins at all. The component adds both. It doesn't
  add any other keyboard behavior or ARIA that Leaflet's own markup already
  provides.
- Pin size is set in pixels because Leaflet positions icons in pixels.
  Text sizes use rem.

## Out of scope
- Showing the user's own location on the map: see
  [user-location](../location/user-location.md). No spec covers putting it
  on the map yet.
- Live pin updates (pg_notify/SSE): no spec yet. Pins reflect the page load.
- Clustering dense pins, and drawing a search radius: no spec yet.
- Reduced-motion and forced-colors tuning for map animations and pin
  colors: no spec yet.
- The feed cards themselves (layout, severity badge colors): no spec yet.
