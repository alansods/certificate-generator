## 1. Backend

- [x] 1.1 Add `PasswordPolicy` holding the minimum length and the digit rule as one constant plus a reusable validation annotation, so registration, reset and profile change share it. Already existed from `user-profile`; reused as-is.
- [x] 1.2 `dto/RegisterRequest.java`: full name, email and password with bean validation, including the password policy annotation.
- [x] 1.3 `AuthService.register`: reject an existing email with `EmailAlreadyRegisteredException`, hash the password with the existing encoder, save the user with role `USER` and `enabled` true, then issue a token pair through the existing token path.
- [x] 1.4 `AuthController.register`: `POST /register` returning 201 with `TokenPairResponse`.
- [x] 1.5 Map `EmailAlreadyRegisteredException` to 409 in the existing problem-detail handler. Already existed from `user-profile`; reused as-is.
- [x] 1.6 `SecurityConfig`: permit `POST /api/v1/auth/register` in the filter chain.
- [x] 1.7 Rate limit the endpoint per client IP with the existing `RateLimiter`, with its own configured threshold and window.
- [x] 1.8 Add `app.auth.registration-enabled` (default true); when false the endpoint responds 404 and `GET /api/v1/auth/registration-enabled` (public) reports it so the client can hide the links.

## 2. Backend tests

- [x] 2.1 Service tests: successful registration stores a BCrypt hash and never the plain password; a duplicate email throws; the role is always `USER`.
- [x] 2.2 Controller/web tests: 201 with a token pair; 409 on a duplicate; 400 with field errors for a short password, a password with no digit, a blank name and a malformed email; 429 past the rate limit; 404 when the flag is off.
- [x] 2.3 A test that the refresh token returned by registration rotates under the existing rules.

## 3. Frontend

- [x] 3.1 `AuthApi.register()` storing the returned tokens, and `AuthApi.registrationEnabled()`.
- [x] 3.2 `features/auth/pages/signup-page/`: the form from the mockup — full name, work email, password and confirmation in a two-column row, the policy hint, the USER-role note, and the link back to sign in.
- [x] 3.3 Client-side validation mirroring the policy, plus the confirmation match; 409 and 429 handled as their own states.
- [x] 3.4 `app.routes.ts`: public `signup` route.
- [x] 3.5 Login screen: the "No account? Create one" link, hidden when registration is disabled.

## 4. Frontend tests

- [x] 4.1 `signup-page.component.spec.ts`: successful signup stores tokens and navigates; 409 marks the email field; 429 shows the rate-limit notice; each client-side rule blocks the request.
- [x] 4.2 `login-page.component.spec.ts`: the create-account link is rendered when registration is enabled and absent when it is not.

## 5. Documentation and verification

- [x] 5.1 `docs/api-reference.md`: the register endpoint, its request, its responses and the flag.
- [x] 5.2 `docs/PLAN.md`: note that self-registration is open by default and what that implies for certificate visibility.
- [x] 5.3 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.4 End to end against the running stack: signed up through the real UI, landed on the certificate list signed in as the new `USER` account, confirmed the sidebar shows the new name and role. Confirmed the duplicate-email 409 marks the email field in the real browser too. The disabled-flag behavior (404 on submit, link hidden) is covered by `RegistrationDisabledIntegrationTest` and `login-page.component.spec.ts` instead of a manual restart-with-different-config pass — same reasoning as `user-profile`'s verification.
- [x] 5.5 `npx -y @fission-ai/openspec@latest validate user-signup --type change --strict` passes.
