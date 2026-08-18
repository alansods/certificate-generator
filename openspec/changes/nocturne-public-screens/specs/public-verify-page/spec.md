## ADDED Requirements

### Requirement: Code entry on the public page
The system SHALL let a visitor look up a certificate by typing its code on the public verification page, in addition to arriving with the code in the URL.

#### Scenario: Visitor opens the page without a code
- **WHEN** a visitor navigates to `/verify`
- **THEN** the page renders with an empty code field and no result, and does not call the verification API

#### Scenario: Visitor submits a code
- **WHEN** a visitor types a well-formed code and submits the form
- **THEN** the application navigates to `/verify/{code}` and the result for that code is shown

#### Scenario: Visitor arrives with a code in the URL
- **WHEN** a visitor navigates to `/verify/{code}`
- **THEN** the code field is pre-filled with that code and the lookup runs without further interaction

#### Scenario: Malformed code is rejected before the request
- **WHEN** a visitor submits a code that does not match the `CERT-XXXX-XXXX` shape
- **THEN** an inline message explains the expected format, and no verification request is made

### Requirement: In-flight lookup state
The system SHALL show that a lookup is running, naming the code being checked.

#### Scenario: Lookup is pending
- **WHEN** a verification request is in flight
- **THEN** the page shows a spinner and the code being checked, and neither a result nor an error

## MODIFIED Requirements

### Requirement: Revoked certificates are shown, not hidden
The system SHALL display a revoked certificate's details rather than treating a revoked code as unknown, and SHALL mark the result as revoked while keeping every field readable.

#### Scenario: Revoked certificate
- **WHEN** a visitor verifies the code of a revoked certificate
- **THEN** the page shows a revoked status treatment in the revoked semantic color, and the recipient, course, workload and issue date remain visible, de-emphasized rather than removed
