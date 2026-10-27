---
type: feature
---
# A user can share their location from the device or by entering coordinates

## Why
The map, the SOS alert, and the nearby-incident search all need to know where
the user is. The device's location is the fastest source, but permission can
be denied, the request can time out, or the device may have no GPS. A user in
any of those situations can still type in their coordinates and use the app.

## Where it lives
- `apps/web/app/api/v1/location/route.ts` (`PUT`)
- `apps/web/app/_components/location-picker.tsx` (client component)
- `apps/web/app/_components/location-request.ts` (`putLocation`, the save
  request with its timeout)
- `apps/web/app/_components/device-location.ts` (`getDeviceLocation`, the
  browser Geolocation wrapper reused by the SOS button and the map)
- `packages/domain/src/zod_schemas/location.ts` (`updateLocationSchema`)
- `packages/domain/src/queries/location.ts` (`saveUserLocation`)
- `packages/redis/src/geo.ts` (`updateUserLocation`)

## Behavior
- The browser asks for location only after the user clicks "Use my
  location". Nothing asks on page load.
- The device request uses a 10-second timeout. Permission denied, timeout,
  position unavailable, and an unsupported browser all show the manual form,
  with one line saying why.
- While the device lookup is running, "Enter coordinates instead" switches
  to the manual form. The timeout only starts once the user answers the
  browser's permission prompt, so without this a user who ignores the prompt
  would wait forever. A lookup that finishes after the user switched is
  ignored.
- The manual form has two fields, latitude and longitude. It is a native
  `<form>`: every control is reachable and usable by keyboard, Enter submits,
  and each field has a visible label.
- `PUT /api/v1/location` saves the current user's location. The server
  derives the user via the identity seam (see [auth](../auth.md)); the body
  never contains a user id.
- The payload is validated with `updateLocationSchema`: `latitude` is a number
  from −90 to 90 and `longitude` is a number from −180 to 180, both inclusive
  and both required. Strings are not coerced; the form converts its inputs to
  numbers before sending.
- The manual form validates with the same schema before sending. The server
  validates again and is the authority.
- A valid request replaces the user's previous location (one location per
  user) and returns `200` with `{ latitude, longitude }`.
- Validation failures and malformed JSON return `400` `VALIDATION_ERROR`
  with `{ error: { code, message } }`, and nothing is written.
- The location is stored under the authenticated session user's id. The
  client cannot choose the user id; signed-out calls return `401`.
- The store is Upstash Redis (see
  [ADR-0012](../../adr/0012-upstash-redis-cloud-dependency.md)). If Upstash is
  unreachable or unconfigured, the route returns `500` `INTERNAL_ERROR`. Raw
  store errors never reach the client.
- After a save, the component shows the source in use: "Using your device
  location" or "Using the location you entered". The user can switch to the
  other source at any time.
- The component shows the server's `error.message` when a save fails. A
  network failure (no response at all) shows "Couldn't reach the server" and
  lets the user retry. No state leaves the user stuck without a way forward.
- A save that gets no answer within 10 seconds is abandoned and shows "The
  server took too long to answer". Saving never lasts forever.
- Entered coordinates stay in the form while they save and after a save
  fails. The submit button reads "Saving…" and is disabled while the save is
  in flight; after a failure the user fixes or resubmits the same values
  without retyping. A failed device save offers a "Retry" button instead.
- One click, one save: a second click or Enter press while a save is in
  flight sends nothing, even if it lands before the button re-renders as
  disabled.

## UI states

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> locating: click "Use my location"
  idle --> manual: click "Enter coordinates"
  locating --> saving: position received
  locating --> manual: denied / timeout / unavailable / unsupported
  locating --> manual: click "Enter coordinates instead"
  manual --> manual: invalid input (client check, message shown)
  manual --> saving: submit valid input
  saving --> saved: 200
  saving --> error: 400 / 401 / 500 (server message)
  saving --> error: network failure
  saving --> error: no answer within 10 s
  saving --> saving: second click / Enter (ignored)
  error --> saving: retry (device) / resubmit form (manual)
  error --> manual: click "Enter coordinates" after a device failure
  saved --> locating: switch to device
  saved --> manual: switch to manual
```

The component holds a single `status` value rather than separate booleans, so
"saving" and "error" cannot be true at once. Which buttons show, and whether
they are disabled, is derived from `status`, not stored.

| Status | What the user sees |
|---|---|
| idle | "Use my location" and "Enter coordinates" |
| locating | "Finding your location…" and "Enter coordinates instead" |
| manual | The latitude/longitude form and "Use my location" |
| saving | "Saving your location…"; a manual save keeps the form with a disabled "Saving…" button |
| saved | The source in use and the coordinates, plus a button to switch source |
| error | The message in red; a manual save keeps the form with the typed values, a device save shows "Retry" |

## Examples

| State / input | Behavior |
|---|---|
| User allows location | `PUT` sends device coordinates; 200; "Using your device location" |
| User denies location | Manual form appears with a reason line |
| Manual `{ latitude: 40.7128, longitude: -74.006 }` | 200; "Using the location you entered" |
| Manual `{ latitude: 91, longitude: 0 }` | Client blocks it; sent directly, the route returns 400 `VALIDATION_ERROR`, nothing written |
| `{ latitude: 90, longitude: -180 }` | 200 (boundaries are inclusive) |
| `{ latitude: "40.7", longitude: 0 }` | 400 `VALIDATION_ERROR` (no coercion) |
| Body is not JSON | 400 `VALIDATION_ERROR` |
| Signed-out request | 401; no location is written |
| Upstash env vars unset | 500 `INTERNAL_ERROR`; generic message only |
| Dev server stopped, user clicks save | Error state with "Couldn't reach the server"; the typed coordinates are still in the form; resubmitting works once the server is back |
| Server accepts the request but never answers | After 10 s: "The server took too long to answer"; typed coordinates kept |
| Double-click "Save location", or Enter twice | One `PUT` (one row in the Network tab) |
| Second save | Replaces the first; only one location per user is stored |

## Verify
- `pnpm vitest run tests/integration/user-location.test.ts` (uses an
  in-memory fake for `@project/redis`; no Upstash account needed).
- `pnpm vitest run tests/unit/location-request.test.ts`: the save request's
  timeout, network failure, server message and non-JSON error body.
- With `pnpm dev` running, a signed-in browser session, and
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` set:
  - Submit a location in the browser; the route returns `200`.
  - Submitting `{"latitude":91,"longitude":0}` and malformed JSON returns
    `400` `VALIDATION_ERROR`.
  - A signed-out call returns `401`.
- In the browser: allow location once and deny it once (reset the site
  permission between runs); trigger every arrow in **UI states**; stop the
  dev server and save to confirm the error state keeps the typed values and
  resubmitting works once it is back.
- Double-click "Save location", then press Enter twice in a field: the
  Network tab shows one `PUT` each time.
- Keyboard only: reach the manual form, fill both fields, and submit
  without a mouse.

## Constraints & decisions
- The route uses the Auth.js database session as the source of identity;
  client-supplied user ids are never accepted.
- Locations are stored in Upstash Redis, the one cloud dependency without a
  local stand-in; see [ADR-0012](../../adr/0012-upstash-redis-cloud-dependency.md).
- The location prompt is tied to a user click because browsers penalize
  prompts on page load, and a user who denies it once may not be asked again.
- One current location per user, overwritten on each save. The store keeps no
  history, so nothing here supports a location trail.
- The source ("device" or "entered") is tracked in the component only and is
  not stored on the server; nothing server-side needs it yet.
- The coordinate ranges match `triggerSosAlertSchema`. The two schemas stay
  separate for now; merging them changes the SOS feature and needs that
  spec's update.
- Geolocation requires a secure context, so it works on `localhost` and
  HTTPS but not on a plain-HTTP LAN address. The manual form covers that case.
- Redis geo storage rounds coordinates to roughly 0.6 m precision, so a read
  back may differ slightly from what was sent.

## Out of scope
- Continuous background tracking and "walk home" mode — no spec yet.
- Converting an address to coordinates — no spec yet.
- Showing incidents on the map — see [incident-map](../incidents/incident-map.md).
- Using the location in an SOS alert — see [trigger-sos](../alerts/trigger-sos.md).
- Removing the location when the user goes offline — no spec yet.
