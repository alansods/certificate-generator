## ADDED Requirements

### Requirement: Login screen offers a create-account link
The system SHALL offer a link from the login screen to the sign-up screen when self-registration is enabled, and SHALL hide it when self-registration is disabled.

#### Scenario: Registration enabled
- **WHEN** a visitor views the login screen and self-registration is enabled
- **THEN** the login screen offers a link to create an account, which navigates to the sign-up screen

#### Scenario: Registration disabled
- **WHEN** self-registration is disabled in the running deployment
- **THEN** the login screen does not offer a create-account link

#### Scenario: Registration-enabled lookup fails
- **WHEN** the login screen's lookup of the registration-enabled flag fails
- **THEN** the login screen still offers the create-account link, favoring a visible link that might 404 over hiding a real one
