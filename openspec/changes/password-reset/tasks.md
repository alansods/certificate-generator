## 1. Backend — storage

- [x] 1.1 `V6__password_reset_tokens.sql`: id, user id (FK, indexed), token hash (unique), expires at, used at, created at. (`V5` was already taken by `user-signup`'s email-normalization migration by the time this shipped.)
- [x] 1.2 `auth/reset/PasswordResetToken.java` and its repository, storing only the SHA-256 hash of the raw token.

## 2. Backend — mail

- [x] 2.1 Add `spring-boot-starter-mail` to `pom.xml`.
- [x] 2.2 `MailSender` interface; `LoggingMailSender` writing the link to the log (default, and the only one active in `dev` and tests); `SmtpMailSender` over `JavaMailSenderImpl`.
- [x] 2.3 `app.mail.*` configuration, validated by `SmtpMailSender`'s own constructor so a profile that selects SMTP fails fast when host, port, username, password or from-address is missing.
- [x] 2.4 `app.frontend-base-url` configuration; the reset link is built from it and never from request headers. (Already existed, added by the certificate PDF's QR code — reused as-is.)
- [x] 2.5 A Thymeleaf email template for the reset message, plain enough to render as text.

## 3. Backend — endpoints

- [x] 3.1 `POST /api/v1/auth/forgot-password`: validate the email shape; when it matches an enabled user, invalidate any outstanding token, create a new one with a 30-minute expiry and dispatch the mail; always return 202.
- [x] 3.2 `POST /api/v1/auth/reset-password`: look up by token hash, reject unknown, used or expired with 400; apply the password policy; set the new hash and mark the token used in one transaction; revoke every refresh token for that user; return 204.
- [x] 3.3 Rate limit both endpoints with the existing `RateLimiter` — request by IP and by email, completion by IP — each with its own configured threshold and window.
- [x] 3.4 `SecurityConfig`: permit both paths.

## 4. Backend tests

- [x] 4.1 The request endpoint returns 202 for a known and an unknown address, and creates a token only in the first case.
- [x] 4.2 A new request invalidates the outstanding token.
- [x] 4.3 Reset succeeds once; the same token then fails with 400; an expired token fails; an unknown token fails.
- [x] 4.4 A completed reset revokes every refresh token for the user, and a refresh with one of them returns 401.
- [x] 4.5 Only the hash is persisted — a test asserting the raw token does not equal the persisted `token_hash` value.
- [x] 4.6 The link is built from the configured base URL even when the request carries a hostile `Host`/`X-Forwarded-Host` header.
- [x] 4.7 429 past each rate limit.
- [x] 4.8 A test that a mail-sending profile with missing properties fails to start — a Spring `ApplicationContextRunner` slice test (`MailSenderStartupTest`) plus a direct constructor unit test (`SmtpMailSenderTest`).

## 5. Frontend

- [x] 5.1 `AuthApi.forgotPassword()` and `AuthApi.resetPassword()`.
- [x] 5.2 `features/auth/pages/forgot-password-page/`: the form, then the confirmation card naming the address with the "use another email" action; the 429 state; the back-to-sign-in link.
- [x] 5.3 `features/auth/pages/reset-password-page/`: read the token from the query string, strip it from the URL with `history.replaceState` on load, then the new password and confirmation form, the success card linking to sign-in, the invalid/expired state offering a new request, and the no-token state.
- [x] 5.4 `app.routes.ts`: public `forgot-password` and `reset-password` routes. `frontend/angular.json`'s initial-bundle budget rose from 580kB to 595kB (`maximumWarning`) to accommodate the two new public pages, matching how the sibling `user-signup`/`user-profile` changes documented their own budget bumps.
- [x] 5.5 Login screen: the "Forgot your password?" link.

## 6. Frontend tests

- [x] 6.1 `forgot-password-page.component.spec.ts`: a valid submit calls the API and shows the confirmation naming the address; a malformed email makes no request; "use another email" returns the empty form; 429 shows its own notice.
- [x] 6.2 `reset-password-page.component.spec.ts`: the token is read and removed from the URL; a valid submit calls the API and shows the success card; a 400 shows the invalid-link state with the request-again action; no token shows the incomplete-link state and no form; each client-side rule blocks the request.
- [x] 6.3 `login-page.component.spec.ts`: the forgot-password link points at the right route.

## 7. Configuration, documentation and verification

- [x] 7.1 `application.yml`: the mail block and the new rate limits, with no secret committed. `app.mail.*` values are environment-variable-backed with a safe `logging`/empty default for `dev` and tests; `application-prod.yml` overrides `app.mail.provider` to have no default at all, so the `prod` profile fails fast instead of silently inheriting the logging fallback (mirrors `app.jwt.secret`'s existing no-default pattern in the same file).
- [x] 7.2 `docs/deployment.md`'s Render environment variable table and `backend/render.yaml`: the five `APP_MAIL_*` variables — `APP_MAIL_PROVIDER` required in production (the backend won't start without it), the four SMTP-specific ones required once it's set to `smtp`. `docs/PLAN.md`'s decision log records why this ships without a chosen provider while still requiring one to boot in production.
- [x] 7.3 `docs/api-reference.md`: both endpoints, including the always-202 behavior and why.
- [x] 7.4 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 7.5 End to end in `dev`: requested a reset for the seeded admin through the real UI, took the link from the backend log, set a new password, confirmed the old password now fails and the new one works via `curl`, then restored the original password the same way.
- [ ] 7.6 One real send through the configured SMTP account in a staging profile before this is enabled in production. **Deferred**: no SMTP provider is chosen yet (see `docs/deployment.md` "Password reset email"). Do this once `APP_MAIL_PROVIDER=smtp` and the four SMTP variables are set on Render, before telling real users to expect password-reset email.
- [x] 7.7 `npx -y @fission-ai/openspec@latest validate password-reset --type change --strict` passes.
