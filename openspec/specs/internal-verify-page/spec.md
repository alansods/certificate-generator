# internal-verify-page Specification

## Purpose
Lets a signed-in user look up a certificate by its code from inside the authenticated shell, either from a dedicated page or the quick-verify field in the top bar, without leaving their session.

## Requirements

### Requirement: In-app certificate lookup
The system SHALL let a signed-in user verify a certificate code without leaving the authenticated application, using the same public verification endpoint the recipient-facing page uses.

#### Scenario: Signed-in user verifies a code
- **WHEN** a signed-in user submits a well-formed code on the in-app verification page
- **THEN** `GET /api/v1/public/verify/{code}` is requested and the result is rendered inside the authenticated shell

#### Scenario: Malformed code is rejected before the request
- **WHEN** a signed-in user submits a code that does not match the `CERT-XXXX-XXXX` shape
- **THEN** an inline message explains the expected format, and no verification request is made

#### Scenario: A code is normalized before it is checked
- **WHEN** a signed-in user submits a code in lower case, or arrives with one in the query string
- **THEN** it is upper-cased and trimmed before the shape check and before the request

#### Scenario: A malformed code arrives in the query string
- **WHEN** a signed-in user opens the page with a query-string code that does not match the shape
- **THEN** the format message is shown and no request is made, rather than reporting it as not found

#### Scenario: The lookup stays linkable
- **WHEN** a signed-in user submits a well-formed code
- **THEN** the code is put into the page's own URL, so the result can be linked to and the back button means something

#### Scenario: Re-submitting the code already being shown
- **WHEN** a signed-in user submits the code already in the URL
- **THEN** the lookup runs again rather than navigating nowhere and appearing to do nothing

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

#### Scenario: The field is left empty
- **WHEN** a signed-in user submits the top bar's field with nothing in it
- **THEN** nothing happens: no navigation and no request

#### Scenario: The field is cleared after use
- **WHEN** a code has been handed to the lookup from the top bar
- **THEN** the top bar's field is emptied, ready for the next code

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

#### Scenario: Not yet issued
- **WHEN** the lookup returns a certificate that has not been issued
- **THEN** the page shows a not-yet-issued treatment in the pending semantic color, distinct from both valid and revoked

#### Scenario: The lookup fails for any other reason
- **WHEN** the lookup fails with anything other than 404 or 429
- **THEN** the page says so and offers a retry action, distinct from a not-found result

#### Scenario: Rate limited
- **WHEN** the lookup returns 429
- **THEN** the page shows a rate-limited treatment asking the user to wait, distinct from a not-found result
