## 1. Workspace

- [ ] 1.1 `ng new frontend` (standalone, routing, SCSS, strict) at the repo root; add `@angular/material` via `ng add`.
- [ ] 1.2 Configure `tsconfig.json` for `strict: true` (already the CLI default — confirm, don't loosen).
- [ ] 1.3 Configure ESLint (`@angular-eslint`) to flag `any` as an error, per `docs/style-guide.md`.
- [ ] 1.4 `src/app/core/`, `src/app/shared/`, `src/app/features/`, `src/app/layout/` directories scaffolded (per `design.md`'s package layout), even where empty beyond a `.gitkeep` or a single placeholder file.

## 2. Styling and theme

- [ ] 2.1 `src/styles/_tokens.scss`: colors, spacing scale, radii, typography, elevation.
- [ ] 2.2 `src/styles.scss`: `@use '@angular/material' as mat;` + `mat.theme(...)` fed from `_tokens.scss`.
- [ ] 2.3 `src/styles/_material-overrides.scss`: component-level Material overrides (empty/minimal scaffold is fine — populated as later features need it).
- [ ] 2.4 `respond-to` SCSS mixin for mobile-first media queries.

## 3. HTTP layer and interceptors

- [ ] 3.1 `core/http/problem-detail.ts`: typed `ProblemDetail` interface.
- [ ] 3.2 `core/auth/token-storage.service.ts`: access token in an injectable service's signal (in-memory only), refresh token in `localStorage`, per `design.md`.
- [ ] 3.3 `core/http/auth-token.interceptor.ts`: attaches the bearer token to protected requests, skips the public-path allowlist.
- [ ] 3.4 `core/http/auth-refresh.interceptor.ts`: catches 401, deduplicates concurrent refresh attempts via a shared in-flight observable, retries the original request once on success, clears tokens and navigates to `/login` on failure. Leaves 403 alone.
- [ ] 3.5 `core/http/error.interceptor.ts` (or inline in the above): normalizes any `HttpErrorResponse` with a `problem+json` body into the typed `ProblemDetail`.
- [ ] 3.6 `app.config.ts`: `provideHttpClient(withInterceptors([authTokenInterceptor, authRefreshInterceptor]))`.
- [ ] 3.7 `core/config/api.config.ts`: API base URL from environment config (dev: `http://localhost:8080`, prod: set in 3.3's deploy work — leave as an environment-file placeholder here).

## 4. Routing shell

- [ ] 4.1 `app.routes.ts`: public route group (placeholder `/verify/:code` route, component landing in 2.6) and an authenticated shell route (layout component, no guard yet — added in 2.2).
- [ ] 4.2 `layout/shell.component.ts`: Material toolbar/sidenav shell, `ChangeDetectionStrategy.OnPush`, standalone.

## 5. Tests

- [ ] 5.1 `auth-token.interceptor.spec.ts`: attaches header for protected URLs, omits it for the public allowlist.
- [ ] 5.2 `auth-refresh.interceptor.spec.ts` (`HttpTestingController`): single 401 triggers one refresh + retry; concurrent 401s trigger exactly one refresh; failed refresh clears tokens and navigates to `/login`; 403 is left alone.
- [ ] 5.3 `token-storage.service.spec.ts`: access token not persisted across a fresh service instance; refresh token persisted via `localStorage`.
- [ ] 5.4 `shell.component.spec.ts`: renders without error.

## 6. Verification

- [ ] 6.1 `cd frontend && npm ci && npm run build && npm run lint && npm test` all pass.
- [ ] 6.2 `openspec validate frontend-shell --type change --strict` passes.
