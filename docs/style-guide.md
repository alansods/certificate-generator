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

## Styling

The design system is **Nocturne** — dark ground, blurple accent, hairline elevation. `docs/design-spec.md` is the specification; this section is the working rules.

- Tokens live in `src/styles.css`'s `@theme static` block: color, spacing, radius, typography, elevation. That file is the source of truth. `src/styles/_tokens.scss` mirrors the same values for the Sass that has not been migrated yet, and disappears with the last component stylesheet. A raw hex or px value outside those two files is a review blocker.
- Reach for a Tailwind utility first, a token custom property second, component SCSS last. Component SCSS is for what utilities cannot express — not for restating a utility.
- `--spacing` is 2.8px (density 0.7). A Tailwind spacing number in this project does **not** mean `n × 4px`: `p-3` is 8.4px, `gap-4` is 11.2px.
- Every interactive control carries four states: hover tinted with the accent (`hover:bg-accent-900`), pressed one step further (`active:bg-accent-800`), the `:focus-visible` ring from `@layer base` — never a per-component focus style — and `opacity-45` when disabled.
- The accent is line and glow, never a large fill: `accent-900` on an `accent-500` fill measures 4.43:1 and fails AA, which is the whole argument for bordered buttons over filled ones. As text on the app grounds the accent is fine (5.45:1 on `bg`, 4.71:1 on `surface`), but accent-colored paragraph text still uses `accent-300` (11.7:1) so the rule holds if the accent is ever retuned.
- Elevation on a dark ground is `shadow-e1`/`e2`/`e3` — a hairline edge plus ambient darkness. Do not reach for a blurred Material drop shadow.
- Touch targets are at least 44px below the medium breakpoint.
- While Angular Material components remain on screen, their colors come from the `--mat-sys-*` mapping in `src/styles.scss`, which resolves entirely to Nocturne tokens. Never introduce a second palette, and never add a new `::ng-deep`.
- A component SCSS file using `@apply` needs `@reference "../../styles.css";` at the top, or the tokens are invisible to it.
- Use `@use`, never `@import`, in the SCSS that remains. BEM-ish naming inside component styles, and component styles stay component-scoped.
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
