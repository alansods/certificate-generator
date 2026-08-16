# batch-import Specification

## Purpose
Lets an authenticated user issue many certificates at once from a CSV file, validating each row independently so one bad row does not block the rest.

## Requirements

### Requirement: CSV batch upload
The system SHALL accept a CSV file of certificate rows, validate each row independently, and create a certificate for every valid row.

#### Scenario: Mixed valid and invalid rows
- **WHEN** an authenticated user sends POST /api/v1/certificates/batch with a CSV containing both valid and invalid rows
- **THEN** the response is 200 with `totalRows`, `successCount`, `errorCount` and an `errors` array, and a certificate is created for every valid row

### Requirement: Batch upload size limit
The system SHALL reject a CSV upload that exceeds a configured maximum file size or maximum row count with a 4xx response before processing any row, to protect the free-tier host from resource exhaustion.

#### Scenario: Oversized upload
- **WHEN** an authenticated user sends POST /api/v1/certificates/batch with a CSV exceeding the configured maximum file size or row count
- **THEN** the response is 4xx, no rows are processed, and no certificates are created

### Requirement: Per-row error reporting
The system SHALL report each invalid row's line number and reason without aborting the rest of the batch.

#### Scenario: Row with a missing field
- **WHEN** a CSV row is missing a required column value
- **THEN** that row's line number and validation reason appear in the `errors` array, and rows after it are still processed

### Requirement: Sample CSV template
The system SHALL provide a downloadable sample CSV whose header matches the documented column order exactly.

#### Scenario: Template download
- **WHEN** an authenticated user sends GET /api/v1/certificates/batch/template.csv
- **THEN** the response is a CSV whose header row is `recipient_name,recipient_email,course_name,workload_hours,completion_date,issue_date,instructor_name,template`

### Requirement: Batch import audit record
The system SHALL persist a record of every batch import with its filename, total rows, success count, error count, and the full per-row error detail returned in the response.

#### Scenario: Successful batch is recorded
- **WHEN** a CSV batch import completes, regardless of how many rows failed
- **THEN** a `batch_imports` row is stored with the uploading user, filename, `totalRows`, `successCount`, `errorCount`, and an `errors_json` value matching the `errors` array returned in the response
