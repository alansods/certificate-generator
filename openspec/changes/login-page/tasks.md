## 1. Auth API service

- [x] 1.1 `features/auth/data/auth.api.ts`: `login(email, password)` `POST`ing via `HttpClient` and storing the result through `TokenStorageService`; `refresh()` delegates to `core/auth/token-refresh.service.ts` (`TokenRefreshService`), shared with `authRefreshInterceptor`, so both routes go through the same single-flight `AuthRefreshCoordinatorService` instead of each presenting the refresh token independently.

## 2. Login page

- [x] 2.1 `features/auth/pages/login-page/login-page.component.ts`: typed reactive form (email, password), `OnPush`, `inject()`, submit calls `AuthApi.login`, navigates to `/` on success.
- [x] 2.2 Error mapping: 401 → "Invalid email or password"; 429 → distinct rate-limit message; other → `ProblemDetail.detail`/generic fallback.
- [x] 2.3 Cold-start state: signal flipped by a `setTimeout` (5s) started on submit, cleared on settle; template shows a "waking the server" message instead of a bare spinner while true.
- [x] 2.4 `login-page.component.html`/`.scss`: Material form field/button, tokens only (no raw hex/px), `@if`/`@for` only.

## 3. Auth guard and routing

- [x] 3.1 `features/auth/auth-guard.ts`: functional `CanActivateFn` per design.md's three-branch logic (allow / redirect-no-call / silent-refresh-then-decide).
- [x] 3.2 `app.routes.ts`: add `/login` to the public group; add `canActivate: [authGuard]` to the authenticated shell route.

## 4. Tests

- [x] 4.1 `auth.api.ts` spec (`HttpTestingController`): `login`/`refresh` store tokens on success.
- [x] 4.2 `login-page.component.spec.ts`: valid credentials navigates; 401 shows inline error and stays; 429 shows the distinct rate-limit message; cold-start message appears only past the threshold (fake timers) and never for a fast response.
- [x] 4.3 `auth-guard.spec.ts`: no session → redirect, no HTTP call; access token present → allow; only refresh token present → refresh then allow; refresh token present but refresh fails → clear tokens, redirect.

## 5. Verification

- [x] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.2 `openspec validate login-page --type change --strict` passes.
