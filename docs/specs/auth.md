---
type: infrastructure
---
# Identity — the auth subsystem

Who the current user is, and how every server entry learns it.

## Session-derived identity

- Auth.js v5 with the Prisma adapter stores GitHub accounts and database
  sessions in Postgres.
- GitHub is the only provider. The app requests `read:user` and `user:email`;
  account creation and email matching use GitHub's verified primary email.
- Identity comes from the session only. The client never supplies a user id.
- `currentUserId()` returns the session user's id or throws
  `AuthenticationRequiredError`; protected API handlers return 401.
- Session data includes the user's id and phone number for access routing.
- Auth.js callback endpoints and `/api/health` are public. Profile completion
  and dashboard access are governed by
  [GitHub sign-in and profile completion](auth/github-oauth.md).
- Configure `GITHUB_ID`, `GITHUB_SECRET`, and `AUTH_SECRET`; local development
  also sets `AUTH_TRUST_HOST=true`. The OAuth callback URL is
  `http://localhost:3000/api/auth/callback/github`.

## Constraints & decisions

- One provider (GitHub); more is out of scope.
- GitHub email lookup must succeed and return a verified primary email before
  Auth.js creates or links an account.
- The GitHub callback validates the provider's `iss` value before passing the
  OAuth response to Auth.js, whose current OAuth response validator does not
  accept GitHub's issuer value for this non-OIDC provider configuration.
- Auth.js owns OAuth callback validation, CSRF/state checks, and session
  cookie issuance. The app never handles provider access tokens as sessions.
- Cookie handling is the library's default: nothing overrides `cookies` in
  the Auth.js config, so the session cookie is `HttpOnly`, `SameSite=Lax`,
  `Path=/`, and `Secure` whenever the app is served over https.
- `packages/auth` exposes two entry points. `@project/auth` (`index.ts`) is
  the identity seam and never imports `next-auth`, so it loads outside a
  request context; `@project/auth/auth` is the Auth.js instance and its
  handlers. `index.ts` never re-exports `./auth`, and `currentUserId()`
  reaches the instance through a dynamic import for the same reason.
- Provider access tokens land in `Account.access_token` and nothing reads
  them after sign-in. A GitHub OAuth App issues non-expiring tokens, so
  `refresh_token` and `expires_at` stay null and there is no refresh path.
- Roles/admin, account deletion + export: future work with a privacy doc.

## Verify

- `pnpm test`, `pnpm typecheck` and `pnpm build` pass.
- **Session drill** — `pnpm vitest run tests/integration/auth-session.test.ts`
  presents a cookie and asserts the decision: a live session token resolves
  to its owner, while a forged, expired, deleted or missing one is refused.
  It also signs out and asserts the `Session` row is gone and the cookie
  cleared. The lookup, the Prisma adapter and the database all run for real;
  only the request is stubbed.
- **Sign-in drill** — `pnpm vitest run tests/integration/github-signin.test.ts`
  asserts the authorization request asks GitHub for `read:user user:email`
  only, stores a PKCE verifier, and builds the account from a verified
  primary email.
- **Route drill** — `pnpm vitest run tests/unit/route-protection.test.ts`
  fails if any route under `apps/web/app/api` omits `currentUserId()` and is
  not on its public allowlist. There is no middleware, so every route
  enforces identity itself. `tests/integration/route-auth.test.ts` asserts a
  signed-out caller gets 401 and no rows are written.
- **Manual drill** — with GitHub credentials configured, sign in and confirm
  in devtools that the session cookie is `HttpOnly` and a `Session` row
  exists; sign out and confirm the row is gone. The OAuth handshake itself
  is not covered by a test, because it requires GitHub.

## Key decisions

- [ADR-0003](../adr/0003-dev-identity-stub.md) — rationale for the original
  development identity stub.
- [GitHub OAuth and profile completion](auth/github-oauth.md) — sign-in and
  onboarding behavior.
