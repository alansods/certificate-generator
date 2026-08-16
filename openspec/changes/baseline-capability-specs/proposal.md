## Why

`docs/PLAN.md` already fixes the domain model, REST contract and free-tier constraints for this project, but none of that is yet expressed as OpenSpec requirements. Every later change (`feat/jwt-auth`, `feat/certificate-crud`, `feat/certificate-pdf`, `feat/public-verification`, `feat/batch-csv-import`, and their frontend counterparts) needs an existing baseline to diff against — `## MODIFIED Requirements` only makes sense once a `## ADDED Requirements` baseline exists. This change writes that baseline, once, before any implementation branch starts.

## What Changes

Introduce the five capability specs implied by `docs/PLAN.md` and `docs/api-reference.md`, each expressed as `The system SHALL ...` requirements with at least one scenario apiece. No application code is written or touched by this change — `backend/` and `frontend/` still do not exist. The specs describe the contract that Phase 1 and Phase 2 backlog items will implement against.

## Capabilities

### New Capabilities
- `auth`: login, refresh rotation, logout, current-user lookup, role-based authorization and login rate limiting.
- `certificates`: authenticated CRUD over certificates, including pagination, search, validation and admin-only deletion.
- `certificate-pdf`: in-memory PDF generation from the three Thymeleaf templates, streamed for download.
- `public-verification`: the public, unauthenticated lookup of a certificate by its code.
- `batch-import`: CSV batch issuing with per-row validation and error reporting.

## Impact

- Affected: `openspec/specs/` (five new capability folders).
- Not affected: no `backend/` or `frontend/` code exists yet; this is the contract those trees will be built against starting with `feat/backend-skeleton`.
