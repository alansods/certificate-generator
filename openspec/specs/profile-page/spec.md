# profile-page Specification

## Purpose
Lets a signed-in user view their account details and, independently, edit their name and email or change their password from a dedicated profile screen.

## Requirements

### Requirement: Profile screen shows the signed-in account
The system SHALL offer a profile screen inside the authenticated shell showing the signed-in user's name, email and role.

#### Scenario: User opens the profile screen
- **WHEN** a signed-in user navigates to the profile screen
- **THEN** their full name, email address and role are shown, sourced from the current session rather than re-derived from the access token

#### Scenario: Profile screen is reachable from the navigation
- **WHEN** a signed-in user selects the profile item in the navigation
- **THEN** the application navigates to the profile screen and marks that item active

#### Scenario: Session still loading
- **WHEN** the profile screen is opened before the session's own lookup of the signed-in account has resolved
- **THEN** a loading state is shown in place of the forms, and the forms appear once the account is known, whether that happens before or after the screen is created

#### Scenario: Session failed to load
- **WHEN** the session's lookup of the signed-in account fails and no account is yet known
- **THEN** an error message and a retry action are shown in place of the forms

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

#### Scenario: Save fails for a reason other than a field error
- **WHEN** the save fails without a field-level error, such as a network failure or a server error
- **THEN** a form-level message is shown and the entered values are kept

#### Scenario: Save is in flight
- **WHEN** a user has submitted the profile card and the request has not yet resolved
- **THEN** the save button shows a progress state and is disabled, preventing a second submission of the same change

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

#### Scenario: Confirmation is blank
- **WHEN** a user submits with the confirmation field empty
- **THEN** the confirmation field is marked as required rather than as mismatched

#### Scenario: Change fails for a reason other than a field error
- **WHEN** the change fails without a field-level error, such as a network failure or a server error
- **THEN** a form-level message is shown

#### Scenario: Change is in flight
- **WHEN** a user has submitted the password card and the request has not yet resolved
- **THEN** the submit button shows a progress state and is disabled, preventing a second submission of the same change

#### Scenario: The two forms submit independently
- **WHEN** a user saves the profile card while the password fields are empty, or submits the password card without touching the profile card
- **THEN** only the corresponding request is made
