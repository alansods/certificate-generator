## Why

`design-spec.md` §5 puts the public screens first in the migration order: they are the two pages a stranger sees, they carry the least Material, and getting them right proves the token layer before the dense authenticated screens depend on it.

Two behavioral gaps show up in the mockups while doing it. The public verification page only exists at `/verify/:code`, so a recipient holding a printed code has nowhere to type it — the app assumes they arrived by scanning the QR. And the login screen is the only door into the product: someone who has a certificate but no account has no visible path to verification from it.

## What Changes

- The login screen is rebuilt without Material: the accent radial glow behind the card, the form on a `surface` card with 14px radius, labelled inputs with the accent caret and focus border, inline field errors, and the wrong-credentials and rate-limit notices as bordered tinted panels rather than a shared error line. The cold-start state keeps its behavior and gains the inline spinner inside the submit button.
- The login screen gains a "Verify a code" link to the public verification page.
- The public verification page accepts a code typed into the page, not only one carried in the URL. `/verify` renders the same page with an empty form; `/verify/:code` pre-fills it and looks the code up immediately. Submitting the form navigates to `/verify/:code` so the result stays linkable and shareable.
- The form validates the code shape (`CERT-XXXX-XXXX`) before calling the API, so a typo produces an inline message instead of a round trip and a "not found".
- The result becomes the loudest element on the page, per `design-spec.md` §3: a 58px status circle, a title in the semantic color, the code in tabular numerals inside an accent-bordered capsule, then the `<dl>` of details. Revoked keeps every field visible at reduced opacity — the information is disqualified, not hidden. The checking, not-found and rate-limited states get their own treatments.
- `MatCard`, `MatFormField`, `MatButton` and `MatProgressSpinner` leave both screens.

## Capabilities

### Modified Capabilities
- `public-verify-page` — gains a code-entry form and an explicit in-flight state; the existing valid, revoked, not-yet-issued, not-found and rate-limited requirements keep their behavior and are restated where the redesign changes what is rendered. See `specs/public-verify-page/spec.md`.
- `login-page` — gains a link to public verification. See `specs/login-page/spec.md`.

## Impact

- `frontend/src/app/features/auth/pages/login-page/` — template rewritten to Tailwind utilities, `.scss` reduced to what utilities cannot express, Material imports dropped.
- `frontend/src/app/features/verification/pages/verify-page/` — gains the form, the code-shape validation and the state treatments.
- `frontend/src/app/app.routes.ts` — adds the public `verify` route alongside `verify/:code`.
- No backend impact: `GET /api/v1/public/verify/{code}` already returns everything the page renders, and its rate limiting already produces the 429 the page shows.

## Non-goals

- The "Forgot your password?" and "Create one" links drawn on the login mockup. They arrive with `password-reset` and `user-signup`; adding dead links now would be worse than the gap.
- The authenticated verification page. That is `nocturne-shell-navigation`.
