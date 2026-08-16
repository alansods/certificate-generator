## Purpose
Renders a certificate as a downloadable, branded PDF entirely in memory, since the production host has no persistent disk to write intermediate files to.

## ADDED Requirements

### Requirement: PDF download
The system SHALL generate a certificate's PDF in memory and stream it to the client without writing to the filesystem.

#### Scenario: Authenticated download
- **WHEN** an authenticated user sends GET /api/v1/certificates/{id}/pdf for an existing certificate
- **THEN** the response is 200 with `Content-Type: application/pdf`, a `Content-Disposition: attachment` header, and a body starting with the `%PDF` signature

#### Scenario: Unknown certificate
- **WHEN** an authenticated user sends GET /api/v1/certificates/{id}/pdf for an id that does not exist
- **THEN** the response is 404 and no PDF is generated

### Requirement: Template selection
The system SHALL render the PDF using the Thymeleaf template that matches the certificate's `template` field (`CLASSIC`, `MODERN` or `MINIMAL`).

#### Scenario: Certificate carries a specific template
- **WHEN** a certificate with `template: MODERN` is downloaded as a PDF
- **THEN** the generated document is laid out using the `MODERN` template, not `CLASSIC` or `MINIMAL`

### Requirement: Embedded verification QR code
The system SHALL embed a QR code in the PDF that encodes the frontend verification URL for that certificate's code.

#### Scenario: QR encodes the verify route
- **WHEN** a certificate with code `CERT-7K2M-9XQ4` is downloaded as a PDF
- **THEN** the embedded QR code decodes to the frontend route `/verify/CERT-7K2M-9XQ4`

### Requirement: Embedded fonts
The system SHALL embed all fonts used in the PDF so the document renders identically regardless of the viewer's installed fonts.

#### Scenario: Generated PDF is self-contained
- **WHEN** a certificate PDF is generated
- **THEN** the PDF's font resources are embedded rather than referenced externally
