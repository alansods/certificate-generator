## Context

The last of the four frontend feature changes. Unlike every other page so far, this one is public: no `authGuard`, no `ShellComponent` chrome, and its only caller is an anonymous person scanning a QR code or following a shared link — there is no "user" in the authenticated sense at all.

## Reactive route param, not a constructor-time snapshot

`certificate-form`'s review (`openspec/changes/archive/2026-08-16-certificate-form/`) flagged its constructor-time `route.snapshot.paramMap` read as a latent bug under Angular's default `RouteReuseStrategy`, left unfixed there because the only entry points into that route came from a different route config. This page has no such guarantee — a `code` typo'd into the URL bar, corrected, and re-submitted without a full page reload is a real, easy-to-hit case for a public page with no in-app navigation guiding the user. So `VerifyPageComponent` reads the route param reactively: `toSignal(route.paramMap.pipe(map(params => params.get('code'))))` feeding an `rxResource`, the same pattern `certificate-list` already established for tying a signal to an HTTP-backed resource — not a new pattern, just applied here instead of the snapshot shortcut.

## Four states, not two

`toProblemDetail()` (already used by every other page) normalizes the error, and the page branches on `problem.status`: `404` renders "no certificate found for this code" (not a generic error — the single most common real-world case, since a hand-typed code is easy to get wrong), `429` renders "too many attempts, try again shortly" (matching `public-verification`'s own rate-limit requirement, `openspec/specs/public-verification/spec.md`), anything else renders a generic error message. A successful response branches again on the returned `status` field (`DRAFT`/`ISSUED`/`REVOKED`) — all three are valid, existing certificates and the endpoint returns 200 for all of them (per spec, `REVOKED` is deliberately not a 404) — with distinct visual treatment (a status badge: neutral for `DRAFT`, affirmative for `ISSUED`, a clear warning for `REVOKED`) so a verifier can't misread a revoked certificate as valid at a glance.

## No layout chrome, minimal styling

No `MatToolbar`/sidenav — this route was already outside `ShellComponent` before this change and stays that way. The page is a single centered card: certificate details when found, a message when not. Reuses `_tokens.scss` for spacing/color exactly like every other page; no new tokens needed.

## Package layout

```
frontend/src/app/features/verification/
├── data/
│   ├── certificate-verification-response.ts
│   └── verification.api.ts
└── pages/verify-page/
    ├── verify-page.component.ts
    ├── verify-page.component.html
    └── verify-page.component.scss
```

A new `features/verification/` rather than folding into `features/certificates/` — this capability has no authenticated data layer, no shared components, and no reason to ever import from or be imported by the certificates feature.
