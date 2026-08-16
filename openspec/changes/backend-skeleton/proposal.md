## Why

Backlog item 1.1 (`docs/PLAN.md`). Nothing under `backend/` exists yet. Every later backend change (`feat/jwt-auth`, `feat/certificate-crud`, ...) needs a running Spring Boot project with its cross-cutting concerns already decided — profiles, database migrations, test infrastructure, error format — so those changes can add business logic instead of re-deciding plumbing each time.

## What Changes

Scaffold the Spring Boot project: Maven build, Java 21, dev/prod profiles, Flyway wired (no business tables yet — those arrive with `feat/jwt-auth` and `feat/certificate-crud`), a Testcontainers-backed integration test base, an unauthenticated health check, and the single `@RestControllerAdvice` that turns exceptions into RFC 7807 `application/problem+json` bodies with a `traceId`, per `docs/style-guide.md`. No business endpoints, no authentication yet.

## Capabilities

### New Capabilities
_None._ This is project scaffolding, not user-facing behavior — `skip_specs: true` is set in `.openspec.yaml` per `openspec/AGENTS.md`. The five capability specs already in `openspec/specs/` are unaffected; this change only makes it possible to start implementing against them.

### Modified Capabilities
_None._

## Impact

- Adds `backend/` (Maven project, `pom.xml`, `.mvn/wrapper/`, `src/main/java/com/certificategenerator/...`, `src/main/resources/`, `src/test/java/...`).
- `ci.yml`'s Backend job (currently a no-op guarded on `backend/pom.xml` existing, since `chore/openspec-init`) starts running `./mvnw --batch-mode verify` for real.
- No frontend impact; no impact on the five archived capability specs.
