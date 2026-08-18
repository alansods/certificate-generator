## Why

The app's look was never designed — it is whatever `mat.theme()` produces from a seed color, on a light scheme, with a token file that only a handful of components actually read. The owner redesigned the product in Claude Design ("Nocturne": dark ground, blurple accent, hairline elevation) and the resulting `design-spec.md` calls for Tailwind CSS 4 as the styling layer, because most of what the mockups draw — the grid table, the segmented control, status badges, skeletons, the fading rule — is fought rather than helped by Angular Material's component CSS.

This change lays the foundation only: tokens, the Tailwind 4 build, and the base layer. No screen is redesigned here. Every screen keeps rendering with Material until its own change lands, which is why the Material system variables have to be re-pointed at the Nocturne tokens in the same step — otherwise the app spends several PRs with two palettes fighting each other.

## What Changes

- Tailwind CSS 4 is added to the Angular build (`tailwindcss`, `@tailwindcss/postcss`, `postcss`, a `.postcssrc.json`), and `angular.json`'s global stylesheet becomes `src/styles.css`.
- `src/styles.css` declares the Nocturne palette, spacing, radius, type scale and elevation inside `@theme`, per `design-spec.md` §1.2, after clearing Tailwind's default color palette. The `@layer base` block sets `color-scheme: dark`, the body ground, heading weights, the `:focus-visible` ring and the selection tint. The `rule-fade` utility is declared here.
- `src/styles/_tokens.scss` is rewritten to the Nocturne values so that SCSS still compiling during the migration reads the same hexes; it stays until the last component stylesheet stops using it.
- The Material system variables (`--mat-sys-surface`, `--mat-sys-on-surface`, `--mat-sys-primary`, `--mat-sys-error`, …) are mapped onto the Nocturne tokens so the not-yet-migrated Material screens are dark and on-palette from day one. `mat.theme()` stops generating a palette of its own.
- `docs/style-guide.md` gains the Nocturne rules: which token to reach for, the interaction-state contract (hover tint, pressed one step further, focus ring, `opacity-45` when disabled), and the rule that the accent is line and glow, never a large fill.
- `design-spec.md` is copied into `docs/design-spec.md` so the repository carries the design intent that the following changes are reviewed against.

## Capabilities

### Modified Capabilities
- `frontend-shell` — "Styling is token-driven" is restated for a Tailwind 4 `@theme` token layer rather than an SCSS file feeding `mat.theme()`, and gains the interaction-state and accent-contrast rules. See `specs/frontend-shell/spec.md`.

## Impact

- `frontend/package.json`, `frontend/.postcssrc.json`, `frontend/angular.json` — build wiring.
- Adds `frontend/src/styles.css`; `frontend/src/styles.scss` shrinks to the Material variable mapping and is deleted by the last screen change.
- `frontend/src/styles/_tokens.scss` — values replaced, structure kept.
- `frontend/src/styles/_theme-colors.scss` — deleted (the generated M3 palette has no consumer once `mat.theme()` stops seeding).
- `docs/style-guide.md`, `docs/design-spec.md`.
- Every screen changes appearance in this PR (dark ground, new accent) without changing behavior. No backend impact.

## Non-goals

- Redesigning any screen's layout or markup — that is `nocturne-public-screens`, `nocturne-shell-navigation`, `nocturne-certificate-list` and `nocturne-certificate-screens`.
- Removing Angular Material. `MatDialog` and `MatSnackBar` are kept for their focus and accessibility behavior; the rest leaves screen by screen.
