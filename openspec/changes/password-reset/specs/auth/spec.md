## ADDED Requirements

### Requirement: Password reset request
The system SHALL accept a password reset request for an email address and SHALL respond identically whether or not that address has an account.

#### Scenario: Address has an account
- **WHEN** a client sends POST /api/v1/auth/forgot-password with the email of an existing enabled user
- **THEN** the response is 202, a single-use reset token is created for that user, and an email containing the reset link is dispatched

#### Scenario: Address has no account
- **WHEN** a client sends POST /api/v1/auth/forgot-password with an email that has no account
- **THEN** the response is 202, no token is created and no email is dispatched, and the response is indistinguishable from the matching case

#### Scenario: Malformed email
- **WHEN** a client sends POST /api/v1/auth/forgot-password with a malformed email
- **THEN** the response is 400 with a field-level validation error

#### Scenario: A new request supersedes the previous one
- **WHEN** a user requests a reset while an unused, unexpired token already exists for them
- **THEN** the previous token is invalidated and only the newest one can complete a reset

### Requirement: Reset token storage and lifetime
The system SHALL store password reset tokens only as a hash at rest, SHALL expire them 30 minutes after issue, and SHALL allow each to be used at most once.

#### Scenario: Token is never recoverable in plain text
- **WHEN** a stored password reset token record is inspected
- **THEN** it contains only the token hash, never the raw token value

#### Scenario: Expired token
- **WHEN** a client sends POST /api/v1/auth/reset-password with a token issued more than 30 minutes earlier
- **THEN** the response is 400 and no password is changed

#### Scenario: Reused token
- **WHEN** a client sends POST /api/v1/auth/reset-password with a token that has already completed a reset
- **THEN** the response is 400 and no password is changed

#### Scenario: Unknown token
- **WHEN** a client sends POST /api/v1/auth/reset-password with a token that does not match any stored hash
- **THEN** the response is 400 and no password is changed

### Requirement: Password reset completion
The system SHALL set a new password when given a valid reset token and a password meeting the password policy.

#### Scenario: Valid reset
- **WHEN** a client sends POST /api/v1/auth/reset-password with a valid unused token and a policy-compliant new password
- **THEN** the response is 204, the stored hash verifies against the new password and not the old one, and the token is marked used

#### Scenario: New password fails the policy
- **WHEN** a client sends POST /api/v1/auth/reset-password with a valid token and a password shorter than 8 characters or containing no digit
- **THEN** the response is 400 with a field-level validation error, no password is changed, and the token remains unused

#### Scenario: A reset ends every session
- **WHEN** a password reset completes for a user with active sessions
- **THEN** every refresh token belonging to that user is revoked, and a later refresh with any of them returns 401

### Requirement: Reset link points at configured origin
The system SHALL build the reset link from a configured frontend base URL and SHALL NOT derive it from request headers.

#### Scenario: Request carries an attacker-controlled host header
- **WHEN** a password reset request arrives with a `Host` or `X-Forwarded-Host` header naming an unrelated origin
- **THEN** the emailed link still points at the configured frontend base URL

### Requirement: Password reset rate limiting
The system SHALL rate limit password reset requests per client IP and per target email, and reset completions per client IP.

#### Scenario: Too many requests from one IP
- **WHEN** the number of reset requests from the same IP exceeds the configured threshold within the configured window
- **THEN** further requests from that IP return 429 until the window elapses

#### Scenario: Too many requests for one address
- **WHEN** the number of reset requests naming the same email exceeds the configured threshold within the configured window
- **THEN** further requests for that address return 429 and no further email is dispatched

#### Scenario: Too many completion attempts
- **WHEN** the number of reset completion attempts from the same IP exceeds the configured threshold within the configured window
- **THEN** further attempts from that IP return 429

### Requirement: Mail delivery is configured, not assumed
The system SHALL send transactional email through a configured provider in production and SHALL fail to start when that configuration is incomplete, while offering a non-sending implementation for development and tests.

#### Scenario: Production configuration is incomplete
- **WHEN** the application starts in a profile configured to send mail but is missing required mail properties
- **THEN** startup fails with an error naming the missing configuration, rather than starting with mail silently disabled

#### Scenario: Development
- **WHEN** the application runs with the non-sending implementation selected
- **THEN** the reset link is written to the application log and no message is transmitted
