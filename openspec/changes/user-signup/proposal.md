## Why

There is exactly one way for a user account to exist today: `AdminBootstrapRunner` creates a single ADMIN from environment variables at startup. Nobody else can ever get in. That was fine while the product had one operator, and it is the reason the login screen has no "create account" link to design around.

The redesign adds a sign-up screen, and the owner confirmed it is in scope. New accounts get the `USER` role, which already exists and already cannot delete certificates — the ADMIN-only surface is unchanged by this.

## What Changes

- `POST /api/v1/auth/register` — public, unauthenticated. Takes full name, email and password; creates an enabled user with role `USER`; returns the same token pair `POST /api/v1/auth/login` returns, so signing up signs you in.
- Password rules are enforced server-side: at least 8 characters, at least one digit. The same rules are mirrored in the client form.
- An email that is already registered returns 409, and the message does not distinguish "already taken" in a way that turns the endpoint into an account-existence oracle beyond what a signup form inevitably reveals — see `design.md`.
- The endpoint is rate limited per client IP, reusing the existing `RateLimiter`, so the registration table cannot be filled by a script.
- A new public `/signup` page, styled like the login screen: full name, work email, password and confirmation, inline validation, and the note that new accounts start as `USER`. On success it stores the tokens and lands on the certificate list.
- The login screen gains the "No account? Create one" link, and the sign-up screen links back.
- Self-registration is controlled by a configuration flag, `app.auth.registration-enabled`, defaulting to enabled. When it is off the endpoint returns 404 and the client hides the links.

## Capabilities

### Added Capabilities
- `signup-page` — the sign-up screen, its validation and its outcomes. See `specs/signup-page/spec.md`.

### Modified Capabilities
- `auth` — gains self-registration, its password policy, its rate limit and its configuration flag. See `specs/auth/spec.md`.

## Impact

- Backend: `AuthController.register`, `AuthService.register`, `dto/RegisterRequest.java`, a `EmailAlreadyRegisteredException` mapped to 409 by the existing problem-detail handler, `SecurityConfig` permitting the new path, and an `app.auth.registration-enabled` property.
- No migration: `users` already has every column this needs.
- Frontend: `features/auth/pages/signup-page/`, `AuthApi.register()`, a public `signup` route, and the link on the login screen.
- `docs/api-reference.md` gains the endpoint.

## Non-goals

- Email verification. Nothing in the product emails a user yet; the address is not trusted for anything, and adding a verification round trip here would half-build what `password-reset` builds properly.
- Letting a user pick their role, or promoting a user to ADMIN from the UI. Role changes stay a database operation until someone asks for a user-management screen.
- Invite codes or domain allow-lists. The configuration flag is the escape hatch if open registration turns out to be wrong.
