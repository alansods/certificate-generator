## 1. Data layer

- [x] 1.1 `features/certificates/data/certificate-page-response.ts`: `CertificateResponse` (matching `docs/api-reference.md`'s payload) and `CertificatePageResponse` (`{content, page: {size, number, totalElements, totalPages}}`).
- [x] 1.2 `features/certificates/data/certificates.api.ts`: `list(params)`, `deleteById(id)`, `downloadPdf(id)` (`responseType: 'blob'`).
- [x] 1.3 `core/auth/token-storage.service.ts`: add a `role` computed signal decoded from the access token's JWT payload.

## 2. List page

- [x] 2.1 `certificate-list-page.component.ts`: filter signals (`page`, `pageSize`, `status`) + debounced `query` (`toSignal` off a `FormControl`'s `valueChanges`), `rxResource` wired to `certificatesApi.list`.
- [x] 2.2 Material table (`MatTableModule`) + `MatPaginator` bound to the resource's page metadata; `MatSelect` status filter; search input.
- [x] 2.3 Row actions: download PDF (blob → temporary `<a>` + `URL.createObjectURL`), delete (confirmation via `MatDialog`, ADMIN-only per `role()`, reloads the resource on success).
- [x] 2.4 Empty state (zero results, distinct from loading) and error state (request failed, with a retry action) driven by `listResource.isLoading()`/`.error()`/`.value()`.
- [x] 2.5 `.html`/`.scss`: tokens only, `@if`/`@for` only, `OnPush`.

## 3. Routing

- [x] 3.1 `app.routes.ts`: shell's `children` gains `{ path: '', pathMatch: 'full', redirectTo: 'certificates' }` and `{ path: 'certificates', component: CertificateListPageComponent }`.

## 4. Tests

- [x] 4.1 `certificates.api.spec.ts` (`HttpTestingController`): `list` sends the right query params and parses the `{content, page}` shape; `deleteById`/`downloadPdf` hit the right URLs.
- [x] 4.2 `token-storage.service.spec.ts` addition: `role` decodes the JWT's role claim correctly, and is `null` with no access token.
- [x] 4.3 `certificate-list-page.component.spec.ts`: renders rows for a successful response; shows the empty state for zero results; shows the error state (with working retry) on a failed request; search input only re-fetches after the debounce; delete action is absent for a non-admin role and present for ADMIN; `confirmDelete()`'s dialog/API/reload wiring exercised directly (not through a full DOM click into Material's dialog stack — see the test's own comment for why).

## 5. Verification

- [x] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.2 `openspec validate certificate-list --type change --strict` passes.
