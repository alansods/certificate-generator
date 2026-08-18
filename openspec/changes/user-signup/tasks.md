## 1. Backend

- [ ] 1.1 Add `PasswordPolicy` holding the minimum length and the digit rule as one constant plus a reusable validation annotation, so registration, reset and profile change share it.
- [ ] 1.2 `dto/RegisterRequest.java`: full name, email and password with bean validation, including the password policy annotation.
- [ ] 1.3 `AuthService.register`: reject an existing email with `EmailAlreadyRegisteredException`, hash the password with the existing encoder, save the user with role `USER` and `enabled` true, then issue a token pair through the existing token path.
- [ ] 1.4 `AuthController.register`: `POST /register` returning 201 with `TokenPairResponse`.
- [ ] 1.5 Map `EmailAlreadyRegisteredException` to 409 in the existing problem-detail handler.
- [ ] 1.6 `SecurityConfig`: permit `POST /api/v1/auth/register` in the filter chain.
- [ ] 1.7 Rate limit the endpoint per client IP with the existing `RateLimiter`, with its own configured threshold and window.
- [ ] 1.8 Add `app.auth.registration-enabled` (default true); when false the endpoint responds 404 and `GET /api/v1/auth/registration-enabled` (public) reports it so the client can hide the links.

## 2. Backend tests

- [ ] 2.1 Service tests: successful registration stores a BCrypt hash and never the plain password; a duplicate email throws; the role is always `USER`.
- [ ] 2.2 Controller/web tests: 201 with a token pair; 409 on a duplicate; 400 with field errors for a short password, a password with no digit, a blank name and a malformed email; 429 past the rate limit; 404 when the flag is off.
- [ ] 2.3 A test that the refresh token returned by registration rotates under the existing rules.

## 3. Frontend

- [ ] 3.1 `AuthApi.register()` storing the returned tokens, and `AuthApi.registrationEnabled()`.
- [ ] 3.2 `features/auth/pages/signup-page/`: the form from the mockup — full name, work email, password and confirmation in a two-column row, the policy hint, the USER-role note, and the link back to sign in.
- [ ] 3.3 Client-side validation mirroring the policy, plus the confirmation match; 409 and 429 handled as their own states.
- [ ] 3.4 `app.routes.ts`: public `signup` route.
- [ ] 3.5 Login screen: the "No account? Create one" link, hidden when registration is disabled.

## 4. Frontend tests

- [ ] 4.1 `signup-page.component.spec.ts`: successful signup stores tokens and navigates; 409 marks the email field; 429 shows the rate-limit notice; each client-side rule blocks the request.
- [ ] 4.2 `login-page.component.spec.ts`: the create-account link is rendered when registration is enabled and absent when it is not.

## 5. Documentation and verification

- [ ] 5.1 `docs/api-reference.md`: the register endpoint, its request, its responses and the flag.
- [ ] 5.2 `docs/PLAN.md`: note that self-registration is open by default and what that implies for certificate visibility.
- [ ] 5.3 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 5.4 End to end against the running stack: sign up, land on the list, sign out, sign back in; then disable the flag and confirm the endpoint 404s and the link disappears.
- [ ] 5.5 `npx -y @fission-ai/openspec@latest validate user-signup --type change --strict` passes.
