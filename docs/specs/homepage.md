---
type: feature
---
# Home dashboard

## Why
Authenticated users need a single operational view when they sign in. The home dashboard gives them a trusted overview of current safety conditions, reduces time to understand nearby events, and makes the most urgent reports immediately visible without needing to navigate through multiple screens.

## Where it lives
- apps/web/app/page.tsx — authenticated home route and dashboard entry point
- apps/web/components/incident-dashboard.tsx — interactive map and incident feed UI
- apps/web/lib/home-dashboard.ts — map-position and selection helpers used by the dashboard
- packages/domain/src/queries/incidents.ts — nearby-incident and active-feed data retrieval
- packages/auth/src/current-user.ts — current user identity source used to scope data

## Behavior
The home dashboard is the default authenticated landing page. When a user signs in, the app reads the current session identity from the auth layer and requests the incident data scoped to that user context.

- The dashboard renders a split layout with a map panel on the left and an incident feed on the right.
- The map displays active incident markers positioned by geographic coordinates and keeps them synchronized with the selected incident.
- The incident list presents the same incidents in a scan-friendly order, using severity and recency to prioritize the highest-risk reports first.
- Selecting an incident item from the list or a marker on the map updates the active selection, centers the map on the corresponding location, and highlights the incident summary in the detailed panel.
- If the user has no stored location in the live session context, the application safely falls back to the general active incident feed instead of failing the page.
- The interface supports keyboard interaction for both map pins and list items using standard focus and activation keys.
- The layout responds to viewport size changes and preserves readability on mobile and desktop screens.
- Dark mode styling is applied to maintain contrast and readability in low-light environments.

## Examples

| State / input | Behavior |
|---|---|
| Signed-in user with active nearby incidents | The home view loads a map and a populated incident list without an error state. |
| User clicks a list item | The map updates to the incident location and the selected incident becomes visually highlighted. |
| User presses Enter or Space on a map pin | The selected report changes to that incident without requiring a mouse. |
| User location is unavailable | The dashboard presents the general active incident feed instead of crashing or exposing a blank page. |
| Incident severity is CRITICAL or HIGH | The incident is prioritized higher in the feed and surfaced as a live alert in the header summary. |

## Verify
The feature is confirmed by the following checks:

1. Run the dashboard regression and integration checks with `pnpm vitest run tests/integration/home-dashboard.test.ts`.
2. Run the full project validation with `pnpm test && pnpm typecheck && pnpm build`.
3. In a browser, sign in and load the home route to confirm that the map and incident list render with populated data.
4. Click a list item and confirm the map focuses on the same incident; click a marker and confirm the list selection updates in sync.
5. Resize to mobile and desktop breakpoints and confirm the layout remains usable; test keyboard-only focus by tabbing between map markers and list items.

## Constraints & decisions
- The dashboard intentionally avoids a full GIS library; the map is a lightweight, coordinate-driven visualization adequate for the app’s current product stage.
- Incident data is read through the authenticated user session, not from raw client input, to preserve the repo’s rule that all resource access is scoped to the current user.
- The home route prioritizes safe fallback behavior over failure: if live-location lookup is unavailable, the app shows the broader incident feed instead of throwing.
- The dashboard is intentionally limited to read-only incident review; creation, editing, and deletion flows remain in separate specifications.

## Out of scope
- Creating new incident reports
- Editing or deleting incidents from the dashboard
- Real-time streaming updates beyond the existing live summary model
- Advanced map clustering, geofencing automation, or external map provider integrations
