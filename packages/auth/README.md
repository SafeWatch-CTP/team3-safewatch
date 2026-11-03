# @project/auth — identity / auth

GitHub OAuth and session-derived identity for the web app. Auth.js uses
database-backed sessions through the Prisma adapter.

## Public API

Two entry points, deliberately separate.

`@project/auth` (`src/index.ts`) — the identity seam. It never imports
`next-auth`, so it loads without `AUTH_SECRET` or a request context:

| Export | What it does |
|---|---|
| `currentUserId()` | Returns the session user id or throws `AuthenticationRequiredError`. |
| `AuthenticationRequiredError` | Identifies unauthenticated access for API error mapping. |
| `getVerifiedGitHubEmail(accessToken)` | Retrieves GitHub's verified primary email for safe account matching. |

`@project/auth/auth` (`src/auth.ts`) — the Auth.js instance itself:

| Export | What it does |
|---|---|
| `handlers` | The GET/POST route handlers, mounted at `/api/auth/[...nextauth]`. |
| `auth()` | Resolves the current session from the request's cookie. |
| `signIn()` / `signOut()` | Start GitHub authorization; end the session and delete its row. |
| `authConfig` | The configuration object, so tests can assert on it without starting Auth.js. |

`index.ts` must not re-export `./auth`: a static re-export would pull
`next-auth` into every module that imports the seam and defeat the dynamic
import in `current-user.ts`. See `docs/specs/auth.md`.

## Dependencies

- `next`
- `next-auth`
- `@auth/prisma-adapter`
- `@project/db`

## Configuration

Set `GITHUB_ID`, `GITHUB_SECRET`, and `AUTH_SECRET`; local development also
sets `AUTH_TRUST_HOST=true`. The GitHub OAuth callback URL is
`http://localhost:3000/api/auth/callback/github`.

## Consumers

- `apps/web` — OAuth routes and session-scoped API identity.
