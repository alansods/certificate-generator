## Context

`openspec/specs/public-verification/spec.md` fixes the external contract. This document covers implementation choices.

## Response shape

A dedicated `CertificateVerificationResponse` DTO (`recipientName`, `courseName`, `workloadHours`, `issueDate`, `status`) — deliberately not `CertificateResponse` with fields stripped out at the controller. A shared DTO would eventually grow a field (e.g. `recipientEmail`, `createdBy`) that's fine for the authenticated `certificates` capability but must never leak here; a separate type makes that omission structural rather than something a future change could silently break by adding a field to the shared response and forgetting this endpoint uses it too.

## Endpoint and package

New package `com.certificategenerator.verification`, not folded into the existing `certificate` package — `public-verification` is its own capability in `openspec/specs/`, with its own authorization model (no auth at all) and its own rate limit, distinct enough from the authenticated CRUD capability to warrant a boundary. `VerificationController` is genuinely a different resource (`/api/v1/public/verify/{code}`, not `/api/v1/certificates/**`), so this isn't just a stylistic split.

`VerificationService` looks up by `code` via a new `CertificateRepository.findByCode(String)` (the repository already exists in `certificate`; adding one read method there is simpler than duplicating certificate lookup logic into the new package). Not-found maps to 404 via a dedicated `CertificateVerificationNotFoundException` — reusing `certificate.CertificateNotFoundException` would be a cross-capability coupling for what's supposed to be an intentionally thin, isolated read path; also its constructor takes a `Long` id, not a `String` code.

## Rate limiting

Reuses the existing `auth.RateLimiter` (bounded Caffeine cache, already built for login/refresh in `feat/jwt-auth`) rather than introducing a second rate-limiting mechanism. Keyed on client IP alone, per the spec. New `app.rate-limit.verify.max-attempts`/`window` properties, same shape as the existing login/refresh ones.

## Client IP extraction — refactored, not duplicated

`AuthController` already has a private `clientIp()` that deliberately ignores `X-Forwarded-For` (any direct API caller can spoof it, which would let an attacker defeat the rate limit entirely — documented in `feat/jwt-auth`'s design.md). This endpoint needs the exact same logic. Copy-pasting it a second time risks the two copies silently diverging the next time someone "fixes" one of them (e.g. adds naive `X-Forwarded-For` trust to only one call site). Extracted to `web.ClientIpResolver.resolve(HttpServletRequest)`, used by both controllers, with the reasoning documented in exactly one place.

## Package layout

```
com.certificategenerator.verification
├── VerificationController                 GET /api/v1/public/verify/{code}
├── VerificationService                      lookup + rate limit
├── CertificateVerificationNotFoundException  -> 404
└── dto/
    └── CertificateVerificationResponse
```

`web.ClientIpResolver` (new) sits alongside the existing `CorrelationIdFilter`/`GlobalExceptionHandler` in `web/`, since it's cross-cutting infrastructure, not verification-specific business logic.
