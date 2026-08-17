## Context

`certificate-list`'s existing `downloadPdf()` already fetches the PDF as a blob (`CertificatesApi.downloadPdf(id)`, `responseType: "blob"`) purely to drive a synthetic `<a download>` click. This change reuses that exact same fetch for a second purpose: rendering the blob inline instead of immediately saving it.

## A dedicated route, not a dialog

An earlier draft of this change used a `MatDialog`. The owner asked for a full page instead — reachable at `/certificates/:id/preview`, inside the authenticated shell, with its own back link to the list. `CertificatePreviewPageComponent` fetches the certificate's metadata (`CertificatesApi.get(id)`, for the code shown in the heading and used as the download filename) and then the PDF blob (`CertificatesApi.downloadPdf(id)`), chained via `switchMap` so a single loading/error state covers both requests. The certificate `id` is read from `route.snapshot.paramMap` at construction — the same tradeoff already made (and documented) by `certificate-form-page.component.ts`: this route is only ever reached from the list page's per-row link, a different route config, so navigating between two preview pages back-to-back without a full route destroy isn't a case that can happen today.

## `<iframe>` rendering, not a PDF library

The page's content is a plain `<iframe [src]="safeBlobUrl">` pointed at a `URL.createObjectURL(blob)` — every evergreen browser (Chrome, Firefox, Safari, Edge) has a built-in PDF viewer that renders a PDF blob URL inside an iframe natively, so no PDF-rendering library is added as a dependency.

`Content-Disposition: attachment` (set by the backend's PDF endpoint) only affects a browser's behavior when navigating directly to a URL — it has no effect on a blob fetched via `HttpClient` and rendered through `URL.createObjectURL`, so no backend change is needed to make the same endpoint serve both the direct-download button and this preview.

## No `iframe sandbox` attribute

Tried a defense-in-depth `sandbox="allow-same-origin"` first, on the theory that it costs nothing since the content is server-generated and same-origin. It does cost something: verified manually that Chrome's built-in PDF viewer refuses to render inside a sandboxed iframe at all (it shows a broken-document placeholder instead of the PDF, sandboxed or not, with any token combination tried) — plugin-backed content rendering isn't compatible with the `sandbox` attribute the way a same-origin HTML document would be. Reverted; the `<iframe>` has no `sandbox` attribute. This isn't a meaningful security regression relative to the already-existing direct-download path: the PDF bytes are identical either way, and the browser's own PDF renderer is exactly what already handles a directly-downloaded PDF once opened.

## Loading and error states, reusing established patterns

A spinner (`mat-spinner`, the same pattern as every other loading state in this codebase) shows while both requests are in flight; a failure of either request shows an inline error message, not a silently blank page.

## Cleanup

The blob URL is revoked (`URL.revokeObjectURL`) via `DestroyRef.onDestroy()` when the user navigates away — a route change destroys the component, unlike a dialog's `afterClosed()`, so this is the equivalent hook for a routed page.

## Security: `DomSanitizer`

Angular sanitizes `[src]` bindings by default and blocks `blob:` URLs on an `<iframe>` unless explicitly marked safe via `DomSanitizer.bypassSecurityTrustResourceUrl()`. This is safe here specifically because the blob URL is constructed locally from the app's own backend response (reached via the app's configured `API_BASE_URL`, with the auth interceptor attaching the access token) — never from user-supplied or externally-sourced input — so there's no injection surface being bypassed.

## Package layout

```
frontend/src/app/features/certificates/pages/certificate-preview-page/
├── certificate-preview-page.component.ts
├── certificate-preview-page.component.html
└── certificate-preview-page.component.scss
```

`certificate-list-page.component.html`'s preview action becomes a `routerLink` (matching the existing edit link's pattern) rather than a `(click)` handler opening a dialog.
