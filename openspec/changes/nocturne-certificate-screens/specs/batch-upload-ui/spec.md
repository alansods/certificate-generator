## MODIFIED Requirements

### Requirement: Sample CSV template download
The system SHALL let a user download the sample CSV template from the batch upload page, and SHALL report a failed download rather than appearing to do nothing.

#### Scenario: Downloading the template
- **WHEN** a user selects the "Download sample CSV" action
- **THEN** the file at `GET /api/v1/certificates/batch/template.csv` is downloaded

#### Scenario: The template cannot be downloaded
- **WHEN** the sample CSV request fails
- **THEN** a message says so, rather than the action appearing to do nothing

### Requirement: Per-row import result display
The system SHALL display the batch import result without treating partial row failures as an upload failure, presenting the total, created and failed counts as three distinct figures.

#### Scenario: All rows valid
- **WHEN** the batch import response has `errorCount: 0`
- **THEN** the page shows `totalRows`, `successCount` and a failed count of zero as separate labelled figures, a success treatment, and no error list

#### Scenario: Some rows invalid
- **WHEN** the batch import response has `errorCount > 0`
- **THEN** the page shows `totalRows`, `successCount` and `errorCount` as separate labelled figures, and a list giving each failed row's line number and reason, sorted by line number

#### Scenario: Navigating to the imported certificates
- **WHEN** a user selects the action to view the imported certificates
- **THEN** the application navigates to the certificate list

### Requirement: CSV file selection and upload
The system SHALL let an authenticated user pick a local CSV file, by dropping it on the upload area or through the file picker, and submit it to the batch import endpoint, reporting the upload's progress while it is in flight.

#### Scenario: Selecting a file enables the upload action
- **WHEN** a user selects a `.csv` file via the file picker
- **THEN** the filename is shown and the upload action becomes enabled

#### Scenario: Dropping a file on the upload area
- **WHEN** a user drops a CSV file on the upload area
- **THEN** that file is taken as the selected file, exactly as if it had been chosen through the picker

#### Scenario: Dropping something that is not a CSV
- **WHEN** a user drops a file that is not a CSV on the upload area
- **THEN** it is refused with a message, and nothing is sent — the drop area constrains what it accepts to the same thing the file picker does

#### Scenario: Submitting the selected file
- **WHEN** a user submits a selected file
- **THEN** the file is sent as `multipart/form-data` to `POST /api/v1/certificates/batch` and an in-progress state is shown until the response arrives

#### Scenario: Upload progress is reported
- **WHEN** the upload is in flight and the request's total size is known
- **THEN** the proportion already sent is shown as a progress bar carrying that value, rather than an undifferentiated wait

#### Scenario: Progress is unavailable
- **WHEN** the upload is in flight and the total size is not known
- **THEN** an indeterminate in-progress treatment is shown, and no progress value is claimed

## ADDED Requirements

### Requirement: Error report download
The system SHALL let a user save the failed rows of an import as a CSV file, generated from the import response without a further request.

#### Scenario: Downloading the error report
- **WHEN** an import result has failed rows and the user selects the error report action
- **THEN** a CSV containing one row per failure, with its line number and reason, is saved to disk

#### Scenario: No failures
- **WHEN** an import result has no failed rows
- **THEN** no error report action is offered

#### Scenario: A reason a spreadsheet would execute
- **WHEN** a failure reason begins with a character that spreadsheet software treats as the start of a formula
- **THEN** it is written so the spreadsheet reads it as text, since the report is opened in Excel or Sheets by whoever produced the file
