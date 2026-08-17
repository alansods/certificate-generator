## 1. Preview page

- [x] 1.1 `certificate-preview-page.component.ts`: reads the certificate id from the route snapshot, fetches certificate metadata then the PDF blob (chained), exposes loading/error/loaded states.
- [x] 1.2 `.html`: back-to-list link, spinner while loading, error message on failure, `<iframe>` (sandboxed) bound to a sanitized blob URL plus a Download button once loaded.
- [x] 1.3 Revoke the blob URL when the component is destroyed.
- [x] 1.4 `.scss`: tokens only.

## 2. Routing and list page wiring

- [x] 2.1 `app.routes.ts`: add `certificates/:id/preview` to the authenticated shell's children.
- [x] 2.2 `certificate-list-page.component.ts`/`.html`: the preview action becomes a `routerLink` to the new route, replacing the dialog-based `previewPdf()` method.

## 3. Tests

- [x] 3.1 `certificate-preview-page.component.spec.ts`: shows the spinner while the fetch is pending; shows the iframe with a blob URL and sandbox attribute once loaded; shows an error state on a failed certificate lookup and on a failed PDF fetch; the Download button triggers a save; the back link points to the list; the blob URL is revoked on destroy.
- [x] 3.2 `certificate-list-page.component.spec.ts`: the preview action's link href points at the right certificate's preview route.

## 4. Verification

- [x] 4.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 4.2 `openspec validate certificate-pdf-preview --type change --strict` passes.
