## 1. Certificate form

- [x] 1.1 Replace every `mat-form-field` with the Nocturne label/input pair, keeping the existing reactive form, validators and error messages. Pair the fields into two-column rows as drawn: recipient name/email, workload/completion date/issue date, course and instructor full width.
- [x] 1.2 Header: back link, title, and — on the edit form for an ADMIN — the delete action in the revoked treatment, keeping the existing confirmation dialog.
- [x] 1.3 Summary notice above the form when a submit is blocked by validation, alongside the existing per-field messages.
- [x] 1.4 Date inputs: native `type="date"` controls styled to the field treatment; drop `MatDatepicker`.
- [x] 1.5 Drop the Material imports from the component; reduce `.scss`.

## 2. Template cards

- [x] 2.1 Add `features/certificates/ui/template-thumbnail/`: one A4-ratio frame component plus the three template renderings — CLASSIC's serif double frame, MODERN's colored band with the QR block, MINIMAL's sparse setting. The frame is A4 **landscape**: the Thymeleaf templates all declare `@page { size: A4 landscape }`, so a portrait thumbnail would preview a page the app never generates.
- [x] 2.2 Replace the template `mat-select` with a responsive grid of three cards, each a `button` bound to the form control, with the accent border, `accent-900` ground and check on the selected one, and `border-accent-600` on hover.
- [x] 2.3 Cards are keyboard reachable and expose their selected state to assistive technology (`role="radio"` within a `role="radiogroup"`, or a native radio group visually replaced).
- [x] 2.4 On the edit form, the "Open PDF preview" action linking to the preview page; not rendered on create.

## 3. Preview page

- [x] 3.1 Header: back link to the list, the code as the title in tabular numerals, recipient · course · template beside it, then Edit and Download PDF.
- [x] 3.2 Loading: an A4-ratio shimmer with the spinner and "Generating the PDF…", sized so the layout does not shift when the iframe appears.
- [x] 3.3 Keep the existing error state and blob-URL revocation; restyle only.

## 4. Batch upload page

- [x] 4.1 Drop area and picker in the Nocturne treatment, with the sample CSV download kept as a secondary action.
- [x] 4.2 Uploading state with the progress treatment from the mockup. This needed `CertificatesApi.uploadBatch` to start reporting progress (`reportProgress`/`observe: "events"`), so it returns a `BatchUploadEvent` union now — a determinate bar over a request that reports nothing would have been an animation, not progress. The percent is nullable and renders indeterminate when the body length is unknown.
- [x] 4.3 Result: three labelled counters (total rows, created, failed), then the error list as a grid of line and reason; success treatment when there are none.
- [x] 4.4 "Download error report": build a CSV from the response's `errors` array client-side and save it; render the action only when there are failures.
- [x] 4.5 "View in list" navigating to the certificate list, alongside the existing "Upload another file".
- [x] 4.6 Keep the rejected-upload state as a single message with no counters.
- [x] 4.7 Drop `MatTable` and the other Material imports; reduce `.scss`.

## 5. Material teardown

- [x] 5.1 Confirm no `Mat*` symbol is imported anywhere in `src/` — this change removes the last of them.
- [x] 5.2 Delete `frontend/src/styles.scss` and `frontend/src/styles/_material-overrides.scss`, and drop `src/styles.scss` from `angular.json`. `_tokens.scss`, `_breakpoints.scss` and the empty `app/app.scss` went with them: nothing outside the deleted files read any of them, so the SCSS layer is gone entirely rather than reduced. The `--mat-sys-*` mapping, `mat.strong-focus-indicators`, the density setting and the token radii overrides all existed only to hold Material together during the migration.
- [x] 5.3 `npm uninstall @angular/material`. Keep `@angular/cdk` — the confirm dialog is built on it.
- [x] 5.4 Remove the Material Icons stylesheet link from `frontend/src/index.html`; every icon is inline SVG by now. The two `fonts.googleapis.com`/`fonts.gstatic.com` preconnect hints went with it — they existed only for that stylesheet, and Inter is served locally from `@fontsource`.
- [x] 5.5 `frontend/src/styles.spec.ts`: drop the assertions about the Material mapping along with the mapping, keep the token-layer ones.
- [x] 5.6 Confirm no `::ng-deep` was added anywhere during the migration.
- [x] 5.7 Re-check the bundle: with Material gone the initial budget overrun in `angular.json` should have closed. Tighten the budget to the new size rather than leaving a warning nobody reads. It did not fully close — 783.03 kB to 549.28 kB, still over the old 500 kB warning. The budget is now 560 kB warning / 620 kB error, set to what the app actually is rather than to an aspiration that was warning on every build.

## 6. Tests

- [x] 6.1 `certificate-form-page.component.spec.ts`: all three template cards render; selecting one sets the control; the selected card is marked; existing validation and delete-confirmation cases pass against the new markup; the preview action appears only in edit mode and links to the preview route.
- [x] 6.2 `certificate-preview-page.component.spec.ts`: the header shows code, recipient, course and template; edit links to the edit route; back links to the list; existing loading, loaded, error and revoke cases still pass.
- [x] 6.3 `batch-upload-page.component.spec.ts`: the three counters render for a clean and a partial import; the error report action is absent with no failures and produces a CSV of the failed rows when present; "View in list" navigates; the rejection state shows no counters.

## 6b. Specification gaps found while building

- [x] 6b.1 Specify and test the validation summary, which the proposal described but no requirement covered.
- [x] 6b.2 Specify and test the template cards as a single tab stop with arrow-key movement — the delta only said "activates one", which a set of three tab stops would also satisfy.
- [x] 6b.3 Specify and test drag-and-drop onto the upload area, and upload progress in both its determinate and indeterminate forms.

## 6c. Review fixes

- [x] 6c.1 `uploadBatch` no longer asserts `HttpResponse.body` non-null: a 204 or an empty 200 would have emitted a `done` carrying null, putting the page back to the picker with neither a result nor an error.
- [x] 6c.2 The error list's columns move into `--error-list-columns` and its hairline into a `row-divider` utility, so the header and the rows cannot drift; the list goes back to a real `<table>` with a caption.
- [x] 6c.3 The progress bar treated 0% as absent, showing the indeterminate shimmer under a "0% uploaded" caption. Fixed and covered by a test that fails without the fix.
- [x] 6c.4 The uploading panel was a live region, so every progress event re-announced the whole block. Only the opening line is spoken now; the progressbar carries the changing value.
- [x] 6c.5 Roving focus finds its target by `data-template` inside the closest radiogroup rather than by index off `parentElement`, so a wrapper or a reordering cannot move selection and focus to different cards. Home/End added; modified arrow keys left to the browser.
- [x] 6c.6 A dropped file that is not a CSV is refused locally rather than uploaded for the server to reject — specified and tested.
- [x] 6c.7 The thumbnails' page proportions are asserted, which nothing did: the aspect ratio is also what gives the frame a definite height, and losing it is what made every bar collapse the first time.

- [x] 6c.8 The error list's rows went back to real table layout. Making them `display: grid` blockified the `<tr>`, and Blink and WebKit take the row and cell roles from the layout object — so the "accessible" table exposed no rows at all, worse than the div-with-roles version it replaced. Column widths come from a `<colgroup>` now; verified in the browser as `table-row`/`table-cell` with the line column at exactly 88px.
- [x] 6c.9 Test the null-body path, and stop reporting a server that answered with an unusable body as "could not reach the server".

- [x] 6c.10 Guard the error report against CSV formula injection: a reason beginning with `=`, `+`, `-`, `@`, tab or CR is executed by Excel and Sheets, and RFC 4180 quoting does not stop it because the parser strips the quotes first. Only the backend's habit of prefixing its messages was preventing it — an unstated invariant in a file this exporter does not own. Specified and tested; the test fails without the guard.
- [x] 6c.11 Pin the preview blob's MIME type instead of taking it from the response header. A `blob:` URL in an iframe inherits this document's origin, so a body arriving as `text/html` would be same-origin script holding a live session. The backend pins `application/pdf` today; the frontend no longer depends on that.
- [x] 6c.12 A failed sample-CSV download now says so rather than failing silently — specified under `Sample CSV template download` and tested, after the spec reviewer caught it shipping as unspecified, untested user-visible behavior. The pinned PDF type in 6c.11 had the same gap and got the same treatment: a scenario, and a test that flushes the document as `text/html` and asserts the blob is still `application/pdf`.
- [ ] 6c.13 **Not taken:** a client-side file size check before upload. The server caps uploads at 2MB through `spring.servlet.multipart.max-file-size`; duplicating that number in the frontend would drift and start rejecting files the server accepts. Worth doing if the limit is ever exposed by the API.

## 7. Verification

- [x] 7.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 7.2 Against the running backend: create, edit and delete a certificate; preview and download its PDF; import a CSV with deliberate bad rows and open the error report. Done. The `dev` profile already seeds an ADMIN, which no document outside `application-dev.yml` said — recorded in CLAUDE.md so the next session does not stall on a door that was open.

  Created `CERT-U4LU-ZMWH` through the rebuilt form with MODERN selected from the cards; edited its course and template to MINIMAL and saw both persist; previewed it and confirmed the iframe holds a real `%PDF-1.4` of 19,467 bytes typed `application/pdf`, at the page's own 1.414 ratio; downloaded it as `CERT-U4LU-ZMWH.pdf`; imported a 6-row CSV with four deliberately bad rows and got 6 / 2 / 4 across the counters with the grid sorted by line; downloaded the error report and confirmed the CSV keeps its UTF-8 accents; deleted through the confirmation dialog and saw the success toast name the certificate and carry no alert role.

  **One defect found, not fixable here:** the backend's validation messages arrive in Portuguese ("recipientEmail não deve estar em branco"), because Hibernate Validator resolves its defaults against the JVM's default locale. They are user-facing copy, which CLAUDE.md requires to be American English, and the language depends on where the process runs. A raw `No enum constant com.certificategenerator...` also leaks into the same field. Both are backend concerns and are filed for their own change.
- [x] 7.3 Each template thumbnail compared side by side with the PDF that template actually generates; correct the thumbnail where they disagree. The three Thymeleaf templates were rendered directly and measured against the thumbnails. Two defects found and fixed: every content bar had **zero height** (percentage heights do not resolve against a flex parent of automatic height, so the thumbnails were near-empty frames), and all three centered their content vertically where the templates are top-weighted. Content now ends at 67% / 57% / 47% of the page against the templates' computed 65% / 53% / 44%.
- [x] 7.4 Keyboard pass on all three screens, including the template card group. Tab order verified in the browser: the seven fields, then a single stop on the template group, then Save and Cancel. Arrow keys move and wrap, `aria-checked` and `tabindex` follow, and the focus ring measures `2px solid var(--color-accent-500)` at every stop. One defect found and fixed: the batch page's file input is `sr-only`, so its focus ring was drawn around a 1x1 box and a keyboard user saw nothing — the visible drop area now carries the ring, guarded by a test.
- [x] 7.5 Checked at 375px, 900px and 1440px against the mockups. No horizontal overflow at any width; the paired fields and the template cards stack below the medium breakpoint and sit in two and three columns above it. One defect found and fixed: the back link on all three screens was 31px tall, under the 44px minimum. The shell's brand link is still 31px, but it belongs to `frontend-shell` and predates this change — filed rather than fixed here.
- [x] 7.6 `npx -y @fission-ai/openspec@latest validate nocturne-certificate-screens --type change --strict` passes.
