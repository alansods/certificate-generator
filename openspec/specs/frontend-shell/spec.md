# frontend-shell Specification

## Purpose
TBD - created by archiving change frontend-shell. Update Purpose after archive.

## Requirements

### Requirement: Authenticated requests carry a bearer token
The system SHALL attach an `Authorization: Bearer <accessToken>` header to every HTTP request targeting a protected `/api/v1/**` endpoint, and SHALL omit it for public endpoints (`/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/public/verify/**`).

#### Scenario: Request to a protected endpoint
- **WHEN** a service issues a request to a protected endpoint while an access token is stored
- **THEN** the request carries an `Authorization: Bearer` header with that access token

#### Scenario: Request to a public endpoint
- **WHEN** a service issues a request to the login, refresh, or public verification endpoint
- **THEN** no `Authorization` header is attached

### Requirement: Silent session recovery on token expiry
The system SHALL attempt exactly one silent refresh via `POST /api/v1/auth/refresh` when a protected request fails with 401, then retry the original request with the new access token.

#### Scenario: Expired access token
- **WHEN** a protected request returns 401
- **THEN** the system calls the refresh endpoint once, and on success retries the original request with the newly issued access token

#### Scenario: Refresh itself fails
- **WHEN** the refresh request returns 401
- **THEN** stored tokens are cleared and the user is redirected to the login route

### Requirement: Concurrent 401s share a single refresh
The system SHALL deduplicate silent-refresh attempts so that multiple requests failing with 401 at the same time trigger exactly one refresh call.

#### Scenario: Multiple requests expire together
- **WHEN** two or more protected requests return 401 before any refresh call has completed
- **THEN** only one `POST /api/v1/auth/refresh` call is made, and every failed request is retried once that call resolves

### Requirement: Public routes render outside the authenticated shell
The system SHALL expose a public route group, rendered without the authenticated layout, alongside an authenticated shell route group.

#### Scenario: Public verification route
- **WHEN** a user navigates to `/verify/:code` without being signed in
- **THEN** the route renders without redirecting to a login page and without the authenticated shell's navigation chrome

### Requirement: Uniform API error handling
The system SHALL parse every non-2xx API response as an RFC 7807 `ProblemDetail` and expose it through a single typed error channel, including `traceId` when present.

#### Scenario: Backend returns a problem+json error
- **WHEN** any API call receives a non-2xx response with an `application/problem+json` body
- **THEN** the error is surfaced to the caller as a typed object exposing `status`, `title`, `detail` and `traceId`

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

### Requirement: Workspace builds, lints and tests from a clean checkout
The system SHALL provide npm scripts that build, lint and run headless unit tests successfully with no manual setup beyond `npm ci`.

#### Scenario: Fresh checkout
- **WHEN** a fresh checkout runs `npm ci`, `npm run build`, `npm run lint` and `npm test`
- **THEN** all four commands complete successfully

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
- **THEN** the side navigation collapses to a horizontal bar anchored to the bottom of the viewport, every navigation item remains reachable without horizontal scrolling and without scrolling the page, and sign-out moves into that bar rather than becoming unreachable

#### Scenario: The current item is announced, not just tinted
- **WHEN** a navigation item matches the current route
- **THEN** it carries `aria-current="page"`, so the current area is conveyed to assistive technology and not by color alone

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
- **THEN** the stored access and refresh tokens are cleared and the application navigates to the login screen immediately, and `POST /api/v1/auth/logout` is requested to revoke the refresh token server-side — the local sign-out does not wait for that response, so a request that hangs cannot leave the user on the authenticated shell

#### Scenario: There is no token left to revoke
- **WHEN** a user signs out with no stored refresh token
- **THEN** no revocation request is made and the application still returns to the login screen

#### Scenario: Sign-out request fails
- **WHEN** the sign-out request fails
- **THEN** the stored tokens are cleared and the application navigates to the login screen anyway, leaving no apparently-signed-in state behind

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
