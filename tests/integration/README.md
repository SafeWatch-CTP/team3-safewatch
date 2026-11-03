# Integration tests

End-to-end tests against a real Postgres engine running in-process via PGlite
(Postgres-in-WebAssembly). No server, no Docker, no network.

| File | What it tests |
|---|---|
| `auth-callback.test.ts` | GitHub's callback — issuer check, `iss` strip, `access_denied` rewritten to a cancellation notice, cookies preserved |
| `auth-error-notice.test.ts` | The wording the landing page shows after a failed or canceled sign-in |
| `auth-session.test.ts` | Session validation — a live ticket resolves to its owner; forged, expired, voided and missing ones are refused; sign-out deletes the row and clears the cookie with its attributes intact |
| `contact-create.test.ts` | `POST /api/v1/contacts` — creates a primary contact for the current user |
| `contact-edit.test.ts` | `PUT`/`DELETE /api/v1/contacts/[id]` — ownership: a foreign or unknown id is 404 and nothing changes |
| `github-email.test.ts` | Only a verified primary GitHub email is accepted for account matching |
| `github-signin.test.ts` | The authorization request (scope, client id, PKCE verifier) and `profile()` building the account |
| `incident-list.test.ts` | The home feed — active incidents by severity then recency, each with coordinates |
| `incident-routes.test.ts` | `/api/v1/incidents/nearby` and `/[id]` — session required, radius handling, 400/404/500 shapes |
| `profile-access.test.ts` | Where a user lands depending on whether a phone number is on file |
| `route-auth.test.ts` | Protected routes with no session — 401 in the standard error shape, and no rows written |
| `session-schema.test.ts` | The `Session` table's shape and its foreign key to `User` |
| `smoke.test.ts` | The PGlite door connects and applies migrations |
| `sos-trigger.test.ts` | `POST /api/v1/alerts` — one EMERGENCY alert plus one pending SMS log per contact, and nothing written on rejection |
| `user-location.test.ts` | `POST /api/v1/location` — session required, boundaries, replacement, no leaked store errors |
| `user-profile-completion.test.ts` | `PATCH /api/user/profile` — own account only, phone conflicts, missing user |

Unit tests live in `tests/unit/`: `route-protection.test.ts` (every API route
derives identity from the session), plus the map model and location request.

## Conventions

- Set `PGLITE_DATA_DIR = "memory://"` and clear `DATABASE_URL` **before**
  importing `@project/db` — the client opens its door at module load.
- Most files stub the auth module (`vi.mock(".../packages/auth/src/auth")`)
  because they test a route, not the session. `auth-session.test.ts` and
  `github-signin.test.ts` deliberately do not: they stub `next/headers`
  instead (see `tests/support/next-headers.ts`) so Auth.js, the Prisma
  adapter and the database all run for real.
- No test touches the network. A test that would make a real request if the
  code under test broke should assert that `fetch` was never called.

**Note**: PGlite does not support `pg_notify`. SSE tests require a real
Postgres connection or mocking.
