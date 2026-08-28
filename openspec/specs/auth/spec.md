# auth Specification

## Purpose
Authenticates users with email and password, issues and rotates JWT token pairs, and enforces the `ADMIN` / `USER` roles that every other capability depends on.

## Requirements

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

### Requirement: Login rate limiting
The system SHALL rate limit repeated failed login attempts, keyed on the combination of the target email and the client IP so an attacker cannot lock out a known victim's account merely by knowing their email.

#### Scenario: Threshold exceeded
- **WHEN** the number of failed login attempts for the same email-and-IP combination exceeds the configured threshold within the configured window
- **THEN** further login attempts from that combination return 429 until the window elapses, regardless of whether the credentials are correct

#### Scenario: Different IP is not penalized by another client's failures
- **WHEN** an email has exceeded the failed-attempt threshold from one IP
- **THEN** a login attempt for that same email from a different IP is still evaluated normally, not rejected by the other IP's rate limit

### Requirement: Refresh endpoint rate limiting
The system SHALL rate limit repeated failed or invalid calls to POST /api/v1/auth/refresh per client IP.

#### Scenario: Threshold exceeded
- **WHEN** the number of failed refresh attempts from the same IP exceeds the configured threshold within the configured window
- **THEN** further refresh attempts from that IP return 429 until the window elapses

### Requirement: Password storage
The system SHALL store user passwords only as a salted BCrypt hash and SHALL NOT log or persist a password in plain text at any point.

#### Scenario: Password is never recoverable in plain text
- **WHEN** a user's stored credential record is inspected
- **THEN** it contains only the BCrypt hash, never the original password

### Requirement: Refresh token storage
The system SHALL store refresh tokens only as a hash at rest and SHALL NOT persist or log the raw refresh token value.

#### Scenario: Refresh token is never recoverable in plain text
- **WHEN** a stored refresh token record is inspected
- **THEN** it contains only the token hash, never the raw token value

### Requirement: Refresh token rotation
The system SHALL exchange a valid, unrevoked refresh token for a new access/refresh token pair and revoke the presented refresh token.

#### Scenario: Valid refresh token
- **WHEN** a client sends POST /api/v1/auth/refresh with a refresh token that is valid and not revoked
- **THEN** the response is 200 with a new token pair and the presented refresh token is revoked

#### Scenario: Reused or revoked refresh token
- **WHEN** a client sends POST /api/v1/auth/refresh with a token that is already revoked or does not exist
- **THEN** the response is 401 and no new token pair is issued

### Requirement: Refresh token theft detection
The system SHALL treat presentation of an already-rotated (revoked) refresh token as a signal of possible token theft and revoke every refresh token belonging to that user, not just reject the single request.

#### Scenario: Rotated token is replayed
- **WHEN** a refresh token that was already exchanged for a new pair (and is therefore revoked) is presented again
- **THEN** the response is 401 and every other refresh token issued to that user is also revoked, forcing re-authentication on all sessions

### Requirement: Logout
The system SHALL revoke the refresh token presented at logout, and SHALL treat possession of that token as the credential rather than requiring an access token as well.

#### Scenario: Logout revokes the token
- **WHEN** a client sends POST /api/v1/auth/logout with a valid refresh token
- **THEN** the response is 204 and a subsequent refresh with that token returns 401

#### Scenario: Logout does not require an access token
- **WHEN** a client sends POST /api/v1/auth/logout with a valid refresh token and no bearer token, or an expired one
- **THEN** the response is 204 and the refresh token is revoked

#### Scenario: Unknown token
- **WHEN** a client sends POST /api/v1/auth/logout with a token that matches no stored refresh token
- **THEN** the response is 204 and no session is affected

### Requirement: Current user lookup
The system SHALL return the authenticated user's own profile.

#### Scenario: Valid bearer token
- **WHEN** an authenticated client sends GET /api/v1/auth/me with a valid access token
- **THEN** the response is 200 with `id`, `email`, `fullName` and `role`

#### Scenario: Missing or invalid token
- **WHEN** a client sends GET /api/v1/auth/me without a bearer token or with an expired/invalid one
- **THEN** the response is 401

### Requirement: Role-based authorization
The system SHALL restrict `ADMIN`-only endpoints to users with the `ADMIN` role and reject other authenticated users.

#### Scenario: USER attempts an admin-only action
- **WHEN** a user with role `USER` calls an endpoint restricted to `ADMIN`
- **THEN** the response is 403 and no state changes

### Requirement: Profile update
The system SHALL let an authenticated user update their own full name and email address, and SHALL NOT let that request change their role.

#### Scenario: Valid profile update
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with a full name and an email not registered to another user
- **THEN** the response is 200 with the updated `id`, `email`, `fullName` and `role`, and the stored user reflects the new values

#### Scenario: Email belongs to another user
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with an email already registered to a different user
- **THEN** the response is 409 and neither user is modified

#### Scenario: Email differing only by case is the same address
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with an email that differs only by letter case from one already registered to a different user
- **THEN** the response is 409, treating the two addresses as the same account

#### Scenario: Role cannot be escalated
- **WHEN** an authenticated client with role `USER` sends PUT /api/v1/auth/me including any attempt to set a role
- **THEN** the stored user's role is unchanged

#### Scenario: Invalid payload
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with a blank name or a malformed email
- **THEN** the response is 400 with field-level validation errors and the stored user is unchanged

#### Scenario: Unauthenticated
- **WHEN** a client sends PUT /api/v1/auth/me without a valid access token
- **THEN** the response is 401

### Requirement: Password change
The system SHALL let an authenticated user change their own password by supplying the current one, and SHALL apply the password policy to the new value.

#### Scenario: Valid password change
- **WHEN** an authenticated client sends POST /api/v1/auth/me/password with the correct current password and a new password meeting the policy
- **THEN** the response is 204 and the stored hash verifies against the new password and not the old one

#### Scenario: Wrong current password
- **WHEN** an authenticated client sends POST /api/v1/auth/me/password with an incorrect current password
- **THEN** the response is 400 with a field-level error on the current password and the stored hash is unchanged

#### Scenario: New password fails the policy
- **WHEN** an authenticated client sends POST /api/v1/auth/me/password with a new password shorter than 8 characters or containing no digit
- **THEN** the response is 400 with a field-level validation error and the stored hash is unchanged

#### Scenario: New password identical to the current one
- **WHEN** an authenticated client sends POST /api/v1/auth/me/password with a new password identical to the current one
- **THEN** the response is 400 with a field-level error on the new password, the stored hash is unchanged, and no session is revoked

#### Scenario: Refresh token unknown, revoked, or belonging to another user
- **WHEN** an authenticated client sends POST /api/v1/auth/me/password with a correct current password and a policy-compliant new one, but the accompanying refresh token does not exist, is already revoked, or belongs to a different user
- **THEN** the response is 400 with a field-level error on the refresh token, and the whole change is rolled back — the stored password hash is unchanged and no session is revoked

### Requirement: A password change ends other sessions
The system SHALL revoke every refresh token belonging to the user whose password changed, except the one presented by the caller.

#### Scenario: Other sessions are ended
- **WHEN** a user with refresh tokens issued to several sessions changes their password
- **THEN** every one of that user's refresh tokens is revoked except the caller's, and a later refresh with a revoked one returns 401

#### Scenario: The caller stays signed in
- **WHEN** a user changes their password
- **THEN** the refresh token they presented with the request remains valid and their session continues

### Requirement: Profile write rate limiting
The system SHALL rate limit repeated failed attempts against both profile-write endpoints, keyed per authenticated user.

#### Scenario: Password-change threshold exceeded
- **WHEN** the number of failed current-password attempts on POST /api/v1/auth/me/password for the same user exceeds the configured threshold within the configured window
- **THEN** further password-change attempts from that user return 429 until the window elapses

#### Scenario: Profile-update threshold exceeded
- **WHEN** the number of failed PUT /api/v1/auth/me attempts (an email already registered to another user) for the same user exceeds the configured threshold within the configured window
- **THEN** further profile-update attempts from that user return 429 until the window elapses, even if a legitimate update with the user's own email was interleaved with the failed attempts

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
