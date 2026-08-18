## Why

The last three authenticated screens still carry the most Material of anything left: the form is nine `mat-form-field`s, the batch page is a `mat-table` of row errors, and the preview page is a spinner over an iframe. `design-spec.md` puts them last in the migration order for that reason.

Each of them also loses something in translation today. Template selection is a `mat-select` of three words, so the only way to find out what `MINIMAL` looks like is to save and generate the PDF. The preview page shows the PDF and nothing else — no code, no recipient, no way to jump to the edit form when the preview reveals a typo, which is the whole reason someone previews. And the batch result reports counts in a sentence, so a 40-row import with 6 failures gives no way to hand those 6 rows to whoever produced the file.

## What Changes

**Form.** Rebuilt on plain inputs with the Nocturne field treatment: two-column rows for the paired fields, inline errors under each field, a summary notice when a submit fails validation, and the delete action kept in the header for ADMIN on the edit form. Template selection becomes three cards, each rendering an A4-proportioned thumbnail of that template's actual layout — the serif double frame, the colored band with the QR, the sparse minimal setting. The selected card takes an accent border, an `accent-900` ground and a check. On the edit form, an "Open PDF preview" action goes straight to the preview page.

**Preview.** The page gains its context and its exit: a back link to the list, the certificate code as the title with recipient, course and template beside it, and Edit next to Download. The loading state becomes an A4-proportioned shimmer with "Generating the PDF…" instead of a bare spinner, so the page does not resize when the document arrives.

**Batch.** The drop area, the uploading state with progress, and the result get the Nocturne treatment. The result leads with three counters — total rows, created, failed — and the error list becomes a grid of line and reason. Two actions are added: "Download error report", which saves the failed rows as a CSV locally from the response the page already has, and "View in list", which goes to the certificate list. A rejected upload keeps its distinct single-message treatment.

`MatFormField`, `MatSelect`, `MatDatepicker`, `MatTable`, `MatIcon` and `MatProgressSpinner` leave all three screens — the last Angular Material components in the app. The delete confirmation already moved to the CDK dialog in `nocturne-certificate-list`, so this change ends with `npm uninstall @angular/material` and the deletion of every file that existed to theme it.

## Capabilities

### Modified Capabilities
- `certificate-form` — "Template preview" becomes a per-template thumbnail shown for all three at once rather than a preview of the selected one; gains an action opening the PDF preview from the edit form. See `specs/certificate-form/spec.md`.
- `batch-upload-ui` — the result gains counters as distinct figures and an error report download. See `specs/batch-upload-ui/spec.md`.

### Added Capabilities
- `certificate-list` — the preview page gains a requirement covering the certificate context it shows and the edit and back actions it offers. See `specs/certificate-list/spec.md`.

## Impact

- `frontend/src/app/features/certificates/pages/certificate-form-page/`, `certificate-preview-page/` and `batch-upload-page/` — templates, styles and components.
- The template thumbnails are three small presentational components under `features/certificates/ui/template-thumbnail/`, sharing one A4 frame.
- The error report is generated client-side from the `errors` array already in `BatchImportResponse`; no new endpoint.
- With these screens migrated, `@angular/material` is uninstalled and `frontend/src/styles.scss` and `frontend/src/styles/_material-overrides.scss` are deleted along with it — the `--mat-sys-*` mapping, the strong focus indicators and the density setting all existed only to hold Material together during the migration. `frontend/src/styles/_tokens.scss` drops to whatever component SCSS still reads it. `@angular/cdk` stays.
- `frontend/src/index.html` — the Material Icons stylesheet link goes with the last `mat-icon`; the icons are already inline SVG on the rebuilt screens.
- `frontend/src/styles.spec.ts` — the assertions about the Material mapping are removed with the mapping; the token assertions stay.
- No backend impact.

## Non-goals

- Changing the PDF templates themselves. The thumbnails approximate what the Thymeleaf templates already render; if they drift, the thumbnail is what gets corrected.
- Live-rendering the real PDF while the form is being filled. The mockup's preview action navigates to the existing preview page, which needs a saved certificate.
