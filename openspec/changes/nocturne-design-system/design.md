## Why Tailwind 4 and not a retuned `mat.theme()`

`mat.theme()` is a palette generator: it takes a seed and emits a full Material 3 role set, then every Material component reads those roles. Getting the Nocturne look out of it means overriding the roles *and* overriding the components that read them — `_material-overrides.scss` is already that file, and it only grows. The mockups are not Material: the table is a CSS grid with a header in overline type, the status filter is a segmented control, elevation is a hairline `box-shadow` ring rather than a blurred drop shadow, and the accent is used as a 1px line on a transparent fill. Tailwind 4's CSS-first `@theme` gives one token source that both utility classes and any remaining SCSS can read.

## Why the Material variables are re-pointed in this change

The migration runs over several PRs (see `design-spec.md` §5). If the tokens land first and the Material mapping lands last, `main` sits for days with a dark shell around light Material controls. Mapping `--mat-sys-*` to the Nocturne tokens here costs a dozen lines and keeps every intermediate state shippable. The mapping is deleted along with the last Material component.

## Density and the spacing base

`design-spec.md` sets `--spacing: 2.8px` — Material density -3 expressed as Tailwind's spacing base, so `p-3` is 8.4px and `gap-4` is 11.2px. This is deliberate: the mockups are dense, and re-deriving a 4px base later would silently loosen every screen. The consequence to remember when reading Tailwind class names in review is that the numbers do not mean the usual `n × 4px`.

## Accent contrast

Measured, `#9184d9` is 5.45:1 on `#161826` and 4.71:1 on `#232532` — it clears AA for body text on both grounds. (An earlier draft of the design specification put it at ~3.4:1; that figure is wrong and is corrected in `docs/design-spec.md` §6.)

Paragraph text that needs to be accent-colored still uses `accent-300` (`#d2cefd`, 11.7:1). The rule is kept for two reasons that survive the corrected number: it leaves headroom if the accent is ever retuned, and the pairing that genuinely fails is `accent-900` text on an `accent-500` fill at 4.43:1 — which is the real argument for the design's bordered buttons over filled ones. It is written into the spec rather than left to reviewer memory because every screen change that follows will be tempted to break it.

## Material density stops at -1, not -3

The Nocturne spacing scale is a 4px base at density 0.7, which maps to Material's `density: -3`. Shipped at `-3`, every Material control measured 28px and `--mat-icon-button-touch-target-display` came back `none`: Material switches off its invisible touch-target expander past `-2`, so the compact setting silently trades away the 44px hit area the same design specification asks for in section 6.

`density: -1` is therefore the densest setting this app can use while Material controls remain, with the icon button pinned to 44px on top of it. This is not a retreat from the design's density — the Tailwind spacing base is still 2.8px, and the rebuilt controls hit the mockups' sizes directly. It only applies to the Material components on their way out, and it should not be "corrected" back to `-3` by a later change.

## `@reference` in component SCSS

Any component stylesheet that uses `@apply` needs `@reference "../../styles.css";` at the top, or Tailwind resolves none of the tokens and fails silently at build time. Component styles written from scratch during the migration should prefer utility classes in the template and keep SCSS for what utilities cannot express.
