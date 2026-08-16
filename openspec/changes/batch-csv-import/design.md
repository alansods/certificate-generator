## Context

`openspec/specs/batch-import/spec.md` fixes the external contract. This document covers implementation choices.

## CSV parsing

Apache Commons CSV (new dependency) rather than hand-rolling a splitter: correctly handles quoted fields containing commas (a recipient's course name easily contains one), is a single well-known dependency, and its `CSVParser`/`CSVRecord` API gives line numbers for free, which the spec requires in every error entry.

## Row validation — reuse, don't reimplement

Each CSV row is parsed into the existing `CertificateRequest` record (constructed manually, not via Jackson — CSV fields need their own type coercion first: `Integer.parseInt` for `workloadHours`, `LocalDate.parse` for the two date columns, `CertificateTemplate.valueOf` for the template column, all wrapped so a bad value produces a row error instead of a request-ending exception) and then validated by the existing `jakarta.validation.Validator` bean — the same `@NotBlank`/`@Email`/`@Positive`/etc. constraints already enforced on `POST /api/v1/certificates` apply identically here, so the two entry points can never silently diverge on what counts as a valid certificate. A row that fails type coercion OR bean validation is recorded as an error with its 1-based line number (header row is line 1, so the first data row is line 2, matching what a user sees if they open the CSV in a spreadsheet) and reason; the loop continues to the next row either way.

## Per-row transaction isolation

`CertificateService.create()` is already `@Transactional` on its own. `BatchImportService`'s orchestrating method deliberately does **not** carry `@Transactional` itself: if it did, Spring would enroll every `create()` call in one outer transaction, and one row's failure (or the retry-exhausted `DataIntegrityViolationException` `create()` already handles) could mark the whole transaction rollback-only, silently discarding certificates that had already "succeeded" from the caller's point of view. Letting each `create()` keep its own transaction boundary means a failure on row 50 can never undo rows 1-49 — matching the spec's explicit requirement that one bad row doesn't block the rest.

## Size and row-count limits

Two independent guards, both enforced before any row is created:

- **File size**: `spring.servlet.multipart.max-file-size` (Spring's own multipart resolver rejects an oversized upload with `MaxUploadSizeExceededException` before the controller method even runs) — mapped to 413 in `GlobalExceptionHandler`.
- **Row count**: not something Spring's multipart layer knows about, so `BatchImportService` counts data rows immediately after parsing the CSV (before validating or creating any of them) and throws a new `BatchTooManyRowsException` — mapped to 400 — if it exceeds `app.batch-import.max-rows`. No certificates are created and no audit row is persisted for this case (see below).

## Audit record — only for batches that actually ran

The `batch_imports` audit requirement's own scenario is "a CSV batch import **completes**, regardless of how many rows failed" — i.e. it made it through the row-count gate and was actually processed, not that literally every HTTP request (including a flatly oversized upload rejected before parsing) gets an audit row. An audit row is persisted once, after the full batch is processed, inside its own transaction (separate from the per-row `create()` transactions), so an unrelated failure while persisting the audit record can never retroactively undo certificates already committed.

`errors_json` is a `TEXT` column holding the same error list serialized with the already-available `tools.jackson.databind.ObjectMapper` (Jackson 3, used elsewhere for `RestAccessDeniedHandler`/`RestAuthenticationEntryPoint`) — not a queryable `jsonb` column, since nothing in the spec or `docs/PLAN.md` requires querying into it; it exists purely as a debugging/audit trail.

## Sample CSV template

A static resource file (`backend/src/main/resources/csv/certificate-batch-template.csv`) containing exactly the header row from `docs/api-reference.md`, streamed byte-for-byte by `GET /api/v1/certificates/batch/template.csv`. A static file (checked into the repo, reviewable in a PR like the PDF templates) rather than building the header string in code keeps the single source of truth for "what the expected CSV looks like" as a file a non-engineer owner could also open and read.

## Package layout

```
com.certificategenerator.certificate.batch
├── BatchImport                 entity (batch_imports table)
├── BatchImportRepository
├── BatchImportService           parse, validate, create, audit
├── BatchTooManyRowsException     -> 400
└── dto/
    ├── BatchImportResponse       {totalRows, successCount, errorCount, errors[]}
    └── BatchRowError             {line, reason}
```

`CertificateController` gains the two new endpoints directly (injecting `BatchImportService`), matching the existing precedent of `GET /{id}/pdf` living on `CertificateController` rather than a separate controller.
