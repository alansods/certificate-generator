## Context

`certificate-form`'s design.md fixed the single-certificate create/edit flow. This document covers the bulk path on top of the same `certificates.api.ts` and `openspec/specs/batch-import/spec.md` backend contract.

## One page, three states: pick, uploading, result

`BatchUploadPageComponent` renders a file picker while no upload is in flight, a spinner while `POST /certificates/batch` is pending, and a result summary once the response lands — modeled with plain signals (`selectedFile`, `uploading`, `result`, `error`), not `rxResource`, since this is a one-shot user-triggered action rather than a data fetch tied to route/query state (the pattern `rxResource` was chosen for in `certificate-list`). After a result is shown, the user can upload another file, which resets back to the picker state.

## File input, not a native form submit

A plain `<input type="file" accept=".csv">` bound via a `(change)` handler storing the selected `File` in a signal, with an explicit "Upload" button rather than auto-submitting on selection — gives the user a chance to change their mind (or see the filename before committing) and keeps a hook for a future drag-and-drop enhancement without changing the model. `FormData` is built directly in `certificates.api.ts`'s `uploadBatch(file)` (`formData.append("file", file)`, matching the backend's `@RequestParam("file")`), not through Angular's reactive forms — there's no validation state a `FormControl` would add value to here beyond what the native `accept` attribute and the disabled-until-selected upload button already give.

## Every row failure is not an upload failure

Per `batch-import`'s spec, a response with `errorCount > 0` is still a `200` — the batch partially succeeded. The page never treats a non-empty `errors[]` as an HTTP error path; it always renders the same result view with `totalRows`/`successCount`/`errorCount` and, when `errors.length > 0`, a table of `line`/`reason` pairs sorted by line number. Only a genuine HTTP error (4xx from the size/row-count guard, or a 5xx) goes through the existing `toProblemDetail()` path used by every other page in this project, shown as a single error message with no partial result.

## Sample template — a real download, not a generated blob

`downloadTemplate()` fetches the actual file the backend serves (`GET /certificates/batch/template.csv`, `responseType: "blob"`), then triggers a save exactly the way `certificate-list-page.component.ts`'s `downloadPdf()` already does (temporary `<a>` appended to the DOM, `.click()`, removed, `URL.revokeObjectURL` deferred via `setTimeout(...,0)`) — reusing that established, already-review-fixed pattern rather than inventing a second one.

## No client-side size/row-count pre-check

The backend enforces a 2MB max file size and a max row count (`application.yml`, `BatchImportService`) and returns a 4xx before processing any row on violation. The upload button does not duplicate that limit client-side (unlike `certificate-form`'s field validators, which do mirror the backend's per-field constraints) — a wrong or stale client-side copy of a size limit is worse than just letting the request go and showing the backend's own error message, and CSV file size is not the kind of thing a user benefits from fast feedback on before even trying.

## Package layout

```
frontend/src/app/features/certificates/pages/batch-upload-page/
├── batch-upload-page.component.ts
├── batch-upload-page.component.html
└── batch-upload-page.component.scss
```

`certificates.api.ts` (existing) gains `uploadBatch(file: File): Observable<BatchImportResponse>` and `downloadTemplate(): Observable<Blob>`. New `features/certificates/data/batch-import-response.ts` defines `BatchImportResponse`/`BatchRowError` matching the backend DTOs (`BatchImportResponse.java`, `BatchRowError.java`) exactly.
