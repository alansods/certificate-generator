## Why

The authenticated chrome is a placeholder. A 240px `mat-sidenav` holds exactly one link, the toolbar holds a hamburger and a title, and nothing on screen says who is signed in or what role they hold. There is no way to sign out at all: the backend has had `POST /api/v1/auth/logout` since the JWT change, and no button ever called it — the only way out is clearing storage. That is the gap the redesign closes first.

The mockup also puts certificate verification inside the app. Today verification is public-only, so a signed-in operator checking a code has to open the public page in another tab. Both the top bar's quick-verify field and the sidebar's "Verify code" page exist for that.

## What Changes

- The chrome becomes a 64px top bar over a 240px sidebar. The top bar carries the brand (a link back to the list) and, at the right, a compact "Verify code" field that jumps straight to the in-app lookup with the code filled in.
- The sidebar carries a "Menu" overline and the navigation items, each with an icon and an accent-tinted active state. This change ships `Certificates` and `Verify code`; `My profile` is added by `user-profile`.
- The sidebar's footer shows the signed-in user: initials avatar, full name, role, and a "Sign out" item. The name and role come from `GET /api/v1/auth/me`, fetched once when the shell loads and held in a session signal. Sign out calls `POST /api/v1/auth/logout`, clears the stored tokens and returns to the login screen.
- A new in-app page at `/verify-code` performs the same lookup as the public page, using the same public endpoint, rendered inside the shell.
- On narrow viewports the sidebar collapses to a bottom-anchored bar and the quick-verify field drops out of the top bar; the sidebar's items remain reachable.
- `MatToolbar`, `MatSidenav`, `MatList` and `MatIcon` leave the shell; icons become inline SVG.

## Capabilities

### Added Capabilities
- `internal-verify-page` — the authenticated code lookup, its states, and the top bar's quick-verify entry point. See `specs/internal-verify-page/spec.md`.

### Modified Capabilities
- `frontend-shell` — gains requirements for the navigation chrome, the signed-in identity display, and sign out. See `specs/frontend-shell/spec.md`.
- `auth` — "Logout" is restated: the refresh token is the credential, and an access token is not required. See `specs/auth/spec.md`.

## Impact

**Backend, added during review.** `POST /api/v1/auth/logout` becomes `permitAll`. Wiring the sign-out button up made a latent hole reachable: logout required a bearer, so an expired access token sent it through the client's silent-refresh retry, which rotates the refresh token and then re-sends the *original* request body — revoking the superseded token while the freshly issued one stayed valid for its full TTL and was deleted locally. Reproduced against the running backend before the fix: the logout returned 204 and the rotated token still refreshed successfully. Possession of the refresh token is the credential being spent; requiring an access token as well bought nothing and cost that.

- `frontend/src/app/layout/shell.component.*` — rewritten.
- Adds `frontend/src/app/core/auth/session.service.ts` holding the current user as a signal, and `AuthApi.me()` / `AuthApi.logout()`.
- Adds `frontend/src/app/features/verification/pages/verify-code-page/`.
- `frontend/src/app/app.routes.ts` — adds `verify-code` under the authenticated shell.
- `backend/.../config/SecurityConfig.java` — logout joins the permitted paths; `frontend/src/app/core/config/api.config.ts` — and the public paths, so no bearer is attached and the 401 retry cannot re-send a stale body.
- `GET /api/v1/auth/me` is otherwise unchanged, and the in-app lookup reuses `GET /api/v1/public/verify/{code}`.

## Non-goals

- The "My profile" sidebar item and page — `user-profile`.
- Redesigning the pages rendered inside the shell — `nocturne-certificate-list` and `nocturne-certificate-screens`.
