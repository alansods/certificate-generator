## ADDED Requirements

### Requirement: Transient notifications
The system SHALL report the outcome of a background action through a transient notification rendered once by the authenticated shell, announced to assistive technology, dismissible by the user and self-dismissing after a short delay.

#### Scenario: An action reports its outcome
- **WHEN** a feature reports the success or failure of a background action
- **THEN** a notification carrying that message appears in a live region anchored to the bottom-left of the shell, without moving focus away from what the user was doing

#### Scenario: A failure is announced more urgently than a success
- **WHEN** the reported outcome is a failure
- **THEN** the notification carries the alert role, while a success is announced politely

#### Scenario: Dismissing a notification
- **WHEN** a user selects the notification's dismiss control
- **THEN** that notification is removed, leaving any others on screen

#### Scenario: Self-dismissal
- **WHEN** a notification has been on screen for four seconds without being dismissed
- **THEN** it is removed on its own

#### Scenario: Several outcomes at once
- **WHEN** more than one action reports an outcome before the earlier notifications have gone
- **THEN** the notifications stack in the order they arrived, each announced separately rather than the whole stack being re-read
