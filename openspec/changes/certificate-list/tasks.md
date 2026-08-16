## 1. Data layer

- [ ] 1.1 `features/certificates/data/certificate-page-response.ts`: `CertificateResponse` (matching `docs/api-reference.md`'s payload) and `CertificatePageResponse` (`{content, page: {size, number, totalElements, totalPages}}`).
- [ ] 1.2 `features/certificates/data/certificates.api.ts`: `list(params)`, `deleteById(id)`, `downloadPdf(id)` (`responseType: 'blob'`).
- [ ] 1.3 `core/auth/token-storage.service.ts`: add a `role` computed signal decoded from the access token's JWT payload.

## 2. List page

- [ ] 2.1 `certificate-list-page.component.ts`: filter signals (`page`, `pageSize`, `status`) + debounced `query` (`toSignal` off a `FormControl`'s `valueChanges`), `rxResource` wired to `certificatesApi.list`.
- [ ] 2.2 Material table (`MatTableModule`) + `MatPaginator` bound to the resource's page metadata; `MatSelect` status filter; search input.
- [ ] 2.3 Row actions: download PDF (blob → temporary `<a>` + `URL.createObjectURL`), delete (confirmation via `MatDialog`, ADMIN-only per `role()`, reloads the resource on success).
- [ ] 2.4 Empty state (zero results, distinct from loading) and error state (request failed, with a retry action) driven by `listResource.isLoading()`/`.error()`/`.value()`.
- [ ] 2.5 `.html`/`.scss`: tokens only, `@if`/`@for` only, `OnPush`.

## 3. Routing

- [ ] 3.1 `app.routes.ts`: shell's `children` gains `{ path: '', pathMatch: 'full', redirectTo: 'certificates' }` and `{ path: 'certificates', component: CertificateListPageComponent }`.

## 4. Tests

- [ ] 4.1 `certificates.api.spec.ts` (`HttpTestingController`): `list` sends the right query params and parses the `{content, page}` shape; `deleteById`/`downloadPdf` hit the right URLs.
- [ ] 4.2 `token-storage.service.spec.ts` addition: `role` decodes the JWT's role claim correctly, and is `null` with no access token.
- [ ] 4.3 `certificate-list-page.component.spec.ts`: renders rows for a successful response; shows the empty state for zero results; shows the error state (with working retry) on a failed request; search input only re-fetches after the debounce; delete action is absent for a non-admin role and present + working for ADMIN.

## 5. Verification

- [ ] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 5.2 `openspec validate certificate-list --type change --strict` passes.
