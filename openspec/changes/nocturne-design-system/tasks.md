## 1. Design intent in the repository

- [x] 1.1 Add `docs/design-spec.md` with the Nocturne specification (tokens, component table, screen states, migration order) exported from the design project.
- [x] 1.2 `docs/style-guide.md`: replace the Material theming section with the Nocturne rules — token lookup order, the four interaction states, the accent contrast budget, and "the accent is line and glow, never a large fill".
- [x] 1.3 `CLAUDE.md`: the stack table's Frontend row becomes "Angular 22, standalone components, signals, Tailwind CSS 4 (Nocturne tokens), Angular Material for dialog and snackbar only".

## 2. Tailwind 4 build

- [x] 2.1 `frontend/package.json`: add `tailwindcss`, `@tailwindcss/postcss` and `postcss` as dev dependencies.
- [x] 2.2 Add `frontend/.postcssrc.json` with `{"plugins":{"@tailwindcss/postcss":{}}}`.
- [x] 2.3 `frontend/angular.json`: point the build and test `styles` arrays at `src/styles.css`, keeping `src/styles.scss` in the list until task 3.3 lands.

## 3. Token layer

- [x] 3.1 Add `frontend/src/styles.css`: `@import "tailwindcss"` then the `@theme` block from `docs/design-spec.md` §1.2 — `--color-*: initial` first, then the bg/surface/text tokens, the accent and neutral ramps, the status and info pairs, `--font-sans`, `--spacing: 2.8px`, the radius scale, the type scale and the three elevation shadows.
- [x] 3.2 In the same file, the `@layer base` block: `color-scheme: dark` on `html`; body ground, text color, font, size and leading; heading weight, tracking and leading; the `:focus-visible` accent ring; the `::selection` tint. Then the `rule-fade` utility.
- [x] 3.3 `frontend/src/styles/_tokens.scss`: replace every value with the Nocturne equivalent from `docs/design-spec.md` §1.1, keeping the existing map names so component SCSS keeps compiling. `$nav-width` stays at 240px: the app mockup keeps a sidebar, so the earlier plan to delete it does not apply.
- [x] 3.4 `frontend/src/styles.scss`: drop the `mat.theme()` call and replace it with the `--mat-sys-*` to Nocturne token mapping (surface, on-surface, surface-container, primary, on-primary, error, outline, and the density/typography roles the app actually uses). Delete `frontend/src/styles/_theme-colors.scss`.

## 4. Verification

- [x] 4.1 `cd frontend && npm run build` succeeds and the emitted CSS contains the `@theme`-generated custom properties.
- [x] 4.2 `cd frontend && npm run lint && npm test` pass with no changes to component specs — this change alters appearance only.
- [x] 4.3 Load every route with the dev server and confirm each renders dark, on-palette and legible, with no light-on-light or invisible Material control left behind.
- [x] 4.4 Check the accent against the background with a contrast tool and confirm no body-sized text uses the primary accent step.
- [x] 4.5 `npx -y @fission-ai/openspec@latest validate nocturne-design-system --type change --strict` passes.
