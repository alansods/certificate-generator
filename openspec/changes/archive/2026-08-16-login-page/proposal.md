## Why

Backlog item 2.2 (`docs/PLAN.md`). `feat/frontend-shell` (2.1) built the HTTP layer, token storage, and routing shell but deliberately shipped with no login page, no route guard, and no protected content — the shell's authenticated route group is currently reachable by anyone. This change makes it actually require authentication, and gives a user a way to authenticate at all.

## What Changes

A reactive login form (`features/auth/pages/login-page/`) posting to `POST /api/v1/auth/login` via a new `auth.api.ts` service, storing the returned tokens through the existing `TokenStorageService` and navigating into the authenticated shell. A functional `authGuard` on the shell's route: denies immediately if there's no session at all (no access token, no refresh token — no API call made), silently refreshes if only a refresh token survives a hard reload (the access token is memory-only by design, per `frontend-shell`'s design.md, so every hard reload looks like "no session" until this guard proves otherwise), and redirects to `/login` if that refresh fails. An explicit "waking the server" state on the login form when the request runs past a threshold tuned to Render free tier's ~50-second cold start, per `docs/PLAN.md`'s free-tier constraints — replacing a silent spinner that would otherwise look broken.

## Capabilities

### New Capabilities
- `login-page` — reactive login form, auth guard, session restore on reload, cold-start UX. See `specs/login-page/spec.md`.

### Modified Capabilities
_None._ `frontend-shell`'s HTTP layer, interceptors and token storage are consumed as-is, not changed.

## Impact

- Adds `frontend/src/app/features/auth/` (login page component, `auth.api.ts`, `auth-guard.ts`).
- Adds `/login` to `app.routes.ts`'s public group; adds `canActivate: [authGuard]` to the authenticated shell route.
- No backend impact — consumes `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`, both already implemented and specified in `openspec/specs/auth/spec.md`.
