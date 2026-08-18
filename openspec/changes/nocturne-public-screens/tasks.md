## 1. Login screen

- [x] 1.1 `login-page.component.html`: rewrite on Tailwind utilities — accent radial glow layer, 400px column, title and subtitle, `surface` card at `rounded-lg` with the elevation-1 ring.
- [x] 1.2 Replace each `mat-form-field` with a `label` + `input` pair: 12px muted label, input with `bg-bg`, neutral border, accent caret, accent focus border, and an 11.5px error line bound to the existing form control state.
- [x] 1.3 Wrong-credentials, rate-limit and cold-start notices become bordered tinted panels (revoked, pending and info token pairs) with a leading icon, replacing the shared error line. Keep the existing distinction between the two — it is already specified.
- [x] 1.4 Submit button: accent-bordered ghost, disabled at `opacity-45` while submitting, with the inline spinner and the cold-start label already specified.
- [x] 1.5 Add the "Verify a code" link to the public verification page.
- [x] 1.6 Drop `MatCard`, `MatFormField`, `MatInput`, `MatButton` and `MatProgressSpinner` from the component's imports; reduce `.scss` to what utilities cannot express.

## 2. Public verification page

- [x] 2.1 `app.routes.ts`: add `{ path: "verify", component: VerifyPageComponent }` next to `verify/:code`, both outside the authenticated shell.
- [x] 2.2 `verify-page.component.ts`: read the optional `code` route param; when absent, `rxResource`'s params return `undefined` so the idle page issues no request at all. The code-shape check lives in `verification/data/certificate-code.ts` so the in-app lookup can share it.
- [x] 2.3 Submitting the form navigates to `/verify/{code}` rather than calling the API in place, so the result stays linkable.
- [x] 2.4 `verify-page.component.html`: the entry form on a `surface` card, then the result card — 58px status circle, title in the semantic color, code in tabular numerals inside an accent-bordered capsule, `<dl>` of recipient, course, workload and issue date.
- [x] 2.5 State treatments: checking (spinner plus the code being checked), valid (issued tokens), revoked (revoked tokens, fields at reduced opacity), not yet issued (pending tokens), not found (neutral), rate limited (pending tokens with the wait message). Every existing state requirement keeps its wording on screen.
- [x] 2.6 Drop the Material imports; both component stylesheets are deleted outright — nothing on either screen needs CSS the utilities cannot express.

- [x] 2.7 A 12px step joins the type scale, and the gradient and the revoked dimming become named utilities, so neither page carries a raw value.

## 3. Tests

- [x] 3.1 `verify-page.component.spec.ts`: `/verify` renders the idle form and makes no request; a malformed code shows the format message and makes no request; a well-formed submission navigates to `/verify/{code}`; the checking state renders while the request is pending; the revoked result renders every detail field.
- [x] 3.2 `login-page.component.spec.ts`: the verification link points at the public verification route; the existing rate-limit-versus-generic-error and cold-start assertions still pass against the new markup.

## 4. Verification

- [x] 4.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 4.2 Both screens checked against the mockups at 375px, 900px and 1440px; touch targets on mobile are at least 44px.
- [x] 4.3 Keyboard pass on both screens: every control reachable, focus ring visible. Enter submission is standard implicit submission (a single default submit button per form) and could not be exercised through the browser automation — a plain HTML control form does not submit on Enter there either — so the submit path was verified via `form.requestSubmit()`, which runs the same algorithm.
- [x] 4.4 `npx -y @fission-ai/openspec@latest validate nocturne-public-screens --type change --strict` passes.
