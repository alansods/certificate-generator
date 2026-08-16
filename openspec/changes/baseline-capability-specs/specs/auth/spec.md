## Purpose
Authenticates users with email and password, issues and rotates JWT token pairs, and enforces the `ADMIN` / `USER` roles that every other capability depends on.

## ADDED Requirements

### Requirement: User login
The system SHALL authenticate a user by email and password and, on success, issue an access token and a refresh token.

#### Scenario: Valid credentials
- **WHEN** a client sends POST /api/v1/auth/login with a registered email and the matching password
- **THEN** the response is 200 with `accessToken`, `refreshToken` and `expiresIn`

#### Scenario: Invalid credentials
- **WHEN** a client sends POST /api/v1/auth/login with a wrong password or an unknown email
- **THEN** the response is 401 and does not reveal whether the email or the password was wrong

### Requirement: Login rate limiting
The system SHALL rate limit repeated failed login attempts for the same account or origin.

#### Scenario: Threshold exceeded
- **WHEN** the number of failed login attempts for the same email exceeds the configured threshold within the configured window
- **THEN** further login attempts return 429 until the window elapses, regardless of whether the credentials are correct

### Requirement: Refresh token rotation
The system SHALL exchange a valid, unrevoked refresh token for a new access/refresh token pair and revoke the presented refresh token.

#### Scenario: Valid refresh token
- **WHEN** a client sends POST /api/v1/auth/refresh with a refresh token that is valid and not revoked
- **THEN** the response is 200 with a new token pair and the presented refresh token is revoked

#### Scenario: Reused or revoked refresh token
- **WHEN** a client sends POST /api/v1/auth/refresh with a token that is already revoked or does not exist
- **THEN** the response is 401 and no new token pair is issued

### Requirement: Logout
The system SHALL revoke the refresh token presented at logout.

#### Scenario: Logout revokes the token
- **WHEN** an authenticated client sends POST /api/v1/auth/logout with a valid refresh token
- **THEN** the response is 204 and a subsequent refresh with that token returns 401

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
