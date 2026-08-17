## 1. Preview dialog component

- [x] 1.1 `pdf-preview-dialog.component.ts`: accepts a certificate id via `MAT_DIALOG_DATA`, fetches the PDF blob on open via `CertificatesApi.downloadPdf(id)`, exposes loading/error/loaded states.
- [x] 1.2 `.html`: spinner while loading, error message + close action on failure, `<iframe>` bound to a sanitized blob URL plus Download/Close buttons once loaded.
- [x] 1.3 Revoke the blob URL when the dialog closes.
- [x] 1.4 `.scss`: tokens only, sized so the iframe is actually usable (not a tiny default dialog).

## 2. List page wiring

- [x] 2.1 `certificate-list-page.component.ts`: `previewPdf(certificate)` opening the dialog via `MatDialog`.
- [x] 2.2 `.html`: a "Preview" icon action per row, alongside the existing download and delete actions.

## 3. Tests

- [x] 3.1 `pdf-preview-dialog.component.spec.ts`: shows the spinner while the fetch is pending; shows the iframe with a blob URL once loaded; shows an error state with a close action on a failed fetch; revokes the blob URL on close; the in-dialog Download button triggers a save.
- [x] 3.2 `certificate-list-page.component.spec.ts`: clicking the preview action opens the dialog with the right certificate id (dialog itself stubbed via the same direct-field-assignment pattern already used for the delete-confirmation test in this file).

## 4. Verification

- [x] 4.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 4.2 `openspec validate certificate-pdf-preview --type change --strict` passes.
