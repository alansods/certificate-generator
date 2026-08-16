## Why

Backlog item 1.5 (`docs/PLAN.md`). The `public-verification` capability is already fully specified in `openspec/specs/public-verification/spec.md`. `feat/certificate-pdf` (1.4) already embeds a QR code pointing at this endpoint's frontend counterpart; this change is what makes that QR code (and the printed code on any certificate) actually resolve to something.

## What Changes

Implement the `public-verification` capability end to end against its existing baseline spec: an unauthenticated `GET /api/v1/public/verify/{code}` returning only `recipientName`, `courseName`, `workloadHours`, `issueDate` and `status`; revoked certificates verify with `status: REVOKED` rather than 404; rate limited per client IP.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ Every requirement this change implements already exists in `openspec/specs/public-verification/spec.md`. `skip_specs: true`.

## Impact

- Adds `backend/src/main/java/com/certificategenerator/verification/` (controller, service, dto).
- Extracts the client-IP-resolution logic already in `AuthController` into a shared `web/ClientIpResolver`, reused by both — see `design.md` for why this is a refactor worth doing now rather than duplicating the (security-relevant) decision to ignore `X-Forwarded-For`.
- `SecurityConfig` gains `/api/v1/public/**` to its `permitAll` list.
- `application*.yml` gains `app.rate-limit.verify.*`.
- No frontend impact yet (`feat/public-verify-page`, 2.6, consumes this).
