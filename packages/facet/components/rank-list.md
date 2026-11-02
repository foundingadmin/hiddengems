# Rank list

> Facet component `[F]`. Modeled on the Firewall top lists in the vercel.com app (captured 2026-11-01). CSS in `css/charts.css`.

## Purpose
A ranked list where each row shows its name, its magnitude, its trend and its actions in one line, without spending a column on a separate bar.

## Anatomy
```html
<ol class="fc-rank-list" data-striped aria-labelledby="books-h">
  <li class="fc-rank-row">
    <span class="fc-rank-label"><span>DraftKings</span></span>
    <span class="fc-rank-chip" style="--share:38"><span>38%</span></span>
    <span class="fc-sparkline" aria-hidden="true"></span>
    <button class="fc-button" data-variant="tertiary" data-size="tiny" data-shape="square" aria-label="More actions for DraftKings" aria-haspopup="menu">…</button>
  </li>
</ol>
```
- One grid on the list, a subgrid per row: label (flexible), chip (72px, `--fc-rank-chip`), sparkline (56px, `--fc-rank-spark`), menu (24px).
- Rows are 40px (`--fc-row-body`) with 8px side inset and 6px radius. `data-striped` fills odd rows with `--fc-surface-fill`.
- Label: 14/20 primary, truncates with an ellipsis. An optional leading icon tile or avatar goes inside `.fc-rank-label`.
- Magnitude chip: 24px tall, hairline ring, value right-aligned (13/16, 500, tabular). A gray fill (`--fc-surface-fill-active`) grows from the left edge to `--share` percent.
- Sparkline: gray, 20px tall.
- Overflow menu: tiny tertiary icon button, named per row.

## Rules
- **One documented scale for the chip.** `--share` is the value's share of the whole (0 to 100) when values are parts of a whole, such as best price share. For counts, use the value over the list's top value. Say which in the card meta or the list's accessible name.
- **Sparklines share one domain** because every row plots the same measure (`FacetCharts.sharedDomain`). A flat-looking line on a shared scale is the honest reading.
- **Rank order** is the list order (`<ol>`); never reorder by anything but the value shown.
- Sparklines stay gray. One colored sparkline is allowed only for a row in a warning or error state, paired with a word.
- Mono only for machine values in labels (hashes, IDs); names and numbers stay Sans.

## Accessibility
`<ol>` conveys rank. The chip's text is the value, so the fill is redundant. Sparklines are decorative. Each menu button names its row (CON-19).

## Hidden Gems usage
Best price share by sportsbook, biggest line moves, top failing sources.

## Reach `[F]`

Owner question, 2026-11-02: is this data neutral? A ranking of where value sits is neutral until it meets what you can act on. When rows are things you may or may not have access to (sportsbooks), rows you cannot use read secondary and carry their own action, in the row it belongs to: a quiet "Connect (+18%)" link that says how much reach it adds. The card takeaway states your reach ("65% at your books"). No red or green: missing a book is an opportunity, not a failure.
