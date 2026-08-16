## 1. Persistence

- [x] 1.1 `V2__users_and_refresh_tokens.sql`: `users` (id, email unique, password_hash, full_name, role, enabled, created_at) and `refresh_tokens` (id, user_id FK, token_hash unique, expires_at, revoked_at nullable, created_at), per `docs/PLAN.md`'s domain model
- [x] 1.2 `User`, `RefreshToken` JPA entities; `UserRepository`, `RefreshTokenRepository`

## 2. Password and bootstrap admin

- [x] 2.1 `BCryptPasswordEncoder` bean
- [x] 2.2 `AdminBootstrapRunner`: seeds one `ADMIN` from `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` env vars, no-op if `users` is non-empty or either var is unset, per `design.md`

## 3. JWT

- [x] 3.1 `JwtService`: sign access tokens (`sub`, `email`, `role`, 15 min expiry) and parse/validate them
- [x] 3.2 Fail startup fast if `JWT_SECRET` is unset or shorter than 256 bits

## 4. Refresh tokens

- [x] 4.1 `RefreshTokenService`: issue (random 256-bit value, store only the SHA-256 hash), rotate on use, revoke
- [x] 4.2 Theft detection: presenting an already-revoked token's hash revokes every other unrevoked token for that user, per `openspec/specs/auth/spec.md`'s "Refresh token theft detection" requirement

## 5. Rate limiting

- [x] 5.1 In-memory sliding-window limiter per `design.md`
- [x] 5.2 Apply to `/auth/login` (email + IP) and `/auth/refresh` (IP), both returning 429 once exceeded

## 6. Spring Security

- [x] 6.1 `SecurityConfig`: stateless, CSRF disabled, permit `/actuator/health` + `/auth/login` + `/auth/refresh`, everything else authenticated
- [x] 6.2 `JwtAuthenticationFilter`: validates bearer token, populates `SecurityContext`
- [x] 6.3 `AuthenticationEntryPoint`/`AccessDeniedHandler` producing RFC 7807 bodies consistent with `GlobalExceptionHandler`

## 7. Endpoints

- [x] 7.1 `POST /api/v1/auth/login` — 200 with token pair, 401 on bad credentials (no field hint), 429 over the rate limit
- [x] 7.2 `POST /api/v1/auth/refresh` — 200 with rotated pair, 401 on invalid/revoked/reused token (with theft-detection revocation), 429 over the rate limit
- [x] 7.3 `POST /api/v1/auth/logout` — 204, revokes the presented refresh token
- [x] 7.4 `GET /api/v1/auth/me` — 200 with the authenticated user's profile, 401 if unauthenticated
- [x] 7.5 DTOs (`dto/`) and a mapper; no entity crosses the controller boundary, per `docs/style-guide.md`

## 8. Tests (per docs/testing.md)

- [x] 8.1 Unit: `JwtService` (sign/parse/expiry/tampered-signature rejection), `RefreshTokenService` (rotation, theft detection revokes the family)
- [x] 8.2 Unit: rate limiter (threshold, window reset, independent keys don't interfere)
- [x] 8.3 Integration test: anonymous vs. authenticated access asserted for `/me` (401 vs 200) and public reachability confirmed for `/login`/`/refresh`. No `ADMIN`-vs-`USER` distinction to test yet — no `ADMIN`-only endpoint exists until `feat/certificate-crud`'s delete, and this change has no way to create a `USER` account (no such endpoint either)
- [x] 8.4 Integration (Testcontainers): full login → authenticated `/me` → refresh → logout flow against a real database
- [x] 8.5 Integration: reused-revoked-refresh-token scenario actually revokes all of the user's tokens end to end

## 9. Wiring and docs

- [x] 9.1 `application*.yml`: JWT and rate-limit properties (dev defaults vs. prod env-var-only secret)
- [x] 9.2 `README.md`: document `JWT_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` for local setup
- [x] 9.3 Confirm `./mvnw verify` passes and `openspec validate --all --strict` passes
