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
- Roles/admin, account deletion + export: future work with a privacy doc.

## Key decisions

- [ADR-0003](../adr/0003-dev-identity-stub.md) — rationale for the original
  development identity stub.
- [GitHub OAuth and profile completion](auth/github-oauth.md) — sign-in and
  onboarding behavior.
