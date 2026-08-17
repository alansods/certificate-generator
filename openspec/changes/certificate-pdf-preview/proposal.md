## Why

Owner request, surfaced while manually trying the running app: the download action on the certificate list currently downloads the PDF directly with no way to look at it first. A user who isn't sure the certificate looks right (wrong template, typo in a field) only finds out after opening the downloaded file.

## What Changes

A "Preview" action added to each row's action column, next to the existing download and delete actions: opens a dialog showing the certificate's actual generated PDF inline (not a static approximation — the same bytes `GET /{id}/pdf` already returns), with a "Download" button inside the dialog for the user to save it once they've looked at it. The existing direct-download icon action is unchanged, for anyone who just wants the file without looking first.

## Capabilities

### Modified Capabilities
- `certificate-list` — the "Row actions" requirement gains a preview scenario alongside the existing download scenario. See `specs/certificate-list/spec.md`.

## Impact

- Adds `frontend/src/app/features/certificates/shared/pdf-preview-dialog.component.ts` (new, reusable — not scoped to the list page only, in case a future page wants the same preview).
- `certificate-list-page.component.ts`/`.html`: adds the preview action, reusing the existing `CertificatesApi.downloadPdf(id)` call (already returns a blob) rather than adding a new endpoint or backend change.
- No backend impact — `GET /api/v1/certificates/{id}/pdf` already returns the exact bytes needed; the dialog just renders them inline via a blob URL instead of triggering an immediate save.
