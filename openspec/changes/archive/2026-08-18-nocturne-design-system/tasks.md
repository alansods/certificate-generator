## 1. Design intent in the repository

- [x] 1.1 Add `docs/design-spec.md` with the Nocturne specification (tokens, component table, screen states, migration order) exported from the design project.
- [x] 1.2 `docs/style-guide.md`: replace the Material theming section with the Nocturne rules — token lookup order, the four interaction states, the accent contrast budget, and "the accent is line and glow, never a large fill".
- [x] 1.3 `CLAUDE.md`: the stack table's Frontend row becomes "Angular 22, standalone components, signals, Tailwind CSS 4 (Nocturne tokens), Angular Material for dialog and snackbar only".

## 2. Tailwind 4 build

- [x] 2.1 `frontend/package.json`: add `tailwindcss`, `@tailwindcss/postcss` and `postcss` as dev dependencies.
- [x] 2.2 Add `frontend/.postcssrc.json` with `{"plugins":{"@tailwindcss/postcss":{}}}`.
- [x] 2.3 `frontend/angular.json`: add `src/styles.css` to the build target's `styles` array ahead of `src/styles.scss`, which stays for the Material mapping until the last Material component leaves. The test target declares no `styles` array, so there is nothing to change there.

## 3. Token layer

- [x] 3.1 Add `frontend/src/styles.css`: `@import "tailwindcss"` then the `@theme` block from `docs/design-spec.md` §1.2 — `--color-*: initial` first, then the bg/surface/text tokens, the accent and neutral ramps, the status and info pairs, `--font-sans`, `--spacing: 2.8px`, the radius scale, the type scale and the three elevation shadows.
- [x] 3.2 In the same file, the `@layer base` block: `color-scheme: dark` on `html`; body ground, text color, font, size and leading; heading weight, tracking and leading; the `:focus-visible` accent ring; the `::selection` tint. Then the `rule-fade` utility. Heading font sizes are restated from the type scale — Tailwind's preflight strips the user agent's, which would flatten every heading on the screens not yet rebuilt — which adds a `--text-md` step (19px) the design specification's scale did not name but the mockups use for card titles.
- [x] 3.5 Self-host Inter through `@fontsource/inter` (400 and 500) ahead of `styles.css` in `angular.json`. The type token names Inter and nothing in the app loaded it, so every screen was silently rendering in the Helvetica/Arial fallback; self-hosting avoids adding a second Google Fonts fetch beside the existing one.
- [x] 3.3 `frontend/src/styles/_tokens.scss`: replace every value with the Nocturne equivalent from `docs/design-spec.md` §1.1, keeping the existing map names so component SCSS keeps compiling. `$nav-width` stays at 240px: the app mockup keeps a sidebar, so the earlier plan to delete it does not apply.
- [x] 3.6 Enable Angular Material's strong focus indicators in the accent color. Material's component styles are unlayered, so `.mdc-button{outline:none}` and its siblings beat the `:focus-visible` rule in `@layer base` unconditionally — without this, no control on screen has a visible keyboard focus ring at all.
- [x] 3.7 `_material-overrides.scss` becomes a mixin included after `mat.theme()` inside the same `html` block: emitted from the `@use` at the top of the file its declarations came first, where `mat.theme()` overwrote them, so the token radii were silently discarded. Add the toolbar height (the density scale shrank it to 52px, leaving the shell's `calc(100% - $toolbar-height)` overhanging) and the 44px icon-button touch target.
- [x] 3.4 `frontend/src/styles.scss`: keep `mat.theme()` for the typography, density and shape systems, seeded with a built-in palette since every color role is shadowed anyway, at `density: -1` rather than the `-3` the Nocturne scale implies — Material switches off its invisible touch-target expander past `-2`, which left 28px hit areas, so `-1` is the densest setting that keeps the controls reachable, and the compact look comes back with the rebuilt controls — hand-writing those variables would be a far larger surface than the color mapping — and shadow every one of its color roles with a `--mat-sys-*` to Nocturne mapping (surface and its containers, on-surface, primary, on-primary, secondary, tertiary, error, outline, inverse and scrim). The generated palette therefore reaches no component. Delete `frontend/src/styles/_theme-colors.scss`.

## 4. Tests

- [x] 4.1 `src/styles.spec.ts`: the token layer has no component to render, so it is asserted as a contract between the two stylesheets — the theme block is `static` (a bare `@theme` tree-shakes the tokens `styles.scss` reads from outside Tailwind's sight, which fails silently at runtime), every token the Material mapping references is declared, every `--mat-sys-*` color role resolves to a token rather than a literal, the dark scheme and Nocturne ground are set on `html`/`body`, and the type scale plus the four heading sizes survive the preflight reset. The first assertion was verified to fail when `static` is removed.

## 5. Verification

- [x] 5.1 `cd frontend && npm run build` succeeds and the emitted CSS contains the `@theme`-generated custom properties.
- [x] 5.2 `cd frontend && npm run lint && npm test` pass; no existing component spec needed changing — this change alters appearance only.
- [x] 5.3 Load every route with the dev server and confirm each renders dark, on-palette and legible, with no light-on-light or invisible Material control left behind.
- [x] 5.4 Check the accent against the background with a contrast tool and confirm no body-sized text uses the primary accent step.
- [x] 5.5 `npx -y @fission-ai/openspec@latest validate nocturne-design-system --type change --strict` passes.
