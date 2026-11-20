# Metric row

> Facet component `[F]`. Modeled on the CDN metric cards in the vercel.com app (captured 2026-11-01). CSS in `css/charts.css`.

## Purpose
A short stack of peer metrics, each with its value, its change and its recent trend, on lanes that line up across rows.

## Anatomy
```html
<dl class="fc-metric-rows">
  <div class="fc-metric-row">
    <dt>Average sync time</dt>
    <dd class="fc-metric-value">1.4 <small>s</small></dd>
    <dd class="fc-metric-change"><span class="fc-delta" data-variant="pill" data-direction="positive" data-polarity="bad">+67%</span></dd>
    <dd><span class="fc-sparkline" aria-hidden="true"></span></dd>
  </div>
</dl>
```
- `.fc-metric-rows` owns one four-lane grid: label, value, change, sparkline. Each `.fc-metric-row` is a subgrid, so every lane starts and ends on the same lines.
- Label: 14/20, secondary.
- Value: 16/24, 500, primary, tabular, right-aligned. A bare number: only symbols that are part of the number stay (`$`, `%`, sign).
- Change: `.fc-delta` with `data-variant="pill"`, right-aligned.
- Sparkline: `.fc-sparkline`, 24px tall, fills the remaining width (at least 48px).
- Rows are at least 48px with a hairline between them.

## Rules
- **Peers look equal.** Same role, size and precision for every value; never enlarge the biggest.
- **Change color follows goodness**: `data-direction` sets the arrow, `data-polarity="good|bad|neutral"` sets the color. Keep the sign in the text, so sign, arrow and color all agree and color is never alone.
- **State the comparison once**, in the card meta (`Week 8, change vs week 7`), never per row.
- **Sparklines** are gray (`--fc-chart-5`) and have no axes. Each row may use its own scale because the units differ; all rows share the same time window. Dash the last segment when its bucket is still filling.
- **One shape per column.** Values in a column of mixed metrics never carry word units; the unit moves to the label in parentheses: "Average delta (pts)", "Average sync time (sec)". Changes are always percent change against the period in the card meta, and the exact change sits in the pill's helper (`data-tip="+0.6 pts, from +3.5"`), so every row reads the same way.
- Use for 2 to 5 metrics. For a single headline number use `.fc-stat`; for a ranked set of one measure use `.fc-rank-list`.

## Accessibility
`<dl>` gives each label and value a relationship. Sparklines are decorative (`aria-hidden`); their trend must be readable elsewhere (the change value, or a linked chart).

## In practice
- Results: revenue, hit rate, average delta, change vs last week.
- Data health: syncs, failed syncs, average sync time, change vs the previous 12 hours. A rise in sync time is bad, so it reads red with an up arrow.

## Sparkline scrub `[F]`

A metric row sparkline is a focusable image: hover, tap or the arrow keys mark one point and show its period and value ("1 PM to 2 PM, 26 syncs"; "Week 6, $205.00"). Its accessible name summarizes the line (low, high, latest). Lone values in the tooltip keep their units.
