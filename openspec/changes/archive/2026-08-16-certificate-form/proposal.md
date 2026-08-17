## Why

Backlog item 2.4 (`docs/PLAN.md`). `feat/certificate-list` (2.3) can display and delete certificates but not create or edit one — the list's "New certificate" affordance and per-row edit link have nowhere to go yet.

## What Changes

A single form component (`features/certificates/pages/certificate-form-page/`) used for both create and edit, switched by route (`/certificates/new` vs `/certificates/:id/edit`): a typed reactive form matching the backend's `CertificateRequest` fields, client-side validation mirroring the backend's own constraints (required fields, email format, positive workload hours), a template picker with a lightweight visual preview distinguishing the three layouts, and — on the edit route only, and only for ADMIN — a delete action reusing the existing `ConfirmDialogComponent` from `feat/certificate-list`. The list page gains a "New certificate" button and a per-row edit link pointing at these new routes.

## Capabilities

### New Capabilities
- `certificate-form` — create/edit form, validation, template preview, delete confirmation. See `specs/certificate-form/spec.md`.

### Modified Capabilities
_None._ Consumes `openspec/specs/certificates/spec.md`'s existing endpoints (`POST`, `PUT`, `GET /{id}`, `DELETE`) as-is.

## Impact

- Adds `frontend/src/app/features/certificates/pages/certificate-form-page/`.
- Extends `features/certificates/data/certificates.api.ts` with `get(id)`, `create(request)`, `update(id, request)` (`deleteById` already exists from 2.3).
- `app.routes.ts`: adds `certificates/new` and `certificates/:id/edit` to the authenticated shell's children.
- `certificate-list-page.component.ts`/`.html`: adds a "New certificate" button and a per-row edit link.
- No backend impact.
