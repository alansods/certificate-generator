## ADDED Requirements

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
