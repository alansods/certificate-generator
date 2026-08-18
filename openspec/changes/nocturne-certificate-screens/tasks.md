## 1. Certificate form

- [ ] 1.1 Replace every `mat-form-field` with the Nocturne label/input pair, keeping the existing reactive form, validators and error messages. Pair the fields into two-column rows as drawn: recipient name/email, workload/completion date/issue date, course and instructor full width.
- [ ] 1.2 Header: back link, title, and — on the edit form for an ADMIN — the delete action in the revoked treatment, keeping the existing confirmation dialog.
- [ ] 1.3 Summary notice above the form when a submit is blocked by validation, alongside the existing per-field messages.
- [ ] 1.4 Date inputs: native `type="date"` controls styled to the field treatment; drop `MatDatepicker`.
- [ ] 1.5 Drop the Material imports from the component; reduce `.scss`.

## 2. Template cards

- [ ] 2.1 Add `features/certificates/ui/template-thumbnail/`: one A4-ratio frame component plus the three template renderings — CLASSIC's serif double frame, MODERN's colored band with the QR block, MINIMAL's sparse setting.
- [ ] 2.2 Replace the template `mat-select` with a responsive grid of three cards, each a `button` bound to the form control, with the accent border, `accent-900` ground and check on the selected one, and `border-accent-600` on hover.
- [ ] 2.3 Cards are keyboard reachable and expose their selected state to assistive technology (`role="radio"` within a `role="radiogroup"`, or a native radio group visually replaced).
- [ ] 2.4 On the edit form, the "Open PDF preview" action linking to the preview page; not rendered on create.

## 3. Preview page

- [ ] 3.1 Header: back link to the list, the code as the title in tabular numerals, recipient · course · template beside it, then Edit and Download PDF.
- [ ] 3.2 Loading: an A4-ratio shimmer with the spinner and "Generating the PDF…", sized so the layout does not shift when the iframe appears.
- [ ] 3.3 Keep the existing error state and blob-URL revocation; restyle only.

## 4. Batch upload page

- [ ] 4.1 Drop area and picker in the Nocturne treatment, with the sample CSV download kept as a secondary action.
- [ ] 4.2 Uploading state with the progress treatment from the mockup.
- [ ] 4.3 Result: three labelled counters (total rows, created, failed), then the error list as a grid of line and reason; success treatment when there are none.
- [ ] 4.4 "Download error report": build a CSV from the response's `errors` array client-side and save it; render the action only when there are failures.
- [ ] 4.5 "View in list" navigating to the certificate list, alongside the existing "Upload another file".
- [ ] 4.6 Keep the rejected-upload state as a single message with no counters.
- [ ] 4.7 Drop `MatTable` and the other Material imports; reduce `.scss`.

## 5. Material teardown

- [ ] 5.1 Confirm no `Mat*` symbol is imported anywhere in `src/` — this change removes the last of them.
- [ ] 5.2 Delete `frontend/src/styles.scss` and `frontend/src/styles/_material-overrides.scss`, and drop `src/styles.scss` from `angular.json`. The `--mat-sys-*` mapping, `mat.strong-focus-indicators`, the density setting and the token radii overrides all existed only to hold Material together during the migration.
- [ ] 5.3 `npm uninstall @angular/material`. Keep `@angular/cdk` — the confirm dialog is built on it.
- [ ] 5.4 Remove the Material Icons stylesheet link from `frontend/src/index.html`; every icon is inline SVG by now.
- [ ] 5.5 `frontend/src/styles.spec.ts`: drop the assertions about the Material mapping along with the mapping, keep the token-layer ones.
- [ ] 5.6 Confirm no `::ng-deep` was added anywhere during the migration.
- [ ] 5.7 Re-check the bundle: with Material gone the initial budget overrun in `angular.json` should have closed. Tighten the budget to the new size rather than leaving a warning nobody reads.

## 6. Tests

- [ ] 6.1 `certificate-form-page.component.spec.ts`: all three template cards render; selecting one sets the control; the selected card is marked; existing validation and delete-confirmation cases pass against the new markup; the preview action appears only in edit mode and links to the preview route.
- [ ] 6.2 `certificate-preview-page.component.spec.ts`: the header shows code, recipient, course and template; edit links to the edit route; back links to the list; existing loading, loaded, error and revoke cases still pass.
- [ ] 6.3 `batch-upload-page.component.spec.ts`: the three counters render for a clean and a partial import; the error report action is absent with no failures and produces a CSV of the failed rows when present; "View in list" navigates; the rejection state shows no counters.

## 7. Verification

- [ ] 7.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 7.2 Against the running backend: create, edit and delete a certificate; preview and download its PDF; import a CSV with deliberate bad rows and open the error report.
- [ ] 7.3 Each template thumbnail compared side by side with the PDF that template actually generates; correct the thumbnail where they disagree.
- [ ] 7.4 Keyboard pass on all three screens, including the template card group.
- [ ] 7.5 Checked at 375px, 900px and 1440px against the mockups.
- [ ] 7.6 `npx -y @fission-ai/openspec@latest validate nocturne-certificate-screens --type change --strict` passes.
