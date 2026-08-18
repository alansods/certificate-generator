## MODIFIED Requirements

### Requirement: Styling is token-driven
The system SHALL centralize color, spacing, radius, typography and elevation values in a single Tailwind CSS 4 `@theme` block, SHALL derive every Angular Material system variable still in use from those same tokens rather than from a separately generated palette, and SHALL render the application on a dark color scheme.

#### Scenario: A component needs a color or spacing value
- **WHEN** a component template or stylesheet needs a color, spacing, radius, typography or elevation value
- **THEN** it uses a Tailwind utility or CSS custom property generated from the `@theme` token block rather than a literal value

#### Scenario: A Material component renders during the migration
- **WHEN** a screen that still uses an Angular Material component is rendered
- **THEN** that component's colors come from the Nocturne tokens, mapped onto the Material system variables, and not from a Material-generated palette

#### Scenario: The application is loaded
- **WHEN** the application is loaded in a browser
- **THEN** the document declares a dark color scheme and paints the Nocturne background and text tokens on `body`

### Requirement: Interaction states are uniform
The system SHALL give every interactive control the same four states: an accent-tinted hover, a pressed state one step stronger than hover, a visible focus ring on keyboard focus, and a reduced-opacity disabled state.

#### Scenario: A control is hovered and pressed
- **WHEN** a user hovers an interactive control and then presses it
- **THEN** the control paints an accent-tinted background on hover and a stronger tint of the same accent while pressed

#### Scenario: A control receives keyboard focus
- **WHEN** a user moves keyboard focus to an interactive control
- **THEN** an accent outline is painted around it with an offset, via `:focus-visible` rather than per-component styling

#### Scenario: A control is disabled
- **WHEN** an interactive control is disabled
- **THEN** it is rendered at reduced opacity and does not respond to hover

### Requirement: Accent color is used within its contrast budget
The system SHALL restrict the primary accent to chrome, icons, borders and large text, and SHALL use the lighter accent step for accent-colored body text.

#### Scenario: Body copy needs the accent color
- **WHEN** a paragraph or other body-sized text needs to be accent-colored
- **THEN** it uses the lighter accent step rather than the primary accent, so the contrast ratio against the application background stays above 4.5:1

#### Scenario: A large area needs emphasis
- **WHEN** a surface needs to be emphasized
- **THEN** the accent is applied as a border, glow or text color rather than as a large filled background
