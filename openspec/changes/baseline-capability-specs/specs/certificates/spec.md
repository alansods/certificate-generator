## Purpose
Lets an authenticated user manage the certificate records that back every downloaded PDF and every public verification lookup: create, list, search, retrieve, update and, for admins, delete.

## ADDED Requirements

### Requirement: Certificate creation
The system SHALL let an authenticated user create a certificate and assign it a unique public code.

#### Scenario: Valid payload
- **WHEN** an authenticated user sends POST /api/v1/certificates with a valid payload
- **THEN** the response is 201, the certificate is persisted, and it carries a newly generated unique `code`

#### Scenario: Missing required field
- **WHEN** an authenticated user sends POST /api/v1/certificates missing a required field (recipient name, recipient email, course name, workload hours, completion date, issue date, instructor name, or template)
- **THEN** the response is 400 with a problem-detail body identifying the invalid field, and no certificate is created

### Requirement: Certificate listing and search
The system SHALL return a paginated list of certificates, filterable by status and searchable by recipient name, course name and code.

#### Scenario: Search matches
- **WHEN** an authenticated user sends GET /api/v1/certificates?q=jane
- **THEN** the response is 200 with only certificates whose recipient name, course name or code contain "jane" (case-insensitive)

#### Scenario: Status filter
- **WHEN** an authenticated user sends GET /api/v1/certificates?status=REVOKED
- **THEN** the response is 200 with only certificates whose status is `REVOKED`

### Requirement: Certificate retrieval
The system SHALL return a single certificate by id to an authenticated user.

#### Scenario: Existing certificate
- **WHEN** an authenticated user sends GET /api/v1/certificates/{id} for an id that exists
- **THEN** the response is 200 with the full certificate

#### Scenario: Unknown certificate
- **WHEN** an authenticated user sends GET /api/v1/certificates/{id} for an id that does not exist
- **THEN** the response is 404

### Requirement: Certificate update
The system SHALL let an authenticated user fully update an existing certificate.

#### Scenario: Valid update
- **WHEN** an authenticated user sends PUT /api/v1/certificates/{id} with a valid payload for an existing certificate
- **THEN** the response is 200 and the stored certificate reflects the new values

### Requirement: Certificate deletion
The system SHALL allow only an `ADMIN` to delete a certificate.

#### Scenario: Admin deletes an existing certificate
- **WHEN** an ADMIN sends DELETE /api/v1/certificates/{id} for an existing certificate
- **THEN** the certificate is removed and the response is 204

#### Scenario: Non-admin attempts deletion
- **WHEN** a USER sends DELETE /api/v1/certificates/{id}
- **THEN** the response is 403 and the certificate still exists

### Requirement: Unique certificate code
The system SHALL generate a certificate `code` that is unique across all certificates and never reassign it.

#### Scenario: Two certificates never collide
- **WHEN** two certificates are created, regardless of order or timing
- **THEN** their `code` values are different
