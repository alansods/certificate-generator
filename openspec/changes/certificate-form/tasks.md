## 1. Data layer

- [ ] 1.1 `certificates.api.ts`: add `get(id)`, `create(request)`, `update(id, request)`.

## 2. Form page

- [ ] 2.1 `certificate-form-page.component.ts`: typed reactive form matching `CertificateRequest`'s fields; reads `id` route param to decide create vs. edit; loads existing values via `get(id)` in edit mode.
- [ ] 2.2 Client-side validation: required fields, email format, positive workload hours.
- [ ] 2.3 Field-error mapping: a 400 response's `fieldErrors` set onto the matching form control.
- [ ] 2.4 Template preview: three static CSS preview cards next to the template select, per design.md.
- [ ] 2.5 Submit: `create()` on the new route, `update(id, ...)` on the edit route; navigate to the certificate list on success; submit button disabled while in flight.
- [ ] 2.6 Delete action: rendered only in edit mode and only for ADMIN (`isAdmin()`, same pattern as the list page), confirmation via the existing `ConfirmDialogComponent`, navigates to the list on success.
- [ ] 2.7 `.html`/`.scss`: tokens only, `@if`/`@for` only, `OnPush`.

## 3. Routing and list-page wiring

- [ ] 3.1 `app.routes.ts`: add `certificates/new` and `certificates/:id/edit` to the authenticated shell's children.
- [ ] 3.2 `certificate-list-page.component.ts`/`.html`: add a "New certificate" button and a per-row edit link.

## 4. Tests

- [ ] 4.1 `certificates.api.spec.ts` additions: `get`/`create`/`update` hit the right URLs with the right bodies.
- [ ] 4.2 `certificate-form-page.component.spec.ts`: create mode submits and navigates on success; edit mode loads and pre-fills existing values; server-side field errors are shown on the right controls; client-side validation blocks submission without a request; delete is absent for non-admin and present + working for ADMIN in edit mode.

## 5. Verification

- [ ] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 5.2 `openspec validate certificate-form --type change --strict` passes.
