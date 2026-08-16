# Testing

A PR without tests for the behavior it introduces is a review blocker.

## Backend

- Unit tests for services with Mockito. Business rules and edge cases.
- `@WebMvcTest` slices for controllers: status codes, validation errors, authorization.
- Integration tests with Testcontainers PostgreSQL for repositories and the full request path.
- Security tests: every endpoint asserted for anonymous, USER and ADMIN access.
- PDF generation asserted on bytes: the output starts with `%PDF`, page count and embedded text are checked.

## Frontend

- Component tests with the Angular testing utilities. Render, interact, assert on the DOM, not on internals.
- API services tested with `HttpTestingController`.
- Guards and interceptors tested in isolation, including the refresh-token retry path.
- Accessibility: forms have labels, dialogs trap focus, tables have captions. Asserted in tests where practical.

## Definition of done for a task

- The behavior described in the change's spec delta is implemented.
- Tests cover the happy path and at least the failure modes named in the spec.
- `./mvnw verify` and `npm run lint && npm test && npm run build` pass locally.
- `openspec validate --strict` passes.
- No `TODO` left behind without an issue linked.
