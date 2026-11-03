# Facet changelog

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
