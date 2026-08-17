## Why

Owner request, surfaced while manually trying the running app: the download action on the certificate list currently downloads the PDF directly with no way to look at it first. A user who isn't sure the certificate looks right (wrong template, typo in a field) only finds out after opening the downloaded file.

## What Changes

A "Preview" action added to each row's action column, next to the existing download and delete actions: navigates to a new page (`/certificates/:id/preview`) showing the certificate's actual generated PDF inline (not a static approximation — the same bytes `GET /{id}/pdf` already returns), with a "Download" button on the page for the user to save it once they've looked at it, and a link back to the list. The existing direct-download icon action on the list row is unchanged, for anyone who just wants the file without looking first.

## Capabilities

### Modified Capabilities
- `certificate-list` — the "Row actions" requirement gains a preview scenario alongside the existing download scenario. See `specs/certificate-list/spec.md`.

## Impact

- Adds `frontend/src/app/features/certificates/pages/certificate-preview-page/`.
- `app.routes.ts`: adds `certificates/:id/preview` to the authenticated shell's children.
- `certificate-list-page.component.ts`/`.html`: adds the preview action as a link to the new route, reusing the existing `CertificatesApi.downloadPdf(id)`/`get(id)` calls rather than adding a new endpoint or backend change.
- No backend impact — `GET /api/v1/certificates/{id}/pdf` already returns the exact bytes needed; the new page just renders them inline via a blob URL instead of triggering an immediate save.
