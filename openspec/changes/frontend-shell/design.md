## Context

`docs/style-guide.md`'s Angular/SCSS section fixes most implementation choices already (standalone components, signals, `inject()`, new control-flow syntax, typed reactive forms, `core`/`shared`/`features` layout, token-driven SCSS). This document covers the decisions the style guide leaves open, plus how the frontend interlocks with the backend's actual auth mechanics.

## Angular Material theming

Angular Material's M3 theming API (`@include mat.theme(...)` in `styles.scss`, `mat.$<palette>-palette` inputs, `mat.theme-overrides` for token-level tweaks) generates CSS custom properties from a palette. `src/styles/_tokens.scss` defines the project's actual design tokens (a small SCSS map of brand colors, spacing scale, radii, typography, elevation); `styles.scss` feeds that into `mat.theme(...)` so Material's own generated tokens and the project's hand-authored tokens both trace back to one file, per the style guide's "a raw hex value outside that file is a review blocker" rule. Component-level Material overrides live in `src/styles/_material-overrides.scss` (`mat.theme-overrides`/component-specific mixins), never scattered into feature stylesheets.

## Token storage: access token in memory, refresh token in `localStorage`

Nothing in `docs/` dictates this, so it's decided here. The backend sends both tokens in the JSON body (not cookies — CORS is configured for `Authorization` header auth, not `withCredentials` cookie auth), so storage is entirely a frontend choice:

- **Access token: in-memory only** (a signal in an injectable service), never persisted. It's a 15-minute-lived JWT; losing it on a hard refresh just costs one silent-refresh round trip, and keeping it out of any persistent storage limits the XSS blast radius to whatever's live in the current tab.
- **Refresh token: `localStorage`.** It has to survive a hard reload (or the user would be logged out every time they refresh the page), and `localStorage` is the only option that does that without a backend change (an HttpOnly cookie would need the backend to set it, which is out of scope here). This is a real, accepted tradeoff — an XSS bug could exfiltrate the refresh token — worth flagging explicitly rather than leaving implicit, since revisiting it later (e.g. moving to an HttpOnly cookie) is a backend + frontend change together, not frontend-only.

## Auth interceptor pair

Two functional interceptors (Angular's `HttpInterceptorFn`, registered via `provideHttpClient(withInterceptors([...]))`, per `docs/style-guide.md`'s "no NgModules" rule):

1. **`authTokenInterceptor`** — attaches `Authorization: Bearer <accessToken>` to any request whose URL matches the configured API base and isn't in a small allowlist of public paths (`/auth/login`, `/auth/refresh`, `/public/verify/`).
2. **`authRefreshInterceptor`** — catches a 401 from a protected request, and:
   - If a refresh is already in flight, waits on that same in-flight observable rather than starting a second one (a `shareReplay(1)`-backed subject holding the current refresh attempt, cleared when it settles). This directly answers the backend's refresh-token rotation/theft-detection behavior described in `openspec/specs/auth/spec.md`: **presenting an already-used refresh token revokes every refresh token for that user**, so two interceptor instances racing to refresh with the same stale token — not deduplicated — would kill the user's whole session on a single expired-token event instead of recovering from it.
   - On successful refresh: store the new access+refresh tokens (the refresh token **must** be replaced — the old one is now revoked server-side) and retry the original request once.
   - On failed refresh (itself 401): clear both tokens and navigate to `/login`. No further retry.
   - A response entering this interceptor with 403 is left alone — that's an authorization failure, not an expired-token problem, and retrying after a refresh would just get 403 again.

**Known limitation, not fixed here:** the dedup above is single-tab (in-memory singleton state), while the refresh token in `localStorage` is shared across every tab of the same origin. Two tabs whose access tokens expire around the same moment can still independently race each other, and the loser's refresh attempt looks like theft to the backend (a stale, already-rotated token), logging the user out everywhere. A proper fix needs the tab that wins the race to broadcast its new access token to the others (e.g. `BroadcastChannel`) rather than each tab always refreshing for itself — a change to `TokenStorageService`'s and this coordinator's cross-tab story, not a one-line patch, so it's left as a follow-up rather than expanded into this change.

## Error normalization

A `ProblemDetail` TypeScript interface (`status`, `title`, `detail`, `type`, `instance`, `traceId`, plus an index signature for the occasional extra property like `fieldErrors`) and a small `errorInterceptor`/mapping function that turns any caught `HttpErrorResponse` whose body matches that shape into a typed value, so every feature built on top (2.2–2.6) consumes one consistent error shape instead of each parsing raw HTTP errors itself.

## Routing shell

Two top-level route groups in `app.routes.ts`:

- A public group (no layout component wrapping it) containing `/verify/:code` (component lands in 2.6; this change only reserves the route and a placeholder) and later `/login`.
- An authenticated shell route (a layout component with Material nav, wrapping child routes) that later features nest under. No `authGuard` yet — added in 2.2, alongside the login page it protects — but the route structure is shaped so adding the guard later is a one-line `canActivate` addition, not a restructuring.

## Package layout

```
frontend/
├── src/app/
│   ├── core/           http layer: api base config, ProblemDetail type, both interceptors, token storage service
│   ├── shared/          (empty scaffold — populated by later features)
│   ├── features/         (empty scaffold — populated by later features)
│   ├── layout/          authenticated shell component (nav, Material toolbar/sidenav)
│   ├── app.routes.ts
│   └── app.config.ts    provideHttpClient(withInterceptors([...])), provideRouter(...)
├── src/styles/
│   ├── _tokens.scss
│   └── _material-overrides.scss
└── src/styles.scss       mat.theme(...) fed from _tokens.scss
```
