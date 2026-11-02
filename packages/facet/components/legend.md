# Legend

> Facet component `[F]`, owner decision D3. Modeled on the legend summaries in the vercel.com app (Firewall, Observability; captured 2026-11-01). CSS in `css/charts.css`.

## Purpose
Names each series of a multi-series chart and carries its total for the range shown, so the legend doubles as the KPI row.

## Anatomy
```html
<ul class="fc-legend" role="list" aria-label="Totals for the last 12 hours">
  <li class="fc-legend-item" data-series="1">
    <span class="fc-legend-key" aria-hidden="true"></span>
    <span class="fc-legend-name">Scheduled</span>
    <span class="fc-legend-value">138</span>
  </li>
</ul>
```
- Key: 8px dot in the series color. `data-key="line"` on the list draws a 12 by 2px stroke for line charts.
- Name: 13/16, 500, primary.
- Value: 13/16, secondary, tabular figures, abbreviated like the axis (`1.8k`).
- Items wrap with 16px between them and 4px between lines.

## When to use
- **Default for multi-series charts.** Each item: key, name, total value.
- **Single-series charts** use direct labels instead; a legend with one item adds nothing.
- Never add a separate stat row above a chart whose legend already carries the totals.

## Rules
- The value is the series total for the visible range for additive measures (pulls, requests), or the latest value for levels (price, rate). Pick one per chart and state the range once, in the list's accessible name or the card meta.
- Compute values from the same data the chart draws, so they never disagree.
- Order matches stacking order (series 1 first, at the bottom of a stack).
- Unknown or empty: `–` with `aria-label="Unknown"`.
- The key is decoration (`aria-hidden`); the name carries the meaning, so color is never the only cue.
- Series selection from the legend (a radio set) is a separate future pattern; this legend is static.

## Tokens
`--fc-chart-1..6` via `data-series`, `--fc-text-primary`, `--fc-text-secondary`.
