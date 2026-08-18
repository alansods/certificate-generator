## ADDED Requirements

### Requirement: Authenticated navigation chrome
The system SHALL render the authenticated area inside a fixed top bar and a persistent side navigation listing every authenticated area of the application, marking the current one.

#### Scenario: Signed-in user views any authenticated page
- **WHEN** a signed-in user is on any page inside the authenticated shell
- **THEN** the top bar and the side navigation are rendered, and the navigation item matching the current route is marked as active

#### Scenario: User selects a navigation item
- **WHEN** a user selects a navigation item
- **THEN** the application navigates to that area and the active mark moves to it

#### Scenario: User selects the brand
- **WHEN** a user selects the brand in the top bar
- **THEN** the application navigates to the certificate list

#### Scenario: Narrow viewport
- **WHEN** the viewport is narrower than the medium breakpoint
- **THEN** the side navigation collapses to a horizontal bar and every navigation item remains reachable without horizontal scrolling

### Requirement: Signed-in identity is visible
The system SHALL display the signed-in user's name and role in the authenticated chrome, sourced from the current-user endpoint rather than from decoding the access token.

#### Scenario: Shell loads for a signed-in user
- **WHEN** the authenticated shell loads
- **THEN** `GET /api/v1/auth/me` is requested once and the returned name and role are shown in the navigation

#### Scenario: Current-user lookup fails
- **WHEN** the current-user request fails
- **THEN** the navigation still renders, the identity block shows a neutral placeholder instead of a name, and the sign-out control remains available

### Requirement: Sign out
The system SHALL let a signed-in user end their session from the authenticated chrome.

#### Scenario: User signs out
- **WHEN** a user selects sign out
- **THEN** `POST /api/v1/auth/logout` is requested, the stored access and refresh tokens are cleared, and the application navigates to the login screen

#### Scenario: Sign-out request fails
- **WHEN** the sign-out request fails
- **THEN** the stored tokens are cleared and the application navigates to the login screen anyway, leaving no apparently-signed-in state behind
