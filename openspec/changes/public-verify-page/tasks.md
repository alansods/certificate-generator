## 1. Data layer

- [x] 1.1 `features/verification/data/certificate-verification-response.ts`: `CertificateVerificationResponse` matching the backend DTO (`recipientName`, `courseName`, `workloadHours`, `issueDate`, `status`).
- [x] 1.2 `features/verification/data/verification.api.ts`: `VerificationApi.verify(code)` hitting `GET /api/v1/public/verify/{code}`.

## 2. Verify page

- [x] 2.1 `verify-page.component.ts`: reactive `code` signal off the route param (`toSignal(route.paramMap...)`), `rxResource` tying it to `VerificationApi.verify`.
- [x] 2.2 Found states: `ISSUED`/`DRAFT`/`REVOKED` each rendered with distinct status styling; certificate details (recipient, course, workload hours, issue date) shown for all three.
- [x] 2.3 Not-found state (404): a clear "no certificate found for this code" message, not a generic error.
- [x] 2.4 Rate-limited state (429): a distinct "too many attempts" message.
- [x] 2.5 Generic error state for anything else.
- [x] 2.6 `.html`/`.scss`: tokens only, `@if`/`@for` only, `OnPush`, no layout chrome (no toolbar/sidenav).

## 3. Routing

- [x] 3.1 `app.routes.ts`: replace `PlaceholderComponent` with `VerifyPageComponent` on the existing `verify/:code` route.

## 4. Tests

- [x] 4.1 `verification.api.spec.ts`: `verify(code)` hits the right URL.
- [x] 4.2 `verify-page.component.spec.ts`: valid `ISSUED` code shows certificate details and a valid badge; `REVOKED` code shows the same details with a revoked warning; `DRAFT` code shows a not-yet-issued state; a 404 shows the not-found message; a 429 shows the rate-limited message; navigating from one code to a different code (route param change without component destruction) re-fetches and re-renders correctly.

## 5. Verification

- [x] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.2 `openspec validate public-verify-page --type change --strict` passes.
