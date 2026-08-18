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

## ADDED Requirements

### Requirement: Keyboard focus is always visible
The system SHALL paint a visible accent outline on whichever control holds keyboard focus, from a global rule rather than from focus styling written per component.

#### Scenario: A control receives keyboard focus
- **WHEN** a user moves keyboard focus to an interactive control
- **THEN** an accent outline is painted around it — from the global `:focus-visible` rule for plain markup, and from the component library's own focus indicators for the Material components still on screen — and never from focus styling written per component

#### Scenario: A control is clicked rather than tabbed to
- **WHEN** a user activates a control with a pointer
- **THEN** no focus outline is painted, so the ring marks keyboard navigation rather than every click

### Requirement: Touch targets are reachable on small screens
The system SHALL give every interactive control a hit area of at least 44px in its smaller dimension below the medium breakpoint, independent of how compact the control is drawn.

#### Scenario: An icon-only control on a small screen
- **WHEN** a user views an icon-only control below the medium breakpoint
- **THEN** its hit area is at least 44px, whether by the control's own size or by an expanded hit area around it

### Requirement: Accent color is used within its contrast budget
The system SHALL restrict the primary accent to chrome, icons, borders and large text, and SHALL use the lighter accent step for accent-colored body text.

#### Scenario: Body copy needs the accent color
- **WHEN** a paragraph or other body-sized text needs to be accent-colored
- **THEN** it uses the lighter accent step rather than the primary accent — not because the primary step fails today, but so the rule keeps holding if the accent is ever retuned

#### Scenario: A large area needs emphasis
- **WHEN** a surface needs to be emphasized
- **THEN** the accent is applied as a border, glow or text color rather than as a large filled background
