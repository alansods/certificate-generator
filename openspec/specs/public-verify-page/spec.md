# public-verify-page Specification

## Purpose
Lets anyone, signed in or not, verify a certificate by its code from a public page, showing a valid, revoked, not-yet-issued, unknown or rate-limited result as clearly distinct outcomes rather than collapsing them into a single pass/fail.

## Requirements

### Requirement: Verified certificate display
The system SHALL display a found certificate's recipient name, course name, workload hours, issue date, and status.

#### Scenario: Valid issued certificate
- **WHEN** a visitor navigates to `/verify/{code}` for a code whose certificate has `status: ISSUED`
- **THEN** the page shows the recipient name, course name, workload hours, issue date, and a status indicator distinguishing it as valid

### Requirement: Revoked certificates are shown, not hidden
The system SHALL display a revoked certificate's details rather than treating a revoked code as unknown, and SHALL mark the result as revoked while keeping every field readable.

#### Scenario: Revoked certificate
- **WHEN** a visitor verifies the code of a revoked certificate
- **THEN** the page shows a revoked status treatment in the revoked semantic color, and the recipient, course, workload and issue date remain visible, de-emphasized rather than removed

### Requirement: Not-yet-issued certificates are shown distinctly
The system SHALL display a draft certificate's details with an indicator that it has not yet been issued.

#### Scenario: Draft certificate
- **WHEN** a visitor navigates to `/verify/{code}` for a code whose certificate has `status: DRAFT`
- **THEN** the page shows the certificate's details with an indicator that it is not yet issued

### Requirement: Unknown code shown as not found
The system SHALL show a clear "not found" message for a code that does not match any certificate, distinct from a generic error.

#### Scenario: Unknown code
- **WHEN** a visitor navigates to `/verify/{code}` for a code the backend returns 404 for
- **THEN** the page shows a message stating no certificate was found for that code

### Requirement: Rate limiting shown distinctly
The system SHALL show a distinct message when the verification lookup is rate limited, separate from a generic error or a not-found result.

#### Scenario: Too many requests
- **WHEN** a visitor navigates to `/verify/{code}` and the backend responds 429
- **THEN** the page shows a message indicating too many verification attempts and inviting a retry later, not a "not found" or generic error message

### Requirement: Code entry on the public page
The system SHALL let a visitor look up a certificate by typing its code on the public verification page, in addition to arriving with the code in the URL.

#### Scenario: Visitor opens the page without a code
- **WHEN** a visitor navigates to `/verify`
- **THEN** the page renders with an empty code field and no result, and does not call the verification API

#### Scenario: Visitor submits a code
- **WHEN** a visitor types a well-formed code and submits the form
- **THEN** the application navigates to `/verify/{code}` and the result for that code is shown

#### Scenario: Visitor re-submits the code already being shown
- **WHEN** a visitor submits the same code that is already in the URL
- **THEN** the lookup runs again, rather than navigating to an unchanged URL and appearing to do nothing

#### Scenario: Visitor arrives with a code in the URL
- **WHEN** a visitor navigates to `/verify/{code}`
- **THEN** the code field is pre-filled with that code and the lookup runs without further interaction

#### Scenario: Malformed code is rejected before the request
- **WHEN** a visitor submits a code that does not match the `CERT-XXXX-XXXX` shape
- **THEN** an inline message explains the expected format, and no verification request is made

#### Scenario: A code is normalized before it is checked
- **WHEN** a visitor submits a code in lower case, or arrives at a URL carrying one
- **THEN** it is upper-cased and trimmed before the shape check and before the request, so a shared link in any case resolves to the same certificate

#### Scenario: A malformed code arrives in the URL
- **WHEN** a visitor opens `/verify/{code}` with a code that does not match the shape
- **THEN** the page shows the same format message and makes no request, rather than reporting the code as not found

### Requirement: Sign-in is reachable from the public page
The system SHALL link the public verification page to the login screen.

#### Scenario: A signed-out operator wants the application
- **WHEN** a visitor selects the sign-in link on the public verification page
- **THEN** the application navigates to the login screen

### Requirement: In-flight lookup state
The system SHALL show that a lookup is running, naming the code being checked.

#### Scenario: Lookup is pending
- **WHEN** a verification request is in flight
- **THEN** the page shows a spinner and the code being checked, and neither a result nor an error
