## ADDED Requirements

### Requirement: Self-registration
The system SHALL let an unauthenticated client create a user account with the `USER` role and SHALL issue a token pair for the new account.

#### Scenario: Valid registration
- **WHEN** a client sends POST /api/v1/auth/register with a full name, an unused email and a password meeting the password policy
- **THEN** the response is 201 with `accessToken`, `refreshToken` and `expiresIn`, and a user with role `USER` and `enabled` true exists for that email

#### Scenario: Email already registered
- **WHEN** a client sends POST /api/v1/auth/register with an email that already has an account
- **THEN** the response is 409 and no second user is created for that email

#### Scenario: Registration never grants ADMIN
- **WHEN** a client sends POST /api/v1/auth/register with any payload, including one attempting to set a role
- **THEN** the created user's role is `USER`

#### Scenario: The new session behaves like any other
- **WHEN** a client uses the refresh token returned by registration
- **THEN** it rotates under the same rules as a refresh token issued by login

#### Scenario: Email differing only by case is the same address
- **WHEN** a client sends POST /api/v1/auth/register with an email that differs only by letter case from one already registered
- **THEN** the response is 409, treating the two addresses as the same account, and no second user is created

### Requirement: Password policy
The system SHALL require every password it accepts to be at least 8 characters long and to contain at least one digit, and SHALL apply the same rule wherever a password is set.

#### Scenario: Password too short
- **WHEN** a client submits a password shorter than 8 characters to any endpoint that sets a password
- **THEN** the response is 400 with a field-level validation error and no password is stored

#### Scenario: Password without a digit
- **WHEN** a client submits a password containing no digit to any endpoint that sets a password
- **THEN** the response is 400 with a field-level validation error and no password is stored

### Requirement: Registration rate limiting
The system SHALL rate limit registration attempts per client IP.

#### Scenario: Threshold exceeded
- **WHEN** the number of registration attempts from the same IP exceeds the configured threshold within the configured window
- **THEN** further registration attempts from that IP return 429 until the window elapses

### Requirement: Self-registration can be disabled
The system SHALL expose a configuration flag that disables self-registration, and SHALL NOT reveal the endpoint when it is disabled.

#### Scenario: Registration disabled
- **WHEN** self-registration is disabled by configuration and a client sends POST /api/v1/auth/register
- **THEN** the response is 404 and no user is created

#### Scenario: Registration enabled
- **WHEN** self-registration is enabled by configuration
- **THEN** POST /api/v1/auth/register behaves as specified above

#### Scenario: Reporting the flag when enabled
- **WHEN** a client sends GET /api/v1/auth/registration-enabled while self-registration is enabled
- **THEN** the response is 200 with `enabled` true

#### Scenario: Reporting the flag when disabled
- **WHEN** a client sends GET /api/v1/auth/registration-enabled while self-registration is disabled
- **THEN** the response is 200 with `enabled` false

## MODIFIED Requirements

### Requirement: User login
The system SHALL authenticate a user by email and password and, on success, issue an access token and a refresh token. Email matching SHALL be case-insensitive.

#### Scenario: Valid credentials
- **WHEN** a client sends POST /api/v1/auth/login with a registered email and the matching password
- **THEN** the response is 200 with `accessToken`, `refreshToken` and `expiresIn`

#### Scenario: Invalid credentials
- **WHEN** a client sends POST /api/v1/auth/login with a wrong password or an unknown email
- **THEN** the response is 401 and does not reveal whether the email or the password was wrong

#### Scenario: Email differing only by case logs in the same account
- **WHEN** a client sends POST /api/v1/auth/login with an email that differs only by letter case from the one the account was registered with, and the matching password
- **THEN** the response is 200, treating the two addresses as the same account
