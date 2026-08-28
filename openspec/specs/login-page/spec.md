# login-page Specification

## Purpose
Authenticates a user into the application: the login form itself, the guard that keeps the authenticated shell closed to anyone without a valid session, session recovery across a hard reload, and the distinct feedback for a rate limit versus a plain credential error.

## Requirements

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

### Requirement: Interaction states are uniform
The system SHALL give every control it builds outside the component library the same three states: a tinted hover in the control's own role color, a pressed state one step stronger than that hover, and a reduced-opacity disabled state that does not respond to hover. Keyboard focus is covered by the shell's global focus rule and is not restated per control.

#### Scenario: A control is hovered and pressed
- **WHEN** a user hovers a control on a rebuilt screen and then presses it
- **THEN** the control paints a tinted background on hover — accent for an accent control, neutral for a secondary one — and a stronger tint of the same color while pressed

#### Scenario: A control is disabled
- **WHEN** a control on a rebuilt screen is disabled
- **THEN** it is rendered at reduced opacity, does not respond to hover, and cannot be activated

### Requirement: Field errors appear once a field has been left
The system SHALL show a field's validation message when the field is left, without waiting for a further keystroke.

#### Scenario: A required field is left empty
- **WHEN** a user focuses a required field, leaves it empty, and moves focus away
- **THEN** that field's validation message is shown and the field is marked invalid to assistive technology

### Requirement: Public verification is reachable from the login screen
The system SHALL offer a link from the login screen to the public certificate verification page.

#### Scenario: Visitor without an account wants to verify a certificate
- **WHEN** a visitor selects the verification link on the login screen
- **THEN** the application navigates to the public verification page without requiring authentication
