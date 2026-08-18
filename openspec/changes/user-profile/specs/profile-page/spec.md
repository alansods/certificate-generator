## ADDED Requirements

### Requirement: Profile screen shows the signed-in account
The system SHALL offer a profile screen inside the authenticated shell showing the signed-in user's name, email and role.

#### Scenario: User opens the profile screen
- **WHEN** a signed-in user navigates to the profile screen
- **THEN** their full name, email address and role are shown, sourced from the current session rather than re-derived from the access token

#### Scenario: Profile screen is reachable from the navigation
- **WHEN** a signed-in user selects the profile item in the navigation
- **THEN** the application navigates to the profile screen and marks that item active

### Requirement: Editing name and email
The system SHALL let a user change their full name and email from the profile screen, independently of any password change.

#### Scenario: Saving a valid change
- **WHEN** a user edits the name or email and saves
- **THEN** `PUT /api/v1/auth/me` is requested, a confirmation is shown, and the name displayed in the navigation updates without a page reload

#### Scenario: Email already in use
- **WHEN** the save returns 409
- **THEN** an inline message on the email field explains that the address cannot be used, and the previously stored values remain in the navigation

#### Scenario: Invalid input
- **WHEN** a user saves with a blank name or a malformed email
- **THEN** inline messages mark the offending fields and no request is made

### Requirement: Changing the password
The system SHALL let a user change their password from the profile screen, requiring the current password and a confirmed new one.

#### Scenario: Successful change
- **WHEN** a user submits the correct current password and a matching, policy-compliant new password
- **THEN** `POST /api/v1/auth/me/password` is requested, a confirmation is shown, the three fields are cleared, and the user remains signed in

#### Scenario: Wrong current password
- **WHEN** the request returns a field error on the current password
- **THEN** an inline message marks the current-password field and the new password fields keep their values

#### Scenario: New password fails the policy
- **WHEN** the new password is shorter than 8 characters or contains no digit
- **THEN** an inline message states the rule and no request is made

#### Scenario: Confirmation does not match
- **WHEN** the confirmation differs from the new password
- **THEN** an inline message on the confirmation field states so and no request is made

#### Scenario: The two forms submit independently
- **WHEN** a user saves the profile card while the password fields are empty, or submits the password card without touching the profile card
- **THEN** only the corresponding request is made
