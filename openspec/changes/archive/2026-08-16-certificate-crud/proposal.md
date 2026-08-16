## Why

Backlog item 1.3 (`docs/PLAN.md`). The `certificates` capability is already fully specified in `openspec/specs/certificates/spec.md`. `feat/jwt-auth` (1.2) gave us an authenticated principal and role enforcement; this change is the first thing that actually uses them for real business data.

## What Changes

Implement the `certificates` capability end to end against its existing baseline spec: entity, repository, service, controller, Bean Validation, pagination/search, and a unique unguessable code generator. `POST /api/v1/certificates`, `GET /api/v1/certificates`, `GET /api/v1/certificates/{id}`, `PUT /api/v1/certificates/{id}`, `DELETE /api/v1/certificates/{id}` (`ADMIN` only).

Out of scope, per the spec and `docs/PLAN.md`'s phase split: PDF generation (`feat/certificate-pdf`, 1.4), the public verification endpoint (`feat/public-verification`, 1.5), and CSV batch import (`feat/batch-csv-import`, 1.6). This change only builds the record CRUD those three build on top of.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ Every requirement this change implements already exists in `openspec/specs/certificates/spec.md`. `skip_specs: true` in `.openspec.yaml`, same as `feat/jwt-auth`.

## Impact

- Adds `backend/src/main/java/com/certificategenerator/certificate/` (entity, repository, service, controller, dto, mapper, code generator).
- Adds `backend/src/main/resources/db/migration/V3__certificates.sql`.
- `SecurityConfig` gains one HTTP-method-specific rule: `DELETE /api/v1/certificates/**` requires `ADMIN`; every other `/api/v1/certificates/**` route just needs to be authenticated (any role), per the spec's "Shared certificate visibility" requirement.
- No frontend impact yet (`feat/certificate-list`/`feat/certificate-form`, 2.3/2.4, consume this).
