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
The system SHALL link the login screen to the sign-up screen and the sign-up screen back to login, and SHALL hide both links when self-registration is disabled.

#### Scenario: Visitor moves between the two screens
- **WHEN** a visitor selects the create-account link on the login screen, and then the sign-in link on the sign-up screen
- **THEN** the application navigates to the sign-up screen and back to the login screen

#### Scenario: Registration is disabled
- **WHEN** self-registration is disabled in the running deployment
- **THEN** the login screen does not offer a create-account link

### Requirement: New accounts are told their role
The system SHALL state on the sign-up screen that new accounts are created with the `USER` role.

#### Scenario: Visitor reads the sign-up screen
- **WHEN** a visitor views the sign-up form
- **THEN** the screen states that new accounts start with the `USER` role and that an administrator can change it later
