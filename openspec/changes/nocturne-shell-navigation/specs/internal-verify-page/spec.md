## ADDED Requirements

### Requirement: In-app certificate lookup
The system SHALL let a signed-in user verify a certificate code without leaving the authenticated application, using the same public verification endpoint the recipient-facing page uses.

#### Scenario: Signed-in user verifies a code
- **WHEN** a signed-in user submits a well-formed code on the in-app verification page
- **THEN** `GET /api/v1/public/verify/{code}` is requested and the result is rendered inside the authenticated shell

#### Scenario: Malformed code is rejected before the request
- **WHEN** a signed-in user submits a code that does not match the `CERT-XXXX-XXXX` shape
- **THEN** an inline message explains the expected format, and no verification request is made

#### Scenario: Page is opened with nothing entered
- **WHEN** a signed-in user opens the in-app verification page
- **THEN** the form renders empty with no result and no request is made

### Requirement: Quick verification from the top bar
The system SHALL offer a code field in the authenticated top bar that opens the in-app verification page with that code already looked up.

#### Scenario: User submits a code from the top bar
- **WHEN** a signed-in user types a code into the top bar's verification field and submits it
- **THEN** the application navigates to the in-app verification page and the result for that code is shown without the user re-entering it

#### Scenario: Narrow viewport
- **WHEN** the viewport is narrower than the medium breakpoint
- **THEN** the top bar's verification field is not rendered and the in-app verification page remains reachable from the navigation

### Requirement: In-app lookup result states
The system SHALL render the in-app lookup's valid, revoked, not-yet-issued, not-found, in-flight and rate-limited outcomes distinctly from one another.

#### Scenario: Valid certificate
- **WHEN** the lookup returns a certificate that is issued and not revoked
- **THEN** the page shows a valid treatment in the issued semantic color with the code, recipient, course, workload and issue date

#### Scenario: Revoked certificate
- **WHEN** the lookup returns a revoked certificate
- **THEN** the page shows a revoked treatment in the revoked semantic color and keeps every detail field visible

#### Scenario: Unknown code
- **WHEN** the lookup returns 404
- **THEN** the page shows a not-found treatment naming the code that was checked, distinct from an error state

#### Scenario: Lookup is pending
- **WHEN** a lookup request is in flight
- **THEN** the page shows a spinner and the code being checked

#### Scenario: Rate limited
- **WHEN** the lookup returns 429
- **THEN** the page shows a rate-limited treatment asking the user to wait, distinct from a not-found result
