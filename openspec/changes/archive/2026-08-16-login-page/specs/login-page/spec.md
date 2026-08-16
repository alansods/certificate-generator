## ADDED Requirements

### Requirement: Login form authenticates and enters the shell
The system SHALL provide a reactive login form (email, password) that authenticates against `POST /api/v1/auth/login`, stores the returned tokens on success, and navigates into the authenticated shell.

#### Scenario: Valid credentials
- **WHEN** a user submits the login form with valid credentials
- **THEN** the returned access and refresh tokens are stored and the user is navigated into the authenticated shell

#### Scenario: Invalid credentials
- **WHEN** a user submits the login form with credentials the backend rejects (401)
- **THEN** an inline error is shown, no tokens are stored, and the user remains on the login page

### Requirement: Rate-limit feedback is distinct from a generic error
The system SHALL show a distinct message when a login attempt is rejected for exceeding the rate limit (429), rather than the generic invalid-credentials message.

#### Scenario: Login rate limited
- **WHEN** a login submission receives a 429 response
- **THEN** the shown message indicates too many attempts, not invalid credentials

### Requirement: Auth guard protects the authenticated shell
The system SHALL prevent navigation into the authenticated shell without a valid session, redirecting to the login page.

#### Scenario: No session at all
- **WHEN** a user with no access token and no refresh token navigates to an authenticated-shell route
- **THEN** they are redirected to the login page without any API call being made

#### Scenario: Valid session
- **WHEN** a user with a live access token navigates to an authenticated-shell route
- **THEN** the route renders without redirecting

### Requirement: Session restores across a hard reload
The system SHALL restore a valid session after a hard reload (where the in-memory access token is gone but a refresh token remains) by silently refreshing before the guard denies access, redirecting to login only if that refresh fails.

#### Scenario: Reload with a valid refresh token
- **WHEN** a user reloads the page with no access token in memory but a still-valid refresh token in storage
- **THEN** the guard silently refreshes and allows navigation, without bouncing through the login page

#### Scenario: Reload with an invalid or expired refresh token
- **WHEN** a user reloads the page with a refresh token the backend rejects
- **THEN** stored tokens are cleared and the user is redirected to the login page

### Requirement: Cold-start state on a slow login response
The system SHALL show an explicit "waking the server" state instead of a silent spinner when a login submission takes longer than a configured threshold, reflecting Render free tier's ~50 second cold start.

#### Scenario: Slow response
- **WHEN** a login submission has not resolved after the configured threshold
- **THEN** the UI shows a message explaining the server is waking up, not a bare spinner

#### Scenario: Fast response
- **WHEN** a login submission resolves before the configured threshold
- **THEN** no cold-start message is ever shown
