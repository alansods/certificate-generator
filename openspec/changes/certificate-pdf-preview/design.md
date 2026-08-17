## Context

`certificate-list`'s existing `downloadPdf()` already fetches the PDF as a blob (`CertificatesApi.downloadPdf(id)`, `responseType: "blob"`) purely to drive a synthetic `<a download>` click. This change reuses that exact same fetch for a second purpose: rendering the blob inline instead of immediately saving it.

## MatDialog with an embedded `<iframe>`, not a new route

A dialog (reusing the `MatDialogModule` pattern already established by `ConfirmDialogComponent`) rather than a dedicated `/certificates/:id/preview` route — this is a transient "look before you download" action tied to a specific row, not a page anyone would navigate to directly or bookmark. The dialog's content is a plain `<iframe [src]="safeBlobUrl">` pointed at a `URL.createObjectURL(blob)` — every evergreen browser (Chrome, Firefox, Safari, Edge) has a built-in PDF viewer that renders a PDF blob URL inside an iframe natively, so no PDF-rendering library is added as a dependency.

`Content-Disposition: attachment` (set by the backend's PDF endpoint) only affects a browser's behavior when navigating directly to a URL — it has no effect on a blob fetched via `HttpClient` and rendered through `URL.createObjectURL`, so no backend change is needed to make the same endpoint serve both the direct-download button and this preview.

## Loading and error states, reusing established patterns

Opening the dialog immediately shows a spinner (same `mat-spinner` pattern as every other loading state in this codebase) while the blob is fetched; a fetch failure shows an inline error message with a close action, not a silently blank dialog. Once loaded, the dialog shows the PDF iframe plus a "Download" button (triggers the same save-the-blob behavior the row's existing download icon already has) and a "Close" button.

## Cleanup

The blob URL is revoked (`URL.revokeObjectURL`) when the dialog closes, matching the existing deferred-revoke pattern from `downloadPdf()` — here revoked on `afterClosed()` rather than on a `setTimeout`, since the iframe holding the reference is torn down at the same moment.

## Security: `DomSanitizer`

Angular sanitizes `[src]` bindings by default and blocks `blob:` URLs on an `<iframe>` unless explicitly marked safe via `DomSanitizer.bypassSecurityTrustResourceUrl()`. This is safe here specifically because the blob URL is constructed locally from a same-origin, backend-issued PDF response — never from user-supplied or externally-sourced input — so there's no injection surface being bypassed.

## Package layout

```
frontend/src/app/features/certificates/shared/pdf-preview-dialog/
├── pdf-preview-dialog.component.ts
├── pdf-preview-dialog.component.html
└── pdf-preview-dialog.component.scss
```

`certificate-list-page.component.ts` gains a `previewPdf(certificate)` method opening this dialog via `MatDialog`, alongside the existing `downloadPdf()`/`confirmDelete()` methods.
