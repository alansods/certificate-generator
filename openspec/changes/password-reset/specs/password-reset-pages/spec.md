## ADDED Requirements

### Requirement: Requesting a reset link
The system SHALL offer a public screen that requests a password reset link for an email address, and SHALL confirm the request without revealing whether the address has an account.

#### Scenario: Visitor requests a link
- **WHEN** a visitor submits a valid email address
- **THEN** `POST /api/v1/auth/forgot-password` is requested and a confirmation naming that address is shown, worded so that it does not state whether an account exists

#### Scenario: Malformed email
- **WHEN** a visitor submits a malformed email address
- **THEN** an inline message states so and no request is made

#### Scenario: Trying another address
- **WHEN** a visitor selects the action to use another email from the confirmation
- **THEN** the form returns, empty and ready for a new address

#### Scenario: Rate limited
- **WHEN** the request returns 429
- **THEN** a rate-limit notice distinct from a generic error asks the visitor to wait

#### Scenario: Request fails for a reason other than a field error or rate limiting
- **WHEN** the request fails with neither a 429 nor a field error
- **THEN** a generic error banner is shown, distinct from the rate-limit notice

#### Scenario: Reachable from login
- **WHEN** a visitor selects the forgot-password link on the login screen
- **THEN** the application navigates to this screen

### Requirement: Setting a new password from a reset link
The system SHALL offer a public screen that completes a reset using the token carried in the link.

#### Scenario: Valid token and password
- **WHEN** a visitor arriving with a token submits a policy-compliant, confirmed new password
- **THEN** `POST /api/v1/auth/reset-password` is requested and a confirmation with a link to sign in is shown

#### Scenario: Invalid or expired token
- **WHEN** the request returns 400 because the token is unknown, used or expired
- **THEN** the screen explains that the link is no longer valid and offers to request a new one, rather than showing a generic error

#### Scenario: No token in the URL
- **WHEN** a visitor opens the screen without a token
- **THEN** the screen explains that the link is incomplete and offers to request a new one, and no form is shown

#### Scenario: New password fails the policy
- **WHEN** the new password is shorter than 8 characters or contains no digit
- **THEN** an inline message states the rule and no request is made

#### Scenario: Confirmation does not match
- **WHEN** the confirmation differs from the new password
- **THEN** an inline message on the confirmation field states so and no request is made

#### Scenario: Change fails for a reason other than a field error or an invalid token
- **WHEN** the request fails with neither a 429, a field error, nor a 400 for an invalid token
- **THEN** a generic error banner is shown, distinct from the rate-limit and invalid-token states

### Requirement: The token is removed from the browser URL
The system SHALL strip the reset token from the visible URL once the screen has read it.

#### Scenario: Screen loads with a token
- **WHEN** the reset screen loads with a token in the query string
- **THEN** the token is held in memory and removed from the address bar without a navigation, so it is not left in history or leaked in a referrer
