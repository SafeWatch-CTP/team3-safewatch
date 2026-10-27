---
type: feature
---
# GitHub sign-in and profile completion

## Why

Users can sign in with an existing GitHub account instead of creating a
separate credential, making onboarding faster while allowing SafeWatch to
prefill available profile details.

## Where it lives

- `packages/auth/` — GitHub OAuth configuration and session-derived identity.
- `packages/db/prisma/schema/` — persistent OAuth accounts and sessions.
- `packages/domain/` — profile completion validation and user-scoped updates.
- `apps/web/app/` — landing page, `/signup`, dashboard, and auth callbacks.

## Behavior

- The landing page offers a GitHub sign-in button that starts GitHub's OAuth
  authorization flow and requests access to the user's basic profile and email.
- After authorization, the app creates a database-backed session and stores its
  token in a secure, HTTP-only cookie.
- A user with a phone number on file proceeds to the main dashboard. A new user
  or returning user without a phone number is sent to `/signup` to complete
  their profile before accessing the dashboard.
- Signed-in users can sign out from both the dashboard and `/signup`; signing
  out invalidates the Auth.js session and returns them to the landing page.
- `/signup` is available only to signed-in users who still need a phone number.
  The form is prefilled with the GitHub name when available and updates the
  session user's name and phone through `PATCH /api/user/profile`.
- Profile completion validates the name and phone number, updates only the
  session user, and never accepts a user id from the client. A phone number
  already belonging to another account returns 409 without changing either
  account.
- GitHub's verified primary email may link to an existing account with the
  same email. An unverified email never links accounts.
- The callback validates GitHub's OAuth issuer (`https://github.com/login/oauth`)
  before removing its `iss` parameter for the configured Auth.js OAuth handler;
  any different issuer is rejected.
- If GitHub returns `access_denied`, the app returns the user to the landing
  page and displays a clear cancellation notice. Other callback errors display
  a generic message and do not expose provider details.
- Signed-out API requests return 401 using `{ error: { code, message } }`.
  Auth callbacks and `/api/health` remain public.

## Examples

| State / input | Behavior |
|---|---|
| GitHub authorization succeeds for a registered user with a phone number | The user reaches the dashboard with an active session. |
| GitHub authorization succeeds for a new user | The user reaches `/signup` with available GitHub profile details prefilled. |
| A returning user has no phone number | The user reaches `/signup` to complete their profile. |
| A signed-out user opens `/signup` | The user is returned to the landing page. |
| A user with a phone number opens `/signup` | The user is returned to the dashboard. |
| A signed-in user chooses “로그아웃” | The session ends and the user returns to the landing page. |
| Profile completion uses an existing phone number | The API returns 409 and leaves both accounts unchanged. |
| GitHub reports an unverified email matching an existing account | The app does not link the account and sign-in fails safely. |
| The user denies GitHub authorization | The landing page displays an authentication-canceled notice. |
| A submitted phone number belongs to another account | Profile completion returns a conflict and leaves both accounts unchanged. |
| A signed-out client requests a protected API | The API returns 401 with the standard error shape. |

## Verify

- Run `pnpm test`, `pnpm test:integration`, `pnpm typecheck`, and `pnpm build`.
- Verify email checks, session persistence, callback cancellation, onboarding
  routing, protected API behavior, and phone conflicts with the integration
  tests under `tests/integration/`.
- With GitHub OAuth credentials configured, approve authorization and confirm a
  session cookie is stored and the correct destination is reached.
- Deny authorization at GitHub and confirm the landing page shows a clear
  cancellation notice without exposing callback details.

## Constraints & decisions

- GitHub is the only OAuth provider; alternative providers and
  email/password login are out of scope.
- Existing accounts link only through an exact match to GitHub's verified
  primary email.
- Phone number remains required before dashboard access; OAuth does not mark a
  phone number as verified.
- Session-derived identity is the sole source of the current user, following
  the [auth infrastructure contract](../auth.md).

## Out of scope

- Phone verification, multi-factor authentication, and alternative sign-in
  providers are not part of this feature.
- Changes to the auth subsystem's broader access-control contract are covered
  by [auth](../auth.md).
