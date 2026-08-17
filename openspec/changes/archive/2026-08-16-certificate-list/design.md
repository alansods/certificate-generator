## Context

`login-page`'s design.md fixed the auth layer this page sits behind. This document covers the list page itself.

## Response shape

`CertificateController.list` returns `Page<Certificate>`, and the app has `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)` set (from `feat/certificate-crud`), which converts it to a `PagedModel<CertificateResponse>` before serialization. Confirmed directly from the `spring-data-commons:4.1.0` jar (`PagedModel.getMetadata()` carries `@JsonProperty("page")`), the actual JSON is:

```json
{
  "content": [ { "id": 1, "code": "CERT-...", "recipientName": "...", ... }, ... ],
  "page": { "size": 20, "number": 0, "totalElements": 42, "totalPages": 3 }
}
```

Not `{content, totalElements, ...}` flat, and not `{content, metadata}` — specifically `page`. `certificates.api.ts`'s response type models this exactly.

## Data fetching: `rxResource`

Angular's `rxResource` (`@angular/core/rxjs-interop`) ties a signal-derived request directly to an RxJS-returning loader, exposing `.value()`, `.isLoading()`, `.error()` as signals — precisely the empty/loading/error split this page's spec needs, with no hand-rolled subscription management:

```ts
private readonly params = computed(() => ({ page: this.page(), size: this.pageSize(), q: this.query(), status: this.status() }));
private readonly listResource = rxResource({
  params: this.params,
  stream: ({ params }) => this.certificatesApi.list(params),
});
```

Changing any filter signal automatically re-triggers the request; no manual `combineLatest`/`switchMap` wiring.

## Search debouncing

The search box is a plain `FormControl`, not one of the filter signals directly — `query` is derived via `toSignal(searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()), { initialValue: '' })`. Typing updates the control immediately (so the input feels responsive) but only pushes a new value into `query` — and therefore into `rxResource`'s params, and therefore a new HTTP request — after the user pauses, per the spec's explicit "debounced, not on every keystroke."

## Role-gated delete action — display only

The backend already enforces `DELETE /api/v1/certificates/{id}` as ADMIN-only (`SecurityConfig`); hiding the button for non-admins is purely so a USER doesn't see an action that would 403, not a security boundary in itself. `TokenStorageService` gains a `role` computed signal, decoded from the current access token's JWT payload (base64url-decode the middle segment, read the `role` claim — no signature verification needed client-side, since this is UI-only and the backend re-validates the token's signature on every request regardless). This is the first thing in the frontend that reads JWT claims; kept as a small, focused addition to `TokenStorageService` rather than a new "auth state" abstraction, since it's one derived field, not a new concern.

## Row actions

- **Download PDF**: `GET /api/v1/certificates/{id}/pdf` returns a binary PDF; `certificates.api.ts` requests it with `responseType: 'blob'`, and the component triggers a save via a temporary `<a>` element with `URL.createObjectURL(blob)` — the standard browser-only way to save a fetched blob, since there's no `<a download>` server-side redirect to lean on.
- **Delete**: confirmation via `MatDialog` (a plain confirm, not a full form) before calling `DELETE /api/v1/certificates/{id}`; on success, the resource is reloaded (`listResource.reload()`) rather than the row spliced out client-side, so pagination totals stay correct without duplicating the backend's counting logic.

## Package layout

```
frontend/src/app/features/certificates/
├── data/
│   ├── certificates.api.ts
│   └── certificate-page-response.ts   PagedModel<CertificateResponse> + CertificateResponse types
└── pages/
    └── certificate-list-page/
        ├── certificate-list-page.component.ts
        ├── certificate-list-page.component.html
        └── certificate-list-page.component.scss
```
