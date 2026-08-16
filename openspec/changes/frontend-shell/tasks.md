## 1. Workspace

- [x] 1.1 `ng new frontend` (standalone, routing, SCSS, strict) at the repo root; add `@angular/material` via `ng add`.
- [x] 1.2 Configure `tsconfig.json` for `strict: true` (already the CLI default — confirm, don't loosen).
- [x] 1.3 Configure ESLint (`@angular-eslint`) to flag `any` as an error, per `docs/style-guide.md`.
- [x] 1.4 `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/app/layout/` directories scaffolded (per `design.md`'s package layout), even where empty beyond a `.gitkeep` or a single placeholder file.

## 2. Styling and theme

- [x] 2.1 `src/styles/_tokens.scss`: colors, spacing scale, radii, typography, elevation.
- [x] 2.2 `src/styles.scss`: `@use '@angular/material' as mat;` + `mat.theme(...)` fed from `_tokens.scss`.
- [x] 2.3 `src/styles/_material-overrides.scss`: component-level Material overrides (empty/minimal scaffold is fine — populated as later features need it).
- [x] 2.4 `respond-to` SCSS mixin for mobile-first media queries.

## 3. HTTP layer and interceptors

- [x] 3.1 `core/http/problem-detail.ts`: typed `ProblemDetail` interface.
- [x] 3.2 `core/auth/token-storage.service.ts`: access token in an injectable service's signal (in-memory only), refresh token in `localStorage`, per `design.md`.
- [x] 3.3 `core/http/auth-token.interceptor.ts`: attaches the bearer token to protected requests, skips the public-path allowlist.
- [x] 3.4 `core/http/auth-refresh.interceptor.ts`: catches 401, deduplicates concurrent refresh attempts via a shared in-flight observable, retries the original request once on success, clears tokens and navigates to `/login` on failure. Leaves 403 alone.
- [x] 3.5 `toProblemDetail()` in `core/http/problem-detail.ts` (not a separate interceptor — see design.md for why interceptor response-ordering makes that the wrong place): normalizes any caught HTTP error into the typed `ProblemDetail`, called from `catchError` at the point of use.
- [x] 3.6 `app.config.ts`: `provideHttpClient(withInterceptors([authTokenInterceptor, authRefreshInterceptor]))`.
- [x] 3.7 `core/config/api.config.ts`: API base URL from environment config (dev: `http://localhost:8080`, prod: set in 3.3's deploy work — leave as an environment-file placeholder here).

## 4. Routing shell

- [x] 4.1 `app.routes.ts`: public route group (placeholder `/verify/:code` route, component landing in 2.6) and an authenticated shell route (layout component, no guard yet — added in 2.2).
- [x] 4.2 `layout/shell.component.ts`: Material toolbar/sidenav shell, `ChangeDetectionStrategy.OnPush`, standalone.

## 5. Tests

- [x] 5.1 `auth-token.interceptor.spec.ts`: attaches header for protected URLs, omits it for the public allowlist.
- [x] 5.2 `auth-refresh.interceptor.spec.ts` (`HttpTestingController`): single 401 triggers one refresh + retry; concurrent 401s trigger exactly one refresh; failed refresh clears tokens and navigates to `/login`; 403 is left alone.
- [x] 5.3 `token-storage.service.spec.ts`: access token not persisted across a fresh service instance; refresh token persisted via `localStorage`.
- [x] 5.4 `shell.component.spec.ts`: renders without error.

## 6. Verification

- [x] 6.1 `cd frontend && npm ci && npm run build && npm run lint && npm test` all pass.
- [x] 6.2 `openspec validate frontend-shell --type change --strict` passes.
