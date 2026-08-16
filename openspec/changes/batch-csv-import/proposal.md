## Why

Backlog item 1.6 (`docs/PLAN.md`). The `batch-import` capability is already fully specified in `openspec/specs/batch-import/spec.md`. Every certificate so far has to be created one at a time through `POST /api/v1/certificates`; this change lets an authenticated user issue a whole course cohort's certificates from a single CSV upload.

## What Changes

Implement the `batch-import` capability end to end against its existing baseline spec: an authenticated `POST /api/v1/certificates/batch` (`multipart/form-data` CSV) that validates each row independently, creates a certificate for every valid row, and returns `{totalRows, successCount, errorCount, errors[]}` where `errors[]` carries each bad row's line number and reason; a companion `GET /api/v1/certificates/batch/template.csv` returning the exact expected header; a configured maximum file size and row count enforced before any row is processed; and a `batch_imports` audit row persisted for every import (regardless of outcome) recording the uploading user, filename, counts, and the full error detail.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ Every requirement this change implements already exists in `openspec/specs/batch-import/spec.md`. `skip_specs: true`.

## Impact

- New Flyway migration for `batch_imports` (already named in `docs/PLAN.md`'s domain model).
- Adds `backend/src/main/java/com/certificategenerator/certificate/batch/` (entity, repository, service, DTOs) — mirrors the existing `certificate/pdf/` sub-package convention.
- Adds `POST /batch` and `GET /batch/template.csv` to the existing `CertificateController`, mirroring how the PDF endpoint (`GET /{id}/pdf`) was added there rather than as a separate controller.
- New dependency: Apache Commons CSV for parsing (see `design.md` for why, vs. hand-rolling a parser).
- New `app.batch-import.*` config (max file size, max rows) and a `spring.servlet.multipart.max-file-size` bound.
- `GlobalExceptionHandler` gains handlers for the new size/row-limit exceptions.
- No frontend impact yet (`feat/batch-upload-ui`, 2.5, consumes this).
