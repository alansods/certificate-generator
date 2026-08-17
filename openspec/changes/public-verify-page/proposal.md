## Why

Backlog item 2.6 (`docs/PLAN.md`), the last frontend item. The backend's `public-verification` capability (`GET /api/v1/public/verify/{code}`) has existed since `feat/public-verification`, and the QR code embedded in every certificate PDF already points at the frontend route `/verify/{code}` (`docs/api-reference.md`) — but that route currently renders `PlaceholderComponent`. Anyone scanning a certificate's QR code today lands on a "coming soon" stub.

## What Changes

A new page (`features/verification/pages/verify-page/`) replacing the placeholder at the existing `verify/:code` route (already outside the authenticated shell and its guard, unauthenticated by design): looks up the code against `GET /api/v1/public/verify/{code}` and renders one of four states — found-and-valid (`ISSUED`), found-but-revoked (`REVOKED`), found-but-not-yet-issued (`DRAFT`), or not found (404) — plus a rate-limited state (429) distinct from a generic error, matching the backend's own distinct handling of each case.

## Capabilities

### New Capabilities
- `public-verify-page` — the verification lookup page and its states. See `specs/public-verify-page/spec.md`.

### Modified Capabilities
_None._ Consumes `openspec/specs/public-verification/spec.md`'s existing endpoint as-is.

## Impact

- Adds `frontend/src/app/features/verification/pages/verify-page/` and `frontend/src/app/features/verification/data/`.
- `app.routes.ts`: swaps `PlaceholderComponent` for `VerifyPageComponent` on the existing `verify/:code` route (still in the public group, no `authGuard`, no `ShellComponent`).
- No backend impact.
