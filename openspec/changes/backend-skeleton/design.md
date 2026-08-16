## Context

`docs/PLAN.md` already fixes the stack (Spring Boot 4.1.x, Java 21, Maven, Flyway, PostgreSQL on Neon free tier) and the free-tier constraints (Neon suspends when idle, wakes in 1-2s; Render sleeps after ~15 min idle, wakes in ~50s). This scaffold has to make those constraints structural, not something each later feature re-discovers.

## Package layout

`com.certificategenerator`, layered per `docs/style-guide.md`:

```
com.certificategenerator
├── config/       Spring configuration (CORS, OpenAPI if added later)
├── web/          @RestControllerAdvice, RFC 7807 error mapping, correlation-id filter
├── health/       custom liveness detail beyond Actuator's default, if any
└── ...           future: auth/, certificates/, etc. — one package per capability,
                  each internally split into controller/service/repository/dto
```

No capability packages yet (`auth/`, `certificates/`, ...) — those arrive with their own changes.

## Profiles

- `application.yml` — shared defaults (server port, Jackson settings, RFC 7807 media type).
- `application-dev.yml` — active by default via `spring.profiles.active=dev` in `application.yml` for local `./mvnw spring-boot:run`. Points at a local PostgreSQL (docker-compose or a locally running instance); Hikari pool size can be larger locally (default).
- `application-prod.yml` — activated by `SPRING_PROFILES_ACTIVE=prod` on Render. Reads `DATABASE_URL` (Neon), and sets:
  - `spring.datasource.hikari.maximum-pool-size: 3` — Neon free tier's connection ceiling is low; a larger pool from a single small Render instance risks exhausting it.
  - `spring.datasource.hikari.initialization-fail-timeout: -1` combined with a retry-on-first-connection strategy (Hikari's own connection-retry, not custom code), since Neon's compute can take 1-2s to wake from suspend and the very first request after a deploy or idle period must not crash startup.

## Health check

Spring Boot Actuator's `GET /actuator/health`, left unauthenticated (excluded from whatever Spring Security config `feat/jwt-auth` adds later) so Render's own health probe and manual checks work without a token. Deliberately not placed under `/api/v1` — it is an operational endpoint, not part of the client-facing REST contract in `docs/api-reference.md`.

## Error handling

Single `@RestControllerAdvice` in `web/`, per `docs/style-guide.md`:

- Bean Validation failures on request DTOs → 400, `application/problem+json`, field-level detail.
- A small hierarchy of domain exceptions (introduced as later changes need them, e.g. `NotFoundException` → 404) maps through the same advice.
- Every response carries `traceId`: a `Filter` generates a UUID per request (or reuses an inbound `X-Request-Id` if present), stores it in MDC for log correlation, and the advice reads it back into the problem-detail body. This is scaffolded now so no later change has to retrofit tracing into error responses.
- Uncaught exceptions fall through to a generic 500 problem-detail, never leaking a stack trace in the body.

## Testcontainers

A shared abstract base test class (`AbstractIntegrationTest` or similar) starts one PostgreSQL Testcontainer per test JVM (not per test class) and registers its JDBC URL via `@DynamicPropertySource`, so integration tests across future changes (`feat/jwt-auth`, `feat/certificate-crud`, ...) extend it instead of each reinventing container setup. This change's own test suite is limited to proving the scaffold works: context loads, Flyway runs (even with zero or a placeholder migration), health check responds, and the error advice produces a correct RFC 7807 body for a thrown validation error.

## CORS

A permissive dev-only default (`*` origin) guarded by the `dev` profile; `application-prod.yml` leaves the allowed-origin property unset with a comment that `chore/deploy-vercel` (3.3) is responsible for setting it to the real Vercel origin via environment variable. Not fully wired to a real origin yet since the frontend doesn't exist.
