## Why

Backlog item 2.1 (`docs/PLAN.md`), the first frontend work in this project. Phase 0-1 (all backend) is fully merged. Nothing under `frontend/` exists yet. Every subsequent frontend item (2.2 login, 2.3 list, 2.4 form, 2.5 batch upload UI, 2.6 public verify page) needs a workspace, a routing shell, a themed component library, and a working HTTP layer to build on — this change is that foundation, not a user-facing feature by itself.

## What Changes

Scaffold the Angular 22 workspace: standalone-component routing shell with an authenticated layout group and a public route group (reserving `/verify/:code` for 2.6), Angular Material themed entirely from a single SCSS design-token file, and a typed HTTP layer in `core/` with two functional interceptors — one attaching the bearer access token to protected requests, one handling silent refresh-and-retry on 401 with deduplication across concurrent failures (the backend rotates refresh tokens on every use and treats a reused token as theft, revoking the whole session — see `design.md`). Every non-2xx response is normalized into a typed `ProblemDetail` object. This is new capability, not a spec that already exists: `openspec/specs/` has no frontend entries yet, so this change adds `specs/frontend-shell/spec.md` rather than using `skip_specs`.

No login page, no protected pages, no auth guard yet — those are 2.2. This change makes them possible.

## Capabilities

### New Capabilities
- `frontend-shell` — Angular workspace scaffold: routing shell, Material theming, HTTP layer and interceptors. See `specs/frontend-shell/spec.md`.

### Modified Capabilities
_None._

## Impact

- Creates `frontend/` (new Angular 22 workspace) at the repo root, alongside `backend/`.
- `docs/PLAN.md`'s repo layout already names `frontend/`; nothing else in `docs/` changes.
- No backend impact.
- `.github/workflows/ci.yml` already has a Frontend job guarded by an existence check (added early in the session before `frontend/` existed); this change is what makes that job start actually running instead of skipping.
