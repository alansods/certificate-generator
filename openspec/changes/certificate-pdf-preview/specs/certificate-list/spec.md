## MODIFIED Requirements

### Requirement: Row actions
The system SHALL let any authenticated user preview or download a certificate's PDF from its row, and SHALL let only an ADMIN delete a certificate from its row.

#### Scenario: Preview PDF
- **WHEN** a user selects the preview action on a row
- **THEN** the user is taken to that certificate's preview page, which requests `GET /api/v1/certificates/{id}/pdf` and renders the certificate's actual PDF inline, not immediately saved to disk

#### Scenario: Download from the preview page
- **WHEN** a user selects the download action on the preview page
- **THEN** the previewed PDF is saved to disk

#### Scenario: Preview fetch fails
- **WHEN** the certificate or PDF request made by the preview page fails
- **THEN** the page shows an error message instead of a blank or stuck-loading state

#### Scenario: Download PDF
- **WHEN** a user selects the download action on a row (not the preview action)
- **THEN** `GET /api/v1/certificates/{id}/pdf` is requested and the returned file is saved to disk directly, without navigating to the preview page

#### Scenario: Delete as ADMIN
- **WHEN** an ADMIN selects the delete action on a row and confirms
- **THEN** `DELETE /api/v1/certificates/{id}` is requested and, on success, the row is removed from the table

#### Scenario: Delete action hidden for non-admins
- **WHEN** a non-ADMIN user views the table
- **THEN** no delete action is rendered on any row
