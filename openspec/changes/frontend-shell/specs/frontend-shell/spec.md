## ADDED Requirements

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
The system SHALL centralize color, spacing, radius, typography and elevation values in a single SCSS token file, and SHALL generate the Angular Material theme from those tokens rather than a hardcoded palette.

#### Scenario: A component needs a color or spacing value
- **WHEN** a component or shared stylesheet needs a color, spacing, radius, typography or elevation value
- **THEN** it references a token defined in the shared token file rather than a literal value

### Requirement: Workspace builds, lints and tests from a clean checkout
The system SHALL provide npm scripts that build, lint and run headless unit tests successfully with no manual setup beyond `npm ci`.

#### Scenario: Fresh checkout
- **WHEN** a fresh checkout runs `npm ci`, `npm run build`, `npm run lint` and `npm test`
- **THEN** all four commands complete successfully
