# certificate-form Specification

## Purpose
Lets an authenticated user create and edit a single certificate record through a form that validates client-side against the same constraints the backend enforces, and reach the template preview and PDF preview from it.

## Requirements

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
The system SHALL validate required fields, email format, and positive workload hours before allowing submission, mirroring the backend's own constraints, and SHALL summarize a blocked submission above the form as well as marking the fields themselves.

#### Scenario: Invalid input blocks submission
- **WHEN** a user attempts to submit the form with a missing required field, a malformed email, or a non-positive workload hours value
- **THEN** submission is blocked and an inline validation message is shown, without a request being sent

#### Scenario: A blocked submission is summarized
- **WHEN** a submission is blocked by validation
- **THEN** a notice above the form says the highlighted fields need attention, alongside — not instead of — the per-field messages

#### Scenario: No summary before a submission is attempted
- **WHEN** the form is shown and nothing has been submitted yet
- **THEN** no validation summary is present, however many fields are still empty

### Requirement: Template preview
The system SHALL present the three certificate templates (`CLASSIC`, `MODERN`, `MINIMAL`) as selectable cards, each showing a page-proportioned thumbnail of that template's own layout, so the templates can be compared without generating a PDF.

#### Scenario: Template options are shown
- **WHEN** a user reaches the template section of the form
- **THEN** all three templates are shown side by side, each with a thumbnail in the printed page's aspect ratio that reflects that template's distinct layout

#### Scenario: Selecting a template
- **WHEN** a user selects a template card
- **THEN** that card is marked as selected, the form control takes that template's value, and the other cards are left unselected

#### Scenario: Keyboard selection
- **WHEN** a user moves keyboard focus onto the template cards and activates one
- **THEN** the focused card shows a visible focus ring and activating it selects that template

#### Scenario: The cards are one tab stop, not three
- **WHEN** a user tabs through the form
- **THEN** the template cards take a single tab stop, landing on the selected card, and the arrow keys move the selection between the cards, wrapping at either end

### Requirement: Delete confirmation from the edit form
The system SHALL let a user delete the certificate being edited, with confirmation, from the edit form itself.

#### Scenario: Confirmed delete
- **WHEN** a user selects delete on the edit form and confirms
- **THEN** the certificate is deleted and the user is navigated back to the certificate list

### Requirement: Open the PDF preview from the edit form
The system SHALL let a user open the saved certificate's PDF preview from its edit form.

#### Scenario: Preview from the edit form
- **WHEN** a user selects the preview action on the edit form of an existing certificate
- **THEN** the application navigates to that certificate's preview page

#### Scenario: Preview is not offered while creating
- **WHEN** a user is on the create form, before any certificate exists
- **THEN** no preview action is offered
