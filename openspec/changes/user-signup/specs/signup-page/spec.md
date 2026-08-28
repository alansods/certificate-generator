## ADDED Requirements

### Requirement: Sign-up form creates an account and enters the shell
The system SHALL offer a public sign-up screen that creates an account and lands the new user in the authenticated shell.

#### Scenario: Successful sign-up
- **WHEN** a visitor submits the sign-up form with a full name, an unused email and a valid password
- **THEN** `POST /api/v1/auth/register` is requested, the returned tokens are stored, and the application navigates to the certificate list

#### Scenario: Email already registered
- **WHEN** the registration request returns 409
- **THEN** an inline message on the email field explains that the address cannot be used, and the form stays filled in apart from the password fields

#### Scenario: Rate limited
- **WHEN** the registration request returns 429
- **THEN** a rate-limit notice distinct from a generic error asks the visitor to wait

#### Scenario: Screen gates itself proactively when registration is disabled
- **WHEN** the sign-up screen loads and its lookup of the registration-enabled flag returns false
- **THEN** the screen shows a disabled notice instead of the form

#### Scenario: Registration is disabled between the lookup and submission
- **WHEN** the sign-up screen's lookup reported registration enabled but the registration request itself returns 404
- **THEN** the screen shows the same disabled notice as a race-condition backstop

### Requirement: Cold-start state on a slow sign-up response
The system SHALL show an explicit "waking the server" state instead of a silent spinner when a sign-up submission takes longer than a configured threshold, reflecting Render free tier's ~50 second cold start.

#### Scenario: Slow response
- **WHEN** a sign-up submission has not resolved after the configured threshold
- **THEN** the UI shows a message explaining the server is waking up, not a bare spinner

#### Scenario: Fast response
- **WHEN** a sign-up submission resolves before the configured threshold
- **THEN** no cold-start message is ever shown

### Requirement: Sign-up validation mirrors the backend policy
The system SHALL validate the sign-up form client-side against the same rules the backend enforces, before making a request.

#### Scenario: Password fails the policy
- **WHEN** a visitor submits a password shorter than 8 characters or containing no digit
- **THEN** an inline message states the rule and no request is made

#### Scenario: Confirmation does not match
- **WHEN** the password confirmation differs from the password
- **THEN** an inline message on the confirmation field states so and no request is made

#### Scenario: Missing or malformed fields
- **WHEN** a visitor submits with an empty name or a malformed email
- **THEN** inline messages mark the offending fields and no request is made

### Requirement: Sign-up is reachable and escapable from login
The system SHALL offer a link from the sign-up screen back to the login screen, at all times, and the login screen SHALL offer a link to the sign-up screen when self-registration is enabled.

#### Scenario: Screens offer links to each other
- **WHEN** a visitor views the login screen with self-registration enabled, and separately views the sign-up screen
- **THEN** the login screen offers a link to create an account, and the sign-up screen offers a link back to the login screen

#### Scenario: Registration is disabled
- **WHEN** self-registration is disabled in the running deployment and a visitor reaches the sign-up screen anyway (a stale tab, a direct navigation)
- **THEN** the sign-up screen shows the disabled notice instead of the form, while still offering its link back to login

### Requirement: New accounts are told their role
The system SHALL state on the sign-up screen that new accounts are created with the `USER` role.

#### Scenario: Visitor reads the sign-up screen
- **WHEN** a visitor views the sign-up form
- **THEN** the screen states that new accounts start with the `USER` role and that an administrator can change it later
