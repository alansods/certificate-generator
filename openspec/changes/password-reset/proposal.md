## Why

Right now a forgotten password is unrecoverable. There is no reset flow, no password change (until `user-profile`), and no way for an operator to help — the only fix is editing `password_hash` in the database by hand. For a product that will have self-registered accounts after `user-signup`, that is not a gap that can stay open.

This is also the first thing in the product that sends email. That is the expensive part of this change, and most of the design below is about it.

## What Changes

- `POST /api/v1/auth/forgot-password` — public. Takes an email. Always responds 202 regardless of whether the address has an account, so the endpoint cannot be used to enumerate users. When it does match a user, a single-use reset token valid for 30 minutes is created and a link is emailed.
- `POST /api/v1/auth/reset-password` — public. Takes the token and a new password. Validates the token (exists, unused, unexpired), applies the password policy, sets the new hash, marks the token used, and revokes every refresh token for that user. Returns 400 for an invalid or expired token.
- A new `password_reset_tokens` table (Flyway `V5`), storing only a hash of the token, its user, its expiry and its used-at timestamp — the same treatment refresh tokens already get.
- Both endpoints are rate limited: the request endpoint per IP and per email, the reset endpoint per IP.
- Email is sent through a small `MailSender` abstraction over `spring-boot-starter-mail`, configured by environment variables. In development and in tests the default implementation logs the link instead of sending, so the flow is exercisable without an SMTP account.
- Two public pages: `/forgot-password` — email field, then the "check your inbox" confirmation that names the address and offers "use another email" — and `/reset-password?token=…` — new password and confirmation, with distinct states for an invalid or expired token and a confirmation that links to sign-in.
- The login screen gains its "Forgot your password?" link.

## Capabilities

### Added Capabilities
- `password-reset-pages` — the two public screens and their states. See `specs/password-reset-pages/spec.md`.

### Modified Capabilities
- `auth` — gains the reset request, the reset completion, token storage and expiry rules, and the rate limits. See `specs/auth/spec.md`.

## Impact

- Backend: `spring-boot-starter-mail` added to `pom.xml`; new `auth/reset/` package with the entity, repository, service and DTOs; two controller methods; `SecurityConfig` permitting both paths; `V5__password_reset_tokens.sql`; a `MailSender` interface with a logging implementation and an SMTP implementation selected by configuration; a Thymeleaf email template.
- New configuration and secrets: `app.mail.*` (from, provider, SMTP host/port/username/password) and `app.frontend-base-url` for building the link. The SMTP password is an environment variable and never committed.
- Render deployment: the new environment variables have to be set before this ships, and `docs/PLAN.md`'s deploy section needs them.
- Frontend: `features/auth/pages/forgot-password-page/` and `reset-password-page/`, two `AuthApi` methods, two public routes, and the login link.

## Dependencies

- `user-signup` for the shared password policy. If it is deferred, the policy constant is introduced by whichever change lands first.

## Non-goals

- Notifying the user by email when their password changes, or any other transactional email. The `MailSender` abstraction is built so that adding one is small, but nothing else sends mail in this change.
- A resend cooldown UI beyond the rate limit's own behavior.
- Email verification at sign-up. Still out of scope; see `user-signup`.
