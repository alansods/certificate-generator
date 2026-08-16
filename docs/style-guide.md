# Style guide

## General

- American English everywhere: identifiers, comments, commit messages, UI copy.
- No abbreviations that are not already industry standard. `certificate`, not `cert`, except in the public code prefix.
- Files are kebab-case. Classes are PascalCase. Methods and variables are camelCase in TS/Java, snake_case in SQL.

## Angular

- Standalone components only. No NgModules.
- Signals for local component state. `input()` / `output()` functions instead of decorators.
- `ChangeDetectionStrategy.OnPush` on every component.
- `inject()` instead of constructor injection.
- New control flow syntax: `@if`, `@for`, `@switch`. Never `*ngIf` / `*ngFor`.
- Typed reactive forms. No template-driven forms.
- HTTP lives in `*.api.ts` services returning typed observables. Components never call `HttpClient` directly.
- Feature folders: `src/app/features/<feature>/` with `pages/`, `components/`, `data/`.
- Shared UI in `src/app/shared/`. Cross-cutting infrastructure in `src/app/core/`.
- `strict: true` in tsconfig. `any` is a review blocker.

## SCSS

- Design tokens in `src/styles/_tokens.scss`: colors, spacing scale, radii, typography, elevation. Everything else consumes tokens. A raw hex value outside that file is a review blocker.
- Angular Material is themed through the token file. Component overrides go in `src/styles/_material-overrides.scss`, never scattered in feature styles.
- Use `@use`, never `@import`.
- BEM-ish naming inside component styles. Component styles stay component-scoped.
- Mobile-first media queries via the `respond-to` mixin.

## Java

- Package root `com.certificategenerator`.
- Layering: `controller` → `service` → `repository`. Controllers hold no business logic; repositories are never injected into controllers.
- Requests and responses are records in `dto/`. Entities never cross the controller boundary.
- Mapping via explicit mapper classes. No reflection-based magic.
- Bean Validation on request DTOs. Business rules validated in services.
- Every write path is `@Transactional` at the service level.
- Errors surface as RFC 7807 `application/problem+json` through a single `@RestControllerAdvice`.
- Constructor injection only. No field injection.
- Flyway migrations are append-only and never edited after merge.
