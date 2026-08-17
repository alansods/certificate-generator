## 1. Data layer

- [x] 1.1 `features/certificates/data/batch-import-response.ts`: `BatchRowError` (`line`, `reason`), `BatchImportResponse` (`totalRows`, `successCount`, `errorCount`, `errors`), matching the backend DTOs exactly.
- [x] 1.2 `certificates.api.ts`: add `uploadBatch(file: File)` (multipart POST) and `downloadTemplate()` (blob GET).

## 2. Batch upload page

- [x] 2.1 `batch-upload-page.component.ts`: file-picker/uploading/result states via signals; `upload()` posts the selected file and stores the response; `reset()` returns to the picker state.
- [x] 2.2 Result view: `totalRows`/`successCount`/`errorCount` summary, and — when `errorCount > 0` — a table of per-row `line`/`reason`, sorted by line.
- [x] 2.3 Error path: a genuine HTTP error (4xx size/row-count guard, 5xx) shown via the existing `toProblemDetail()` pattern, distinct from a 200 with row-level errors.
- [x] 2.4 "Download sample CSV" action: fetch the template as a blob and save it via the same temporary-`<a>` pattern as `certificate-list-page.component.ts`'s `downloadPdf()`.
- [x] 2.5 `.html`/`.scss`: tokens only, `@if`/`@for` only, `OnPush`.

## 3. Routing and list-page wiring

- [x] 3.1 `app.routes.ts`: add `certificates/batch` to the authenticated shell's children.
- [x] 3.2 `certificate-list-page.component.ts`/`.html`: add a "Batch upload" link.

## 4. Tests

- [x] 4.1 `certificates.api.spec.ts` additions: `uploadBatch` posts multipart form data with the file under the `file` field to the right URL; `downloadTemplate` requests a blob from the right URL.
- [x] 4.2 `batch-upload-page.component.spec.ts`: selecting a file enables the upload button; a successful all-valid response shows the summary with no error table; a mixed response shows the summary and the per-row error table; a 4xx (oversized/too many rows) shows a single error message and no partial result; the sample-CSV download triggers a GET to the template endpoint.

## 5. Verification

- [x] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.2 `openspec validate batch-upload-ui --type change --strict` passes.
