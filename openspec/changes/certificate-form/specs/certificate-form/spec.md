## ADDED Requirements

### Requirement: Create a certificate
The system SHALL provide a form that creates a certificate via `POST /api/v1/certificates` and navigates to the certificate list on success.

#### Scenario: Valid submission
- **WHEN** a user submits the create form with valid values
- **THEN** the certificate is created and the user is navigated back to the certificate list

#### Scenario: Server-side validation failure
- **WHEN** the backend rejects the submission with a 400 and field errors
- **THEN** each field error is shown next to its corresponding form control, and the user remains on the form

### Requirement: Edit an existing certificate
The system SHALL provide a form, pre-filled from `GET /api/v1/certificates/{id}`, that updates a certificate via `PUT /api/v1/certificates/{id}`.

#### Scenario: Loading an existing certificate
- **WHEN** a user navigates to the edit form for an existing certificate
- **THEN** the form is pre-filled with that certificate's current values

#### Scenario: Saving an edit
- **WHEN** a user submits the edit form with valid changes
- **THEN** the certificate is updated and the user is navigated back to the certificate list

### Requirement: Client-side validation matches backend constraints
The system SHALL validate required fields, email format, and positive workload hours before allowing submission, mirroring the backend's own constraints.

#### Scenario: Invalid input blocks submission
- **WHEN** a user attempts to submit the form with a missing required field, a malformed email, or a non-positive workload hours value
- **THEN** submission is blocked and an inline validation message is shown, without a request being sent

### Requirement: Template preview
The system SHALL show a visual preview distinguishing the three certificate templates (`CLASSIC`, `MODERN`, `MINIMAL`) as part of template selection.

#### Scenario: Selecting a template
- **WHEN** a user selects a template option
- **THEN** a preview reflecting that template's visual style is shown

### Requirement: Delete confirmation from the edit form
The system SHALL let a user delete the certificate being edited, with confirmation, from the edit form itself.

#### Scenario: Confirmed delete
- **WHEN** a user selects delete on the edit form and confirms
- **THEN** the certificate is deleted and the user is navigated back to the certificate list
