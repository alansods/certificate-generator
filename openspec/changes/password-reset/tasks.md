## 1. Backend — storage

- [ ] 1.1 `V5__password_reset_tokens.sql`: id, user id (FK, indexed), token hash (unique), expires at, used at, created at.
- [ ] 1.2 `auth/reset/PasswordResetToken.java` and its repository, storing only the SHA-256 hash of the raw token.

## 2. Backend — mail

- [ ] 2.1 Add `spring-boot-starter-mail` to `pom.xml`.
- [ ] 2.2 `MailSender` interface; `LoggingMailSender` writing the link to the log (default, and the only one active in `dev` and tests); `SmtpMailSender` over `JavaMailSender`.
- [ ] 2.3 `app.mail.*` configuration with `@ConfigurationProperties` validation so a profile that selects SMTP fails fast when host, port, username, password or from-address is missing.
- [ ] 2.4 `app.frontend-base-url` configuration; the reset link is built from it and never from request headers.
- [ ] 2.5 A Thymeleaf email template for the reset message, plain enough to render as text.

## 3. Backend — endpoints

- [ ] 3.1 `POST /api/v1/auth/forgot-password`: validate the email shape; when it matches an enabled user, invalidate any outstanding token, create a new one with a 30-minute expiry and dispatch the mail; always return 202.
- [ ] 3.2 `POST /api/v1/auth/reset-password`: look up by token hash, reject unknown, used or expired with 400; apply the password policy; set the new hash and mark the token used in one transaction; revoke every refresh token for that user; return 204.
- [ ] 3.3 Rate limit both endpoints with the existing `RateLimiter` — request by IP and by email, completion by IP — each with its own configured threshold and window.
- [ ] 3.4 `SecurityConfig`: permit both paths.

## 4. Backend tests

- [ ] 4.1 The request endpoint returns 202 for a known and an unknown address, and creates a token only in the first case.
- [ ] 4.2 A new request invalidates the outstanding token.
- [ ] 4.3 Reset succeeds once; the same token then fails with 400; an expired token fails; an unknown token fails.
- [ ] 4.4 A completed reset revokes every refresh token for the user, and a refresh with one of them returns 401.
- [ ] 4.5 Only the hash is persisted — a test asserting the raw token appears in no column.
- [ ] 4.6 The link is built from the configured base URL even when the request carries a hostile `Host`/`X-Forwarded-Host` header.
- [ ] 4.7 429 past each rate limit.
- [ ] 4.8 A context test that a mail-sending profile with missing properties fails to start.

## 5. Frontend

- [ ] 5.1 `AuthApi.forgotPassword()` and `AuthApi.resetPassword()`.
- [ ] 5.2 `features/auth/pages/forgot-password-page/`: the form, then the confirmation card naming the address with the "use another email" action; the 429 state; the back-to-sign-in link.
- [ ] 5.3 `features/auth/pages/reset-password-page/`: read the token from the query string, strip it from the URL with `history.replaceState` on load, then the new password and confirmation form, the success card linking to sign-in, the invalid/expired state offering a new request, and the no-token state.
- [ ] 5.4 `app.routes.ts`: public `forgot-password` and `reset-password` routes.
- [ ] 5.5 Login screen: the "Forgot your password?" link.

## 6. Frontend tests

- [ ] 6.1 `forgot-password-page.component.spec.ts`: a valid submit calls the API and shows the confirmation naming the address; a malformed email makes no request; "use another email" returns the empty form; 429 shows its own notice.
- [ ] 6.2 `reset-password-page.component.spec.ts`: the token is read and removed from the URL; a valid submit calls the API and shows the success card; a 400 shows the invalid-link state with the request-again action; no token shows the incomplete-link state and no form; each client-side rule blocks the request.
- [ ] 6.3 `login-page.component.spec.ts`: the forgot-password link points at the right route.

## 7. Configuration, documentation and verification

- [ ] 7.1 `application.yml` / `application-dev.yml` / `application-prod.yml`: the mail block, the frontend base URL and the new rate limits, with no secret committed.
- [ ] 7.2 `docs/PLAN.md` deploy section and the Render environment list: the SMTP variables and `APP_FRONTEND_BASE_URL`.
- [ ] 7.3 `docs/api-reference.md`: both endpoints, including the always-202 behavior and why.
- [ ] 7.4 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 7.5 End to end in `dev`: request a reset, take the link from the log, set a new password, confirm the old one no longer works and that an existing session stops refreshing.
- [ ] 7.6 One real send through the configured SMTP account in a staging profile before this is enabled in production.
- [ ] 7.7 `npx -y @fission-ai/openspec@latest validate password-reset --type change --strict` passes.
