## MODIFIED Requirements

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
