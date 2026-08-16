## 1. Project scaffold

- [x] 1.1 Generate the Maven project (`backend/pom.xml`, `.mvn/wrapper/`), Java 21, Spring Boot 4.1.x parent, dependencies: web, validation, data-jpa, flyway-core, actuator, postgresql driver, testcontainers (test scope), plus lombok if adopted (decide during implementation, note in PR if used since it's not mentioned in `docs/style-guide.md`)
- [x] 1.2 `com.certificategenerator` package root with `config/`, `web/`, `health/` per `design.md`
- [x] 1.3 `.gitignore` already covers `target/`; confirm no backend-specific additions needed

## 2. Profiles and configuration

- [x] 2.1 `application.yml` — shared defaults, `dev` active by default
- [x] 2.2 `application-dev.yml` — local Postgres connection
- [x] 2.3 `application-prod.yml` — `DATABASE_URL` env var, Hikari `maximum-pool-size: 3`, connection retry for Neon cold start
- [x] 2.4 CORS config: permissive under `dev`, unset placeholder under `prod` per `design.md`

## 3. Flyway

- [x] 3.1 Wire Flyway with `spring.flyway.enabled=true` and the standard `src/main/resources/db/migration` location
- [x] 3.2 Add a placeholder baseline migration proving the pipeline runs (no business tables yet — those arrive in `feat/jwt-auth` / `feat/certificate-crud`)

## 4. Health check

- [x] 4.1 Enable Spring Boot Actuator's `/actuator/health`, unauthenticated
- [x] 4.2 Confirm it reports DOWN if the datasource is unreachable (default Actuator behavior), so Render's probe reflects real health

## 5. Global error handling

- [x] 5.1 Correlation-id `Filter`: generate or propagate `traceId`, store in MDC
- [x] 5.2 `@RestControllerAdvice` in `web/`: RFC 7807 `application/problem+json` for validation errors (400) and a generic fallback (500), both carrying `traceId`
- [x] 5.3 Confirm `Content-Type` is exactly `application/problem+json` per `docs/api-reference.md`

## 6. Tests

- [x] 6.1 `AbstractIntegrationTest` base class with a shared Testcontainers PostgreSQL instance and `@DynamicPropertySource`
- [x] 6.2 Context-loads test extending the base class, asserting Flyway migrated successfully
- [x] 6.3 `@WebMvcTest` (or full context test) asserting `/actuator/health` returns 200 and the error advice returns a correct problem-detail body with `traceId` for a validation failure

## 7. Wiring and docs

- [x] 7.1 Confirm `./mvnw --batch-mode verify` passes locally and `ci.yml`'s Backend job goes green for real (it currently no-ops on `backend/pom.xml` not existing)
- [x] 7.2 Update `README.md`'s "Getting started" section with the real backend run command, replacing "Not scaffolded yet" for the backend half
