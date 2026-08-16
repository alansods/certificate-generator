## 1. Shared infrastructure

- [ ] 1.1 Add `web/ClientIpResolver` with a `resolve(HttpServletRequest)` method, extracted from `AuthController.clientIp()` (uses `getRemoteAddr()` only — never trusts `X-Forwarded-For`).
- [ ] 1.2 Update `AuthController` to use `ClientIpResolver` instead of its private `clientIp()` method; delete the now-dead private method.
- [ ] 1.3 Add unit test for `ClientIpResolver`.

## 2. Repository

- [ ] 2.1 Add `CertificateRepository.findByCode(String code)`.
- [ ] 2.2 Add repository test covering found/not-found.

## 3. Verification capability

- [ ] 3.1 Add `verification/dto/CertificateVerificationResponse` (`recipientName`, `courseName`, `workloadHours`, `issueDate`, `status`).
- [ ] 3.2 Add `verification/CertificateVerificationNotFoundException`, mapped to 404 in `GlobalExceptionHandler` (RFC 7807).
- [ ] 3.3 Add `verification/VerificationService`: looks up by code via `CertificateRepository.findByCode`, maps to the response DTO, throws not-found when absent. Revoked certificates return normally with `status: REVOKED` (no special-casing needed — the entity's actual status is mapped through).
- [ ] 3.4 Add `verification/VerificationController`: `GET /api/v1/public/verify/{code}`, applies rate limiting via `auth.RateLimiter` keyed on `ClientIpResolver.resolve(request)`, throws `RateLimitExceededException` (existing, already mapped) when exceeded.
- [ ] 3.5 Add `app.rate-limit.verify.max-attempts` / `app.rate-limit.verify.window` to `application.yml`, `application-dev.yml`, `application-prod.yml`.
- [ ] 3.6 Add `/api/v1/public/**` to `SecurityConfig`'s `permitAll` list.

## 4. Tests

- [ ] 4.1 `VerificationServiceTest` (unit): found (active), found (revoked), not-found.
- [ ] 4.2 `VerificationControllerTest` (`@WebMvcTest` slice, security auto-config excluded per the established pattern): 200 shape, 404 mapping, rate-limit 429.
- [ ] 4.3 `VerificationIntegrationTest` (full context + Testcontainers): anonymous access succeeds with no `Authorization` header (confirms `permitAll` wiring); revoked certificate returns 200 with `status: REVOKED`; unknown code returns 404 with RFC 7807 body; exceeding `app.rate-limit.verify.max-attempts` from the same IP returns 429.

## 5. Verification

- [ ] 5.1 `cd backend && ./mvnw verify` green.
- [ ] 5.2 `openspec validate public-verification --type change --strict` passes.
