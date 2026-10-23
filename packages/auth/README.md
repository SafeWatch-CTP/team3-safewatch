# @project/auth — identity / auth

GitHub OAuth and session-derived identity for the web app. Auth.js uses
database-backed sessions through the Prisma adapter.

## Public API

All exports come from `src/index.ts`:

| Export | What it does |
|---|---|
| `currentUserId()` | Returns the session user id or throws `AuthenticationRequiredError`. |
| `AuthenticationRequiredError` | Identifies unauthenticated access for API error mapping. |
| `getVerifiedGitHubEmail(accessToken)` | Retrieves GitHub's verified primary email for safe account matching. |

The Auth.js handlers are exported from `src/auth.ts` and mounted at
`/api/auth/[...nextauth]`.

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
