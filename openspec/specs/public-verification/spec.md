# public-verification Specification

## Purpose
Lets anyone confirm that a certificate is genuine by its public code, without authentication, while exposing only the minimum information needed to verify it.

## Requirements

### Requirement: Public certificate lookup
The system SHALL let any client, authenticated or not, look up a certificate by its public code and receive only recipient name, course name, workload hours, issue date and status.

#### Scenario: Valid code
- **WHEN** a client sends GET /api/v1/public/verify/{code} for a code that exists
- **THEN** the response is 200 with `recipientName`, `courseName`, `workloadHours`, `issueDate` and `status`

#### Scenario: Unknown code
- **WHEN** a client sends GET /api/v1/public/verify/{code} for a code that does not exist
- **THEN** the response is 404

### Requirement: Revoked certificates remain verifiable
The system SHALL return a revoked certificate's status as `REVOKED` with a 200 response rather than treating it as not found.

#### Scenario: Revoked code
- **WHEN** a client sends GET /api/v1/public/verify/{code} for a code whose certificate has `status: REVOKED`
- **THEN** the response is 200 with `status: REVOKED`

### Requirement: No sensitive data in public responses
The system SHALL never include the recipient's email or any internal identifier in a public verification response.

#### Scenario: Response body is minimal
- **WHEN** a client sends GET /api/v1/public/verify/{code} for any existing code
- **THEN** the response body contains no `recipientEmail` field and no internal database id

### Requirement: Public verification rate limiting
The system SHALL rate limit repeated verification lookups per client IP, since the endpoint is unauthenticated and could otherwise be scraped or used to enumerate codes.

#### Scenario: Threshold exceeded
- **WHEN** the number of verification requests from the same IP exceeds the configured threshold within the configured window
- **THEN** further requests from that IP return 429 until the window elapses
