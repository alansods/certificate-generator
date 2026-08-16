## Context

`frontend-shell`'s design.md already fixed token storage (access token in memory, refresh token in `localStorage`) and the interceptor pair. This document covers the login page, guard, and cold-start UX built on top of that.

## `auth.api.ts`

A single `AuthApi` service (`features/auth/data/auth.api.ts`), per `docs/style-guide.md`'s "HTTP lives in `*.api.ts` services, components never call `HttpClient` directly": `login(email, password)` and `refresh()`, both typed against `TokenPairResponse` (already defined in `core/http/token-pair-response.ts` from `frontend-shell`), both storing the result via `TokenStorageService` themselves rather than leaving that to callers — so the guard and the login page can't diverge on what "a successful auth call" means.

## Login form

A typed reactive form (`FormGroup<{ email: FormControl<string>; password: FormControl<string> }>`), `ChangeDetectionStrategy.OnPush`, submit button disabled while a request is in flight. On success: navigate to `/` (the shell root). No return-url preservation (e.g. redirecting back to whatever protected route the user originally tried) — out of scope for this change; the guard simply sends every unauthenticated attempt to `/login` and login always lands at the shell root. Worth revisiting once there's more than one protected route to actually return to.

Errors are mapped from the `ProblemDetail` (`core/http/problem-detail.ts`, from `frontend-shell`) by status: 401 → "Invalid email or password"; 429 → "Too many attempts, try again in a few minutes" (distinct copy, per spec); anything else → the `ProblemDetail`'s own `detail`/generic fallback message.

## Cold-start state

A `setTimeout`-backed signal, not a `race()`/`timer()` RxJS combinator: the login submission's own subscription doesn't need to be cancelled or altered by the timeout firing, it only needs to flip a `showColdStart` signal to `true` if the request is still pending after the threshold (5 seconds — long enough that a normal warm-server login never shows it, short enough that a user waiting on a ~50s cold start sees the message well before they'd otherwise assume something is broken), and the component clears the timeout in `finalize()` when the request actually settles either way. This keeps the cold-start message purely a UI concern layered on top of the request, not something that changes the request's own error/success handling.

## Auth guard

A functional `CanActivateFn` (`features/auth/auth-guard.ts`), matching Angular's modern guard style (no class-based `CanActivate`):

```
if accessToken() is set → allow
else if no refreshToken → redirect to /login (no API call)
else → call authApi.refresh(); allow on success, redirect to /login on failure
```

The middle branch exists because the access token is deliberately memory-only (per `frontend-shell` design.md) — every hard reload of an otherwise-still-logged-in user has no access token yet, and without this branch they'd bounce to `/login` on every refresh of the page despite having a perfectly valid session. The guard returns an `Observable<boolean | UrlTree>` (not a bare boolean) so the refresh branch's async result plugs directly into Angular Router's guard resolution.

The guard calls `AuthApi.refresh()`, which — as of this change — delegates to a new `core/auth/token-refresh.service.ts` (`TokenRefreshService`) rather than making its own HTTP call. `authRefreshInterceptor` (from `frontend-shell`) now calls the same service. Both routes ultimately share one `AuthRefreshCoordinatorService` single-flight, so a guard-triggered refresh and an interceptor-triggered refresh firing around the same moment can never each present the same refresh token independently — the scenario the coordinator exists to prevent in the first place, per `frontend-shell`'s design.md, now actually holds for every caller, not just the interceptor.

## Package layout

```
frontend/src/app/features/auth/
├── data/
│   └── auth.api.ts
├── auth-guard.ts
└── pages/
    └── login-page/
        ├── login-page.component.ts
        ├── login-page.component.html
        └── login-page.component.scss
```
