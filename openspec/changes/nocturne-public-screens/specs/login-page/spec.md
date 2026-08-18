## ADDED Requirements

### Requirement: Interaction states are uniform
The system SHALL give every control it builds outside the component library the same states: an accent-tinted hover, a pressed state one step stronger than hover, and a reduced-opacity disabled state that does not respond to hover. Keyboard focus is covered by the shell's global focus rule and is not restated per control.

#### Scenario: A control is hovered and pressed
- **WHEN** a user hovers a control on a rebuilt screen and then presses it
- **THEN** the control paints an accent-tinted background on hover and a stronger tint of the same accent while pressed

#### Scenario: A control is disabled
- **WHEN** a control on a rebuilt screen is disabled
- **THEN** it is rendered at reduced opacity, does not respond to hover, and cannot be activated

### Requirement: Public verification is reachable from the login screen
The system SHALL offer a link from the login screen to the public certificate verification page.

#### Scenario: Visitor without an account wants to verify a certificate
- **WHEN** a visitor selects the verification link on the login screen
- **THEN** the application navigates to the public verification page without requiring authentication
