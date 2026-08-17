## Why

Backlog item 2.5 (`docs/PLAN.md`). The backend's `batch-import` capability (`POST /certificates/batch`, `GET /certificates/batch/template.csv`) has existed since `feat/batch-csv-import` with no frontend surface — an authenticated user currently has no way to issue certificates in bulk except one-by-one through `certificate-form`.

## What Changes

A new page (`features/certificates/pages/batch-upload-page/`) at `/certificates/batch`: a CSV file picker restricted to `.csv`, an upload action that posts the file as `multipart/form-data` to `POST /api/v1/certificates/batch`, and a result view showing `totalRows`/`successCount`/`errorCount` plus a table of per-row errors (`line`, `reason`) for any rows that failed — mirroring the backend's "process every valid row independently" behavior rather than treating any row failure as a whole-upload failure. A "Download sample CSV" action fetches `GET /api/v1/certificates/batch/template.csv` as a blob and saves it, so a user always has the exact expected column order at hand before their first upload. The list page gains a link to this new route.

## Capabilities

### New Capabilities
- `batch-upload-ui` — CSV upload, per-row result reporting, sample template download. See `specs/batch-upload-ui/spec.md`.

### Modified Capabilities
_None._ Consumes `openspec/specs/batch-import/spec.md`'s existing endpoints as-is.

## Impact

- Adds `frontend/src/app/features/certificates/pages/batch-upload-page/`.
- Extends `features/certificates/data/certificates.api.ts` with `uploadBatch(file)` and `downloadTemplate()`; adds `features/certificates/data/batch-import-response.ts` for the response shape.
- `app.routes.ts`: adds `certificates/batch` to the authenticated shell's children.
- `certificate-list-page.component.ts`/`.html`: adds a "Batch upload" link.
- No backend impact.
