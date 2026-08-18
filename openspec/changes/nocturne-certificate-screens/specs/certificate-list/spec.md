## ADDED Requirements

### Requirement: Preview page context and actions
The system SHALL identify the certificate being previewed and SHALL offer, alongside download, a way back to the list and a way to the certificate's edit form.

#### Scenario: Preview page identifies the certificate
- **WHEN** a user opens a certificate's preview page
- **THEN** the page shows that certificate's code, recipient name, course name and template alongside the rendered PDF

#### Scenario: Editing from the preview
- **WHEN** a user selects the edit action on the preview page
- **THEN** the application navigates to that certificate's edit form

#### Scenario: Returning to the list
- **WHEN** a user selects the back action on the preview page
- **THEN** the application navigates to the certificate list

#### Scenario: PDF is still being fetched
- **WHEN** the PDF request is in flight
- **THEN** a placeholder in the printed page's aspect ratio is shown with a message that the PDF is being generated, and the page layout does not shift when the document arrives
