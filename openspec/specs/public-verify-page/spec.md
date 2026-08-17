# public-verify-page Specification

## Purpose
TBD - created by archiving change public-verify-page. Update Purpose after archive.

## Requirements

### Requirement: Verified certificate display
The system SHALL display a found certificate's recipient name, course name, workload hours, issue date, and status.

#### Scenario: Valid issued certificate
- **WHEN** a visitor navigates to `/verify/{code}` for a code whose certificate has `status: ISSUED`
- **THEN** the page shows the recipient name, course name, workload hours, issue date, and a status indicator distinguishing it as valid

### Requirement: Revoked certificates are shown, not hidden
The system SHALL display a revoked certificate's details alongside a clear warning that it has been revoked, distinct from a valid certificate's display.

#### Scenario: Revoked certificate
- **WHEN** a visitor navigates to `/verify/{code}` for a code whose certificate has `status: REVOKED`
- **THEN** the page shows the certificate's details with a visually distinct revoked indicator, and the revoked status is not mistakable for a valid one

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
