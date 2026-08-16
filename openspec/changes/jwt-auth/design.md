## Context

`openspec/specs/auth/spec.md` fixes the external contract (endpoints, status codes, rate-limit keying, storage requirements). This document covers the implementation choices the spec deliberately leaves open.

## Bootstrap admin (no registration endpoint exists)

`docs/api-reference.md` defines no `POST /auth/register` — this is a back-office tool for a small team, not public signup, so self-registration was never in scope. But some account has to exist for the very first login.

**Decision:** a `CommandLineRunner` bean, active in every profile, that on startup checks whether the `users` table is empty and, if so, creates one `ADMIN` user from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` environment variables (BCrypt-hashed before storage, same as any other password). If the table already has rows, or either env var is unset, it's a no-op — this makes it safe to leave the variables set permanently without recreating the account on every restart. Documented in `README.md`'s getting-started section so the owner knows to set these two variables locally and on Render, without writing any code or SQL. Creating additional users afterward is out of scope for this change (no admin-facing "create user" endpoint yet) — the bootstrap admin can promote/manage further accounts once such an endpoint exists in a later change, or, for the MVP's expected single-operator use, may be the only account that ever exists.

## Login timing

`AuthService.login` always calls `passwordEncoder.matches(...)` — against a real user's stored hash if the email exists, against a fixed dummy hash encoded once at startup if it doesn't — rather than short-circuiting on a `null` user. A short-circuit would make requests against unregistered emails return measurably faster than requests against real ones with a wrong password, letting an attacker enumerate accounts by timing even though the response body and status are already identical either way.

## JWT

- **Library:** `io.jsonwebtoken:jjwt-api`/`jjwt-impl`/`jjwt-orgjson` (JJWT). Chosen over Spring Security's OAuth2 Resource Server (`NimbusJwtDecoder`/`JwtEncoder`) because this app is both issuer and sole verifier of its own tokens with no external identity provider or JWK rotation — OAuth2 Resource Server's machinery is built for validating someone else's tokens against a JWKS endpoint, which doesn't apply here. A plain `JwtService` (sign/parse) plus a custom `OncePerRequestFilter` is less code and more legible for this shape. `jjwt-orgjson` (org.json), not `jjwt-jackson` — the latter pulls classic Jackson 2 as a transitive, which isn't version-managed by Boot 4.1's BOM (Boot itself moved to Jackson 3) and would leave two unrelated Jackson majors on the classpath for no benefit.
- **Signing:** HMAC-SHA256, secret from `JWT_SECRET` env var (never committed; must be at least 256 bits — the app fails fast at startup if it's shorter, rather than silently accepting a weak key).
- **Claims:** `sub` (user id), `email`, `role`. 15-minute expiry per `docs/api-reference.md`.
- **Access tokens are never persisted** — validity is purely cryptographic + expiry, matching the spec's stateless-until-logout model (logout revokes the *refresh* token, not the still-valid access token; the 15-minute window bounds the blast radius, which is why it's short).

## Refresh tokens

- **Format:** a random 256-bit value (not a JWT), Base64URL-encoded, returned to the client as an opaque string.
- **Storage:** only the SHA-256 hash is persisted in `refresh_tokens.token_hash` (unique), per the spec's "Refresh token storage" requirement. The raw value is never logged or persisted.
- **Rotation:** every successful `/auth/refresh` call revokes the presented token (`revoked_at = now()`) and issues a new pair in the same transaction. Guarded by an `@Version` column: two concurrent rotations of the same token would otherwise both pass the not-revoked check before either commits, each minting a child token from one rotation. The loser's flush fails with `OptimisticLockingFailureException`, mapped to the same "already used" 401 as any other reuse.
- **Theft detection:** if a client presents a token whose row has `revoked_at IS NOT NULL`, the spec requires revoking every other refresh token for that user. Implemented as: look up the token by hash regardless of revoked state; if found-but-revoked, revoke all of that user's currently-unrevoked tokens before returning 401.

## Rate limiting

In-memory sliding-window counter, keyed as the spec requires: `/auth/login` on `email + IP`, `/auth/refresh` on IP alone. Acceptable because Render free tier runs a single instance — an in-memory limiter resets on restart/redeploy, which is a fine tradeoff for a low-traffic internal tool and avoids standing up Redis just for this. Revisit only if the app ever runs more than one instance.

Backed by a bounded Caffeine cache (`maximumSize` + `expireAfterAccess`), not a plain `ConcurrentHashMap` — both the email in the login key and the token in a refresh attempt are attacker-controlled, so an unbounded map would let an attacker exhaust heap by cycling through fake values.

**Client IP source:** `AuthController` uses `HttpServletRequest.getRemoteAddr()` only, deliberately ignoring `X-Forwarded-For` — any direct API caller can set that header to an arbitrary value per request, which would let an attacker mint a fresh rate-limit bucket on every request and defeat both limits entirely. This means the IP component is meaningless in local dev and in any deployment where the app sits behind a proxy that doesn't get specially configured, since `getRemoteAddr()` then resolves to the proxy's address for every request. Correct proxy-aware extraction needs a trusted-proxy boundary (e.g. Tomcat's `RemoteIpValve` pinned to Render's internal proxy range) that can't be configured correctly until the app is actually deployed and that range is known — deferred to `chore/deploy-render-neon` (3.2).

## Spring Security

- Stateless (`SessionCreationPolicy.STATELESS`), CSRF disabled (no cookie-based session to protect), a single custom `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter` that validates the bearer token and populates `SecurityContext` with the user's id/role.
- Permitted without auth: `/actuator/health`, `/api/v1/auth/login`, `/api/v1/auth/refresh`. Everything else requires a valid access token; `ADMIN`-only routes (none exist yet — `feat/certificate-crud`'s delete endpoint will be the first) use `hasRole("ADMIN")`.
- `AuthenticationEntryPoint`/`AccessDeniedHandler` produce the same RFC 7807 shape as `GlobalExceptionHandler`, so a 401/403 from the security layer looks identical to one thrown from a controller.

## Package layout

```
com.certificategenerator.auth
├── AuthController          POST /login, /refresh, /logout, GET /me
├── AuthService              orchestrates login/refresh/logout
├── JwtService                sign/parse access tokens
├── RefreshTokenService       issue/rotate/revoke, theft detection
├── RateLimiter                in-memory sliding-window limiter
├── User, RefreshToken          JPA entities
├── UserRepository, RefreshTokenRepository
├── dto/                       LoginRequest, TokenPairResponse, UserResponse, RefreshRequest
└── AdminBootstrapRunner        the CommandLineRunner above
```

`SecurityConfig` and `PasswordEncoderConfig` live in `config/` (existing package from `feat/backend-skeleton`), since they're cross-cutting rather than auth-specific business logic.
