## 1. Login screen

- [ ] 1.1 `login-page.component.html`: rewrite on Tailwind utilities — accent radial glow layer, 400px column, title and subtitle, `surface` card at `rounded-lg` with the elevation-1 ring.
- [ ] 1.2 Replace each `mat-form-field` with a `label` + `input` pair: 12px muted label, input with `bg-bg`, neutral border, accent caret, accent focus border, and an 11.5px error line bound to the existing form control state.
- [ ] 1.3 Wrong-credentials and rate-limit notices become bordered tinted panels (revoked and pending token pairs) with a leading icon, replacing the shared error line. Keep the existing distinction between the two — it is already specified.
- [ ] 1.4 Submit button: accent-bordered ghost, disabled at `opacity-45` while submitting, with the inline spinner and the cold-start label already specified.
- [ ] 1.5 Add the "Verify a code" link to the public verification page.
- [ ] 1.6 Drop `MatCard`, `MatFormField`, `MatInput`, `MatButton` and `MatProgressSpinner` from the component's imports; reduce `.scss` to what utilities cannot express.

## 2. Public verification page

- [ ] 2.1 `app.routes.ts`: add `{ path: "verify", component: VerifyPageComponent }` next to `verify/:code`, both outside the authenticated shell.
- [ ] 2.2 `verify-page.component.ts`: read the optional `code` route param; when absent, render the idle form and issue no request. Add a code-shape check (`CERT-` + two four-character alphanumeric groups) that gates submission.
- [ ] 2.3 Submitting the form navigates to `/verify/{code}` rather than calling the API in place, so the result stays linkable.
- [ ] 2.4 `verify-page.component.html`: the entry form on a `surface` card, then the result card — 58px status circle, title in the semantic color, code in tabular numerals inside an accent-bordered capsule, `<dl>` of recipient, course, workload and issue date.
- [ ] 2.5 State treatments: checking (spinner plus the code being checked), valid (issued tokens), revoked (revoked tokens, fields at reduced opacity), not yet issued (pending tokens), not found (neutral), rate limited (pending tokens with the wait message). Every existing state requirement keeps its wording on screen.
- [ ] 2.6 Drop the Material imports; reduce `.scss` accordingly.

## 3. Tests

- [ ] 3.1 `verify-page.component.spec.ts`: `/verify` renders the idle form and makes no request; a malformed code shows the format message and makes no request; a well-formed submission navigates to `/verify/{code}`; the checking state renders while the request is pending; the revoked result renders every detail field.
- [ ] 3.2 `login-page.component.spec.ts`: the verification link points at the public verification route; the existing rate-limit-versus-generic-error and cold-start assertions still pass against the new markup.

## 4. Verification

- [ ] 4.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 4.2 Both screens checked against the mockups at 375px, 900px and 1440px; touch targets on mobile are at least 44px.
- [ ] 4.3 Keyboard pass on both screens: every control reachable, focus ring visible, form submits on Enter.
- [ ] 4.4 `npx -y @fission-ai/openspec@latest validate nocturne-public-screens --type change --strict` passes.
