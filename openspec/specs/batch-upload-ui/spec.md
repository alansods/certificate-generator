# batch-upload-ui Specification

## Purpose
TBD - created by archiving change batch-upload-ui. Update Purpose after archive.

## Requirements

### Requirement: CSV file selection and upload
The system SHALL let an authenticated user pick a local CSV file and submit it to the batch import endpoint.

#### Scenario: Selecting a file enables the upload action
- **WHEN** a user selects a `.csv` file via the file picker
- **THEN** the filename is shown and the upload action becomes enabled

#### Scenario: Submitting the selected file
- **WHEN** a user submits a selected file
- **THEN** the file is sent as `multipart/form-data` to `POST /api/v1/certificates/batch` and an in-progress state is shown until the response arrives

### Requirement: Per-row import result display
The system SHALL display the batch import result without treating partial row failures as an upload failure.

#### Scenario: All rows valid
- **WHEN** the batch import response has `errorCount: 0`
- **THEN** the page shows `totalRows` and `successCount`, and no error table

#### Scenario: Some rows invalid
- **WHEN** the batch import response has `errorCount > 0`
- **THEN** the page shows `totalRows`, `successCount`, `errorCount`, and a table listing each error's line number and reason, sorted by line number

### Requirement: Upload rejection is shown distinctly from a partial result
The system SHALL show a single error message, with no result summary, when the upload itself is rejected.

#### Scenario: Oversized file or too many rows
- **WHEN** the server responds with a 4xx to the batch upload request
- **THEN** the page shows a single error message and no `totalRows`/`successCount`/`errorCount` summary is displayed

### Requirement: Sample CSV template download
The system SHALL let a user download the sample CSV template from the batch upload page.

#### Scenario: Downloading the template
- **WHEN** a user selects the "Download sample CSV" action
- **THEN** the file at `GET /api/v1/certificates/batch/template.csv` is downloaded

### Requirement: Uploading another file after a result
The system SHALL let a user return to the file-picker state after seeing a result, without leaving the page.

#### Scenario: Uploading a second file
- **WHEN** a user has a result or error shown and starts a new upload
- **THEN** the page returns to the file-picker state and a new selection can be submitted
