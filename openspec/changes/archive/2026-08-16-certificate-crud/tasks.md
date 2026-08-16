## 1. Persistence

- [x] 1.1 `V3__certificates.sql`: `certificates` table per `docs/PLAN.md`'s domain model, `created_by` FK to `users(id)`
- [x] 1.2 `Certificate` JPA entity, `CertificateStatus`/`CertificateTemplate` enums, `CertificateRepository`

## 2. Code generation

- [x] 2.1 `CertificateCodeGenerator`: `CERT-XXXX-XXXX`, unambiguous 32-symbol alphabet, `SecureRandom`
- [x] 2.2 Bounded retry (5 attempts) on unique-constraint collision, per `design.md`

## 3. Search and pagination

- [x] 3.1 `CertificateSpecifications` for optional `q` (recipient name / course name / code, case-insensitive) and `status` filters
- [x] 3.2 Controller resolves `Pageable` from `page`/`size`/`sort`, returns `Page<CertificateResponse>`

## 4. Endpoints

- [x] 4.1 `POST /api/v1/certificates` — 201, assigns code and `created_by`, `status` defaults to `DRAFT` if omitted
- [x] 4.2 `GET /api/v1/certificates` — paginated, filtered by `q`/`status`
- [x] 4.3 `GET /api/v1/certificates/{id}` — 200 or 404
- [x] 4.4 `PUT /api/v1/certificates/{id}` — full update, 200 or 404; `created_by`/`code`/`createdAt` not client-writable
- [x] 4.5 `DELETE /api/v1/certificates/{id}` — `ADMIN` only (403 for `USER`), 204
- [x] 4.6 Bean Validation on the request DTO; `CertificateNotFoundException` mapped to 404 in `GlobalExceptionHandler`
- [x] 4.7 DTOs (`dto/`) and `CertificateMapper`; no entity crosses the controller boundary

## 5. Authorization

- [x] 5.1 `SecurityConfig`: `DELETE /api/v1/certificates/**` requires `ADMIN`; everything else under `/api/v1/certificates/**` just needs authentication

## 6. Tests (per docs/testing.md)

- [x] 6.1 Unit: `CertificateCodeGenerator` (format, alphabet, retry-on-collision)
- [x] 6.2 Unit or slice: validation failures map to 400 with the invalid field named
- [x] 6.3 Integration (Testcontainers): create → retrieve → update → delete flow; search by `q`; filter by `status`; pagination metadata; a `USER` can read/update another user's certificate (shared visibility); a `USER` gets 403 on delete, an `ADMIN` succeeds; 404 for an unknown id

## 7. Wiring and docs

- [x] 7.1 Confirm `./mvnw verify` passes and `openspec validate --all --strict` passes
