## 1. Dependencies and migration

- [x] 1.1 Add `org.apache.commons:commons-csv` to `backend/pom.xml`.
- [x] 1.2 Add `V4__batch_imports.sql`: `batch_imports` table (`id`, `user_id` FK, `filename`, `total_rows`, `success_count`, `error_count`, `errors_json` TEXT, `created_at`), per `docs/PLAN.md`'s domain model.

## 2. Batch import capability

- [x] 2.1 Add `certificate/batch/BatchImport` entity + `BatchImportRepository`.
- [x] 2.2 Add `certificate/batch/dto/BatchRowError` (`line`, `reason`) and `dto/BatchImportResponse` (`totalRows`, `successCount`, `errorCount`, `errors`).
- [x] 2.3 Add `certificate/batch/BatchTooManyRowsException`, mapped to 400 in `GlobalExceptionHandler`.
- [x] 2.4 Add a handler for Spring's `MaxUploadSizeExceededException`, mapped to 413, in `GlobalExceptionHandler`.
- [x] 2.5 Add `certificate/batch/BatchImportService`: parses the CSV with Commons CSV, rejects (400) if row count exceeds `app.batch-import.max-rows` before processing any row, otherwise validates and creates a certificate per valid row (reusing `CertificateRequest` + the `Validator` bean + `CertificateService.create()`), collects per-row errors with line numbers, and persists a `BatchImport` audit row in its own transaction after processing completes.
- [x] 2.6 Add `backend/src/main/resources/csv/certificate-batch-template.csv` with exactly the header row from `docs/api-reference.md`.
- [x] 2.7 Add `POST /api/v1/certificates/batch` and `GET /api/v1/certificates/batch/template.csv` to `CertificateController`.
- [x] 2.8 Add `app.batch-import.max-rows` and `spring.servlet.multipart.max-file-size` to `application.yml`.

## 3. Tests

- [x] 3.1 `BatchImportServiceTest` (unit): all-valid CSV, mixed valid/invalid rows (line numbers correct), all-invalid CSV, row-count-exceeded rejects before creating anything, audit row persisted with matching counts and `errors_json`.
- [x] 3.2 `CertificateControllerTest` additions (`@WebMvcTest` slice): 200 shape for `/batch`, template download returns the exact header.
- [x] 3.3 `BatchImportIntegrationTest` (full context + Testcontainers): authenticated multipart upload with mixed rows creates only the valid certificates and returns matching counts/errors; anonymous request is 401; oversized file is 413 with nothing created; row-count-exceeded is 400 with nothing created; template download returns the documented header exactly.

## 4. Verification

- [x] 4.1 `cd backend && ./mvnw verify` green.
- [x] 4.2 `openspec validate batch-csv-import --type change --strict` passes.
