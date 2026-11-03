# Facet changelog

## Unreleased

Added, for the agent workflow page
- Stacked bar (`.fc-stacked-bar`): shares of one total on a single bar, beside a legend (`components/stacked-bar.md`).
- Step list (`.fc-step-list`, `.fc-step`): replay steps with the current one marked (`components/step-list.md`).
- Flow map (`.fc-flow-map`, `.fc-flow-node`, `.fc-flow-edge`, `.fc-flow-label`, `.fc-flow-map-zoom`): who hands what to whom, with pan, zoom and a replay state per edge and node (`components/flow-map.md`).

Added, for micro moments (`patterns/moments.md`)
- Dots engine (`js/dots.mjs`, types in `js/dots.d.mts`): stages and the cloud, fly, dust, sweep, unsweep, ripple and orbit primitives, with the no-touch rule tested in `scripts/dots.test.mjs`.
- Tokens: `--fc-illus-1` to `4` (brand ramp) and `--fc-illus-context-1` to `4` (gray); `--fc-ease-emphasized`, `--fc-ease-exit`, `--fc-duration-sheet`, `--fc-duration-undo`, `--fc-z-stage`. The build now resolves `color-mix` between two token references.
- Gem card states `data-unread` (tint and sheen) and `data-selected` (`components/gem-card.md`).
- Toast (`.fc-toast-region`, `.fc-toast`) and the Undo countdown (`.fc-toast-dots`, `js/undo.mjs`) (`components/toast.md`).
- Edge glint hooks (`--fc-glint-edge`, `[data-glint]`) on the tab bar, rail items and the sheet.
- Sheet spring motion (`.fc-sheet[data-motion="spring"]`, `[data-closing]`): opens from off its side on the spring, closes on the exit easing (`components/sheet.md`).
- Rail slip leg count pop (`.fc-railslip-count[data-pop]`, `--fc-duration-pop`) and the on-slip phone row (`.fc-gem-item[data-checked]`).
- `unsweep({ reveal })` for an element rendered again after its sweep; unsweep now honors `delay` for the wipe too.
- Swipe to remove on editable legs (`.fc-leg-swipe`, `--fc-swipe`, `data-swipe`), and the × in the stop tokens on hover
  and while its leg leaves (`data-leaving`) (`components/cert.md`).

Changed
- `.fc-legs` spaces legs with half the gap above and below each leg instead of `row-gap`, so a closing leg takes its
  space with it. Same look.

## 0.2.0 (2026-11-03)

Minor: batch 2 added parts, and no existing part changed its API.

Added, in [#24](https://github.com/foundingadmin/hiddengems/pull/24)
- Slider (`.fc-slider`, `bindSliders` in `js/forms.mjs`), collapse and collapse group (`.fc-collapse`).
- Scatter chart (`.fc-chart[data-kind="scatter"]`, point, ring, range band, axis title, legend key shapes).
- Log table variant, row link, log data and inline row detail (`patterns/data-ops.md`).
- Compact description and wide pair, gem mark at stat size, multi-line snippet, removable filter chip, feed source slot.

Curation, in [#29](https://github.com/foundingadmin/hiddengems/pull/29)
- Specimens added for the small and sparse scatter and the narrow log table with inline log data.
- Screens page gains the data logs and rating lab compositions.
- Known drift, reported not fixed: many sub-element classes (for example `.fc-gauge-*`, `.fc-sheet-*`, `.fc-meter-*`) are documented by their parent part rather than named in a doc, and a few CSS classes have no specimen (`.fc-gem-card`, `.fc-spinner`, `.fc-strip`, `.fc-why`, `.fc-price`, `.fc-section-head`).

## 0.1.0

First captured state of the system.
