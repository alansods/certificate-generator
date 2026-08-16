## Why

Backlog item 1.2 (`docs/PLAN.md`). The `auth` capability is already fully specified in `openspec/specs/auth/spec.md` (archived from `chore/openspec-init`), but nothing implements it yet — `backend/` has no `users`/`refresh_tokens` tables, no password hashing, no JWT issuance, no Spring Security. Every later backend change (`feat/certificate-crud` needs an authenticated principal; `feat/batch-csv-import` needs role checks) depends on this existing.

## What Changes

Implement the `auth` capability end to end against its existing baseline spec: `users` and `refresh_tokens` tables (Flyway), BCrypt password hashing, JWT access tokens, opaque rotating refresh tokens (hashed at rest, with theft detection per the spec's "Refresh token theft detection" requirement), login/refresh-endpoint rate limiting, and a stateless Spring Security filter chain enforcing `ADMIN`/`USER` roles. `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.

No user-registration endpoint — `docs/api-reference.md` doesn't define one, so the first `ADMIN` account is seeded (see `design.md`), matching a small back-office tool rather than public signup.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ Every requirement this change implements already exists in `openspec/specs/auth/spec.md` from the baseline change — implementing an already-specified capability doesn't change its requirements, so `skip_specs: true` is set in `.openspec.yaml`, per `openspec/AGENTS.md`. If implementation surfaces a requirement gap, that becomes a follow-up change with a real delta, not a silent addition here.

## Impact

- Adds `backend/src/main/java/com/certificategenerator/auth/` (controller, service, repository, dto, mapper) and `backend/src/main/java/com/certificategenerator/config/SecurityConfig.java`.
- Adds `backend/src/main/resources/db/migration/V2__users_and_refresh_tokens.sql`.
- `backend/src/main/resources/application*.yml` gain JWT/rate-limit configuration.
- No frontend impact yet (`feat/login-page`, 2.2, consumes this).
