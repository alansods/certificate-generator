# Certificate Generator — design specification

Theme: **Nocturne** (dark, blurple accent). Mockups live in the Claude Design project
`Certificate Generator App.dc.html`. Implementation target: Angular 22.1 + **Tailwind CSS 4**,
replacing the Material 3 theme that `mat.theme()` used to generate.

---

## 1. Tokens

### 1.1 `frontend/src/styles/_tokens.scss` (for the SCSS that survives the migration)

```scss
// --- Color -------------------------------------------------------------
$bg:            #161826; // application ground
$surface:       #232532; // cards, bars, table
$text:          #e9e9ed;
$text-muted:    #b2b6ca;
$text-subtle:   #9397ab;
$divider:       rgba(233, 233, 237, 0.16);

$accent: (
  100: #f5f4ff, 200: #e7e5fe, 300: #d2cefd, 400: #b5abfc, 500: #9184d9,
  600: #796cbf, 700: #5d5294, 800: #423a6a, 900: #2b2741
);
$neutral: (
  100: #f3f5fe, 200: #e4e7f5, 300: #cfd3e5, 400: #b2b6ca, 500: #9397ab,
  600: #75798c, 700: #595d6c, 800: #3f424d, 900: #292b31
);

// Certificate status — foreground over a tinted ground, 1px line.
$status: (
  draft:   (fg: #9397ab, bg: #292b31, line: #3f424d),
  issued:  (fg: #6fd3a3, bg: #1b3a2c, line: #2f6b50),
  revoked: (fg: #f2938c, bg: #3a2224, line: #7a3b3c),
  pending: (fg: #e7b76a, bg: #392f1c, line: #7a6231)  // "not yet issued"
);
$info: (fg: #93bde0, bg: #1e2b3a, line: #3f5f7d);      // cold start, neutral notices

// --- Space (4px base at density 0.7) -----------------------------------
$spacing-scale: (xs: 2.8px, sm: 5.6px, md: 11.2px, lg: 16.8px, xl: 22.4px, xxl: 33.6px);

// --- Radius ------------------------------------------------------------
$radius-scale: (sm: 4px, md: 8px, lg: 14px, full: 9999px);

// --- Typography --------------------------------------------------------
$font-family-base: Inter, "Helvetica Neue", Arial, sans-serif;
// Never heavier than 500 in headings.
$font-size-scale: (
  overline: 0.6875rem,  // 11px, uppercase, letter-spacing .08em
  sm:       0.8125rem,  // 13px
  base:     0.9375rem,  // 15px
  lg:       1.4375rem,  // 23px — page titles
  xl:       1.6875rem,  // 27px
  display:  1.9375rem   // 31px
);

// --- Elevation (dark: hairline edge + ambient darkness) ----------------
$elevation-scale: (
  1: (0 0 0 1px #3f424d),
  2: (0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)),
  3: (0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65))
);

// --- Layout ------------------------------------------------------------
$breakpoints: (sm: 600px, md: 900px, lg: 1200px);
$toolbar-height: 64px;
$nav-width: 240px;
$login-form-max-width: 400px;
$verify-card-max-width: 560px;
$content-max-width: 820px;
```

### 1.2 `frontend/src/styles.css` — Tailwind 4, CSS-first configuration

Tailwind 4 has no `tailwind.config.js`: tokens go into `@theme`, and each key generates the
matching utilities (`--color-accent-500` produces `bg-accent-500`, `text-accent-500`,
`border-accent-500`). The block is declared `@theme static` so every token is emitted even when
no utility references it yet — `styles.scss` reads several of them from outside Tailwind's
sight, and tree-shaken variables would silently resolve to nothing there.

The palette is cleared with `--color-*: initial` before the Nocturne colors are declared, so the
project does not carry Tailwind's twenty-two default hues that nobody uses.

Key values: `--spacing: 2.8px` (density 0.7 — `p-3` is 8.4px, `gap-4` is 11.2px, so a Tailwind
spacing number in this project does **not** mean `n × 4px`), the accent and neutral ramps, the
four status pairs plus `info`, the radius and type scales, and `--shadow-e1/e2/e3`.

`@layer base` sets `color-scheme: dark`, the body ground and font, heading weight and tracking,
the `:focus-visible` accent ring and the `::selection` tint. The `rule-fade` utility — a 1px
rule fading to transparent 48px from each end — is the theme's signature and is declared with
`@utility`.

Setup: install `tailwindcss @tailwindcss/postcss postcss`, add `.postcssrc.json` containing
`{"plugins":{"@tailwindcss/postcss":{}}}`, and list `src/styles.css` in `angular.json`'s styles
array. A component SCSS file that uses `@apply` needs `@reference "../../styles.css";` at the
top — without it `@apply` cannot see the tokens.

---

## 2. Components

| Component | Material today | Tailwind 4 |
| --- | --- | --- |
| Primary button | `mat-flat-button color="primary"` | `inline-flex items-center gap-2 rounded-md border border-accent-500 bg-transparent px-6 py-3 text-sm font-medium text-accent-500 hover:bg-accent-900 active:bg-accent-800 disabled:opacity-45` |
| Secondary button | `mat-button` | same base, `border-neutral-800 text-text hover:bg-neutral-900` |
| Ghost button | `mat-button` | `text-accent-500 px-3 hover:bg-accent-900`, no border |
| Danger button | — | `border-revoked-line text-revoked hover:bg-revoked-bg` |
| Icon button | `mat-icon-button` | `size-11 grid place-items-center rounded-md text-subtle hover:text-accent-500 hover:bg-accent-900` (44px on mobile) |
| Text field | `mat-form-field appearance="outline"` | wrapper `flex flex-col gap-2`; label `text-[12px] text-muted`; input `w-full rounded-md border border-neutral-800 bg-bg px-4 py-3 text-[14px] caret-accent-500 hover:border-neutral-700 focus:border-accent-500 focus:outline-none`; error: `border-revoked` plus `<p class="text-[11.5px] text-revoked">` |
| Select | `mat-select` | the input's shell plus an SVG chevron; panel `rounded-md bg-surface shadow-e2 p-2`, active option `text-accent-500 bg-accent-900` |
| Table | `mat-table` | `div` grid; header `text-overline uppercase tracking-[.08em] text-subtle`; row `shadow-[inset_0_-1px_0_var(--color-neutral-900)] hover:bg-neutral-900`; code in `tabular-nums text-accent-300` |
| Pagination | `mat-paginator` | `flex items-center justify-end gap-7 text-sm text-subtle` plus two icon buttons; page size 10/20/50 |
| Status badge | — | `inline-flex items-center gap-2 rounded-md border px-3 py-1 text-[11px] font-medium` plus a color pair (`bg-issued-bg text-issued border-issued-line`, and so on) and a `size-1.5 rounded-full bg-current` dot |
| Card | `mat-card` | `rounded-md bg-surface p-6 shadow-e1` |
| Dialog | `MatDialog` | backdrop `fixed inset-0 grid place-items-center bg-neutral-900/60 backdrop-blur-[2px]`; panel `w-[min(440px,100%)] rounded-lg bg-surface p-8 shadow-e3` |
| Snackbar | `MatSnackBar` | `flex items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 px-5 py-4 text-sm shadow-e2`, 4s, anchored bottom-left, at most one action |
| Spinner | `mat-spinner` | `size-7 rounded-full border-[2.5px] border-accent-800 border-t-accent-500 animate-spin` |
| Skeleton | — | `h-3 rounded-sm bg-linear-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-[length:320px_100%] animate-[shimmer_1.5s_infinite_linear]` |

Every clickable thing carries all four states: an accent-tinted hover (`hover:bg-accent-900`),
a pressed state one step further (`active:bg-accent-800`), the `:focus-visible` ring from
`@layer base`, and `opacity-45` when disabled. Never fill a large area with the accent — it is
line and glow.

---

## 3. Screens and states

| Screen | Route | States drawn in the mockups |
| --- | --- | --- |
| Login | `/login` | form · **cold start** (progress and an explanation, not a mute spinner) · 401 · 429 |
| Sign up | `/signup` | form · field errors · email taken · rate limited |
| Forgot password | `/forgot-password` | form · sent confirmation · invalid email |
| Reset password | `/reset-password` | form · success · expired or invalid link |
| List | `/certificates` | with data · skeleton · empty · error with retry and `traceId` |
| Form | `/certificates/new`, `/:id/edit` | filled · validation errors (client and server 400) · delete dialog (ADMIN) |
| Preview | `/certificates/:id/preview` | PDF loaded · generating · error 500 |
| Batch | `/certificates/batch` | picking/drop · uploading with progress · imported clean · per-row errors · file rejected (4xx) |
| Verify (in app) | `/verify-code` | idle · checking · valid · not found · rate limited |
| Profile | `/profile` | profile card · password card · field errors |
| Public verification | `/verify`, `/verify/:code` | valid · revoked · not yet issued · checking · not found · 429 · generic error |

The three template cards (`CLASSIC` / `MODERN` / `MINIMAL`) stop being text: each shows an
A4-proportioned (1.414) thumbnail of its own layout — a serif double frame, a color band with
the name in relief and a QR, and a loose typographic setting with a lot of white. The selected
card takes an accent border, an `accent-900` ground and a check; the others react on hover with
`border-accent-600`.

The public verification badge is the loudest element on its screen: a 58px circle holding the
icon, a 23px title in the semantic color, the code in `tabular-nums` inside an accent-bordered
capsule, and only then the `<dl>`. Revoked keeps every field visible at reduced opacity — the
information is disqualified, not hidden.

---

## 4. Navigation

The authenticated chrome is a 64px top bar over a 240px sidebar.

The top bar carries the brand at the left, linking back to the list, and at the right a compact
"Verify code" field that jumps straight to the in-app lookup with the code filled in.

The sidebar carries a "Menu" overline and the navigation items — `Certificates`, `Verify code`,
`My profile` — each with an icon and an accent-tinted active state. Pinned to its bottom is the
signed-in user: initials avatar, full name, role, and "Sign out".

An earlier round of this specification argued for tabs in the top bar and against a drawer, on
the grounds that a 240px drawer holding a single item does not pay for itself. The app mockup
reverses that, and it is right to: the menu now holds three items, and the bottom-pinned
identity and sign-out block has nowhere natural to live in a tab strip. The argument against the
drawer was about it being empty, which it no longer is.

Below the medium breakpoint the sidebar becomes a bottom-anchored horizontal bar and the
quick-verify field drops out of the top bar.

---

## 5. Migration order

1. **Tokens first.** Create `src/styles.css` with `@import "tailwindcss"` plus `@theme static`,
   keeping `_tokens.scss` mirroring the same hexes while the old SCSS still exists.
2. **Take `mat.theme()`'s palette out of the picture.** While Material components remain, map the
   system variables onto the tokens rather than keeping two palettes:
   `--mat-sys-surface: var(--color-surface)`, `--mat-sys-on-surface: var(--color-text)`,
   `--mat-sys-primary: var(--color-accent-500)`, `--mat-sys-error: var(--color-revoked)`, and
   `color-scheme: dark`.
3. **Replace screen by screen, from the bottom up:** public verification and login → the shell →
   the list (the table and paginator are the biggest single piece) → the form (last: it has the
   most `mat-form-field`).
4. **Material worth keeping at the start:** `MatDialog` and `MatSnackBar`, for their behavior,
   focus handling and accessibility, with content already styled in Tailwind. `mat-table`,
   `mat-paginator`, `mat-form-field` and `mat-select` go — they carry the most inherited CSS.
5. **`_material-overrides.scss` disappears** at the end. No new `::ng-deep` during the transition.
6. **Accessibility to check on arrival:** measured against the two grounds, accent `#9184d9` is
   5.45:1 on `#161826` and 4.71:1 on `#232532` — it clears AA for body text on both, correcting
   an earlier draft of this document that put it at 3.4:1. It stays reserved for chrome, borders,
   icons and emphasis anyway, and accent-colored paragraph text uses `accent-300` (11.7:1), so
   the rule survives a future retune of the accent rather than depending on today's hex. What
   does *not* clear AA is `accent-900` text on an `accent-500` fill (4.43:1) — which is why the
   accent is never a large fill and buttons are bordered rather than filled. Touch targets on
   mobile are 44px.
