## ADDED Requirements

### Requirement: Profile update
The system SHALL let an authenticated user update their own full name and email address, and SHALL NOT let that request change their role.

#### Scenario: Valid profile update
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with a full name and an email not registered to another user
- **THEN** the response is 200 with the updated `id`, `email`, `fullName` and `role`, and the stored user reflects the new values

#### Scenario: Email belongs to another user
- **WHEN** an authenticated client sends PUT /api/v1/auth/me with an email already registered to a different user
- **THEN** the response is 409 and neither user is modified

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

### Requirement: A password change ends other sessions
The system SHALL revoke every refresh token belonging to the user whose password changed, except the one presented by the caller.

#### Scenario: Other sessions are ended
- **WHEN** a user with refresh tokens issued to several sessions changes their password
- **THEN** every one of that user's refresh tokens is revoked except the caller's, and a later refresh with a revoked one returns 401

#### Scenario: The caller stays signed in
- **WHEN** a user changes their password
- **THEN** the refresh token they presented with the request remains valid and their session continues
