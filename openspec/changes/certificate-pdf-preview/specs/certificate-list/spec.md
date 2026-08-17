## MODIFIED Requirements

### Requirement: Row actions
The system SHALL let any authenticated user preview or download a certificate's PDF from its row, and SHALL let only an ADMIN delete a certificate from its row.

#### Scenario: Preview PDF
- **WHEN** a user selects the preview action on a row
- **THEN** `GET /api/v1/certificates/{id}/pdf` is requested and the certificate's actual PDF is rendered inline in a dialog, not immediately saved to disk

#### Scenario: Download from within the preview
- **WHEN** a user selects the download action inside the preview dialog
- **THEN** the previewed PDF is saved to disk

#### Scenario: Preview fetch fails
- **WHEN** the PDF request made by opening the preview fails
- **THEN** the dialog shows an error message and a way to close it, not a blank or stuck-loading dialog

#### Scenario: Download PDF
- **WHEN** a user selects the download action on a row (outside the preview dialog)
- **THEN** `GET /api/v1/certificates/{id}/pdf` is requested and the returned file is saved to disk directly, without opening the preview dialog

#### Scenario: Delete as ADMIN
- **WHEN** an ADMIN selects the delete action on a row and confirms
- **THEN** `DELETE /api/v1/certificates/{id}` is requested and, on success, the row is removed from the table

#### Scenario: Delete action hidden for non-admins
- **WHEN** a non-ADMIN user views the table
- **THEN** no delete action is rendered on any row
