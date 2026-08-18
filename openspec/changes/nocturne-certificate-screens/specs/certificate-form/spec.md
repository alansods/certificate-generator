## MODIFIED Requirements

### Requirement: Template preview
The system SHALL present the three certificate templates (`CLASSIC`, `MODERN`, `MINIMAL`) as selectable cards, each showing a page-proportioned thumbnail of that template's own layout, so the templates can be compared without generating a PDF.

#### Scenario: Template options are shown
- **WHEN** a user reaches the template section of the form
- **THEN** all three templates are shown side by side, each with a thumbnail in the printed page's aspect ratio that reflects that template's distinct layout

#### Scenario: Selecting a template
- **WHEN** a user selects a template card
- **THEN** that card is marked as selected, the form control takes that template's value, and the other cards are left unselected

#### Scenario: Keyboard selection
- **WHEN** a user moves keyboard focus onto the template cards and activates one
- **THEN** the focused card shows a visible focus ring and activating it selects that template

## ADDED Requirements

### Requirement: Open the PDF preview from the edit form
The system SHALL let a user open the saved certificate's PDF preview from its edit form.

#### Scenario: Preview from the edit form
- **WHEN** a user selects the preview action on the edit form of an existing certificate
- **THEN** the application navigates to that certificate's preview page

#### Scenario: Preview is not offered while creating
- **WHEN** a user is on the create form, before any certificate exists
- **THEN** no preview action is offered
