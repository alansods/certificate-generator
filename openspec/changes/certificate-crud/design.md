## Context

`openspec/specs/certificates/spec.md` fixes the external contract. `docs/PLAN.md`'s domain model fixes the columns: `id, code, recipient_name, recipient_email, course_name, workload_hours, completion_date, issue_date, instructor_name, template, status, created_by, created_at, updated_at`. This document covers what's left open.

## Code generation

`CERT-XXXX-XXXX` where each `X` block is 4 characters drawn from a 32-symbol alphabet (uppercase letters and digits, excluding `0/O` and `1/I` to avoid transcription ambiguity — a human may read this off a printed certificate), generated with `SecureRandom`. That's `32^8` ≈ 1.1 × 10^12 possible codes, satisfying the spec's "impractical to guess" requirement for an unauthenticated lookup endpoint. On the rare chance of a collision against the `code` column's unique constraint, the generator retries (bounded — 5 attempts, then fails loudly rather than looping forever; a collision is astronomically unlikely at this address space, so hitting the bound at all would mean something else is wrong).

## Status and template

Both are stored as `VARCHAR` + a Java `enum` (matches the `role` column precedent from `feat/jwt-auth`), not a Postgres native enum type — consistent with the existing migration style and avoids an `ALTER TYPE` migration the day a fourth template is added.

`status` is optional on create (defaults to `DRAFT`) — the "Missing required field" scenario in the spec's Certificate creation requirement does not list `status` among the required fields, unlike every other field. `template` **is** required, since it's listed there explicitly.

No status-transition endpoint (e.g. a dedicated `POST /certificates/{id}/revoke`) — the spec only defines a full `PUT` update, and inventing transition semantics beyond what's specified would be scope creep the spec-driven workflow explicitly warns against. A future change can add one if a real need shows up (already flagged as an open question in `chore/openspec-init`'s PR #2 review, for whoever picks up the frontend's revoke affordance).

## Ownership and authorization

`created_by` is set once at creation from the authenticated principal (`AuthenticatedPrincipal.userId()`) and never accepted from the request body on create or update — it's server-controlled provenance, not client-editable state. Per the spec's "Shared certificate visibility" requirement, `created_by` does **not** gate read/update access: any authenticated user can read or update any certificate. It exists for audit/display only in this change.

`DELETE` is the one operation restricted to `ADMIN`. Enforced in `SecurityConfig` with an HTTP-method-specific matcher (`requestMatchers(HttpMethod.DELETE, "/api/v1/certificates/**").hasRole("ADMIN")`) rather than a `@PreAuthorize` annotation on the controller — keeps every authorization rule in one place (`SecurityConfig`), consistent with how `feat/jwt-auth` already centralizes the public-endpoint list there instead of scattering `@PermitAll`/`@PreAuthorize` across controllers.

## Search and pagination

`GET /certificates` takes `page`, `size`, `sort` (standard Spring Data `Pageable`, resolved automatically by `PageableDefault`), `q` (case-insensitive substring match against `recipient_name`, `course_name`, `code`), and `status`. Implemented with a JPA Specification combining the optional `q` and `status` predicates, rather than several hand-written `@Query` permutations for each filter combination. The controller returns Spring Data's `Page<CertificateResponse>` directly — it already serializes to `{content, totalElements, totalPages, ...}`, which is exactly what the spec's "Pagination bounds the result set" scenario asks for, with no custom response wrapper needed.

## Validation

Bean Validation on the request DTO per `docs/style-guide.md`: `@NotBlank` on the string fields, `@Email` on `recipientEmail`, `@Positive` on `workloadHours`, `@NotNull` on the dates and `template`. `GlobalExceptionHandler` (from `feat/backend-skeleton`) already turns a `MethodArgumentNotValidException` into the RFC 7807 body the spec's "Missing required field" scenario expects — nothing new needed there.

## Package layout

```
com.certificategenerator.certificate
├── CertificateController      the 5 endpoints
├── CertificateService           create/list/get/update/delete, code retry loop
├── CertificateCodeGenerator      SecureRandom code generation
├── Certificate                    JPA entity
├── CertificateStatus, CertificateTemplate   enums
├── CertificateRepository, CertificateSpecifications
├── dto/                          CertificateRequest, CertificateResponse
├── CertificateMapper
└── CertificateNotFoundException   → 404, handled by the existing GlobalExceptionHandler
```
