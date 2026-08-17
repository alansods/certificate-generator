## Why

Backlog item 2.3 (`docs/PLAN.md`). `feat/login-page` (2.2) made the authenticated shell actually require a session but left it with an empty route (`children: []`) and nothing to land on after logging in. This change gives the shell its first real page and its first `*.api.ts` service for the `certificates` domain.

## What Changes

A paginated Material table (`features/certificates/pages/certificate-list-page/`) backed by the existing `GET /api/v1/certificates` (page/size/sort/q/status), becoming the authenticated shell's default landing route. Debounced search, a status filter, per-row actions (PDF download for any authenticated user, delete for ADMIN only — gated by decoding the access token's role claim client-side for UI visibility; the backend remains the actual authorization boundary), and distinct empty/error states so a failed request or a genuinely empty result don't both look like "nothing happened."

## Capabilities

### New Capabilities
- `certificate-list` — paginated table, search, status filter, row actions, empty/error states. See `specs/certificate-list/spec.md`.

### Modified Capabilities
_None._ Consumes `openspec/specs/certificates/spec.md`'s existing endpoints as-is.

## Impact

- Adds `frontend/src/app/features/certificates/` (list page, `certificates.api.ts`, row-action components).
- `app.routes.ts`: the authenticated shell's `children` gains an index redirect to `certificates` and a `certificates` route rendering the list page.
- Adds a role claim to `TokenStorageService` (decoded from the access token JWT) so the UI can hide the delete action for non-admins — display-only; `DELETE /api/v1/certificates/{id}` already enforces ADMIN server-side regardless.
- No backend impact.
