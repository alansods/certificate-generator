## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Error report download
The system SHALL let a user save the failed rows of an import as a CSV file, generated from the import response without a further request.

#### Scenario: Downloading the error report
- **WHEN** an import result has failed rows and the user selects the error report action
- **THEN** a CSV containing one row per failure, with its line number and reason, is saved to disk

#### Scenario: No failures
- **WHEN** an import result has no failed rows
- **THEN** no error report action is offered
