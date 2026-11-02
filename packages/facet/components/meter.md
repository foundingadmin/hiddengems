# Meter

> Facet component `[F]`. Modeled on the quota bars in the vercel.com app (Overview usage, Usage; captured 2026-11-01). CSS in `css/charts.css`.

## Purpose
Shows how much of a fixed limit is used, with the numbers as text, and changes state as it nears or reaches the limit.

## Anatomy
```html
<div class="fc-meter" data-level="warning">
  <div class="fc-meter-head">
    <span class="fc-meter-label" id="m1">Odds requests</span>
    <span class="fc-meter-value"><strong>41,280</strong> of 50,000</span>
  </div>
  <div class="fc-meter-track" role="meter" aria-labelledby="m1"
       aria-valuemin="0" aria-valuemax="50000" aria-valuenow="41280"
       aria-valuetext="41,280 of 50,000, 83%, near limit">
    <span class="fc-meter-fill" style="--value:82.56"></span>
    <span class="fc-meter-stop" style="--at:80" aria-hidden="true"></span>
  </div>
  <div class="fc-meter-foot"><span>83% used, <span class="fc-meter-state">near limit</span></span><span>Warning at 80%</span></div>
</div>
```
- Head: label (14/20, 500) and `used of limit` (used in primary 500, limit in secondary, tabular).
- Track: 8px (`--fc-meter-height`), radius 6, `--fc-surface-fill-hover`. Fill clamps at 100%.
- Stop: a 1px canvas-colored tick at the warning threshold.
- Foot: percent used plus the state word, and one fact the reader acts on (threshold, reset date).

## States
| `data-level` | When | Fill | Word |
|---|---|---|---|
| `ok` (or none) | below the warning threshold | `--fc-surface-contrast` (gray-1000) | none |
| `warning` | from the warning threshold (default 80%) | `--fc-status-warning-solid` | `near limit` in warning fg |
| `error` | at or over the limit | `--fc-status-error-solid` | `limit reached` or `over by 1,200` in error fg |

## Rules
- Gray by default. The reference's blue fill reads as "info" in Facet; color appears only once the state matters.
- The numbers are always printed. The state word appears exactly when color does, so color is never alone (CON-09).
- One set of thresholds per product (80% warning, 100% error); meters, gauges and alerts use the same breakpoints.
- Use `role="meter"` with min, max, now and a `aria-valuetext` that says the state. Not a `progressbar`: a quota is not work in progress.
- Format numbers with `Intl.NumberFormat` (CON-15).
- Use Progress for work with an end; use Meter for consumption against a limit; use Gauge or Pie gauge where a ring fits better in a table cell.

## Hidden Gems usage
Odds API requests per month, injury feed and weather requests, a self-set weekly stake limit.

## Fix action `[F]`

Owner feedback, 2026-11-02. A meter near or at its limit carries one action link in its footer, the fastest fix, in its severity color (the same rule as note links):

- **Near the limit** (amber): slow usage down, inside the app: "Lower usage" (→ the schedule editor).
- **At the limit** (red): lift it, usually at the provider: "Raise limit" (↗ the provider's plan page). What the limit already caused stays in the status line ("100% used, limit reached, paused until Dec 1").
- **Below the warning line:** no action; the meter is information.

**Threshold line.** The tick on the track marks the warning point. Like progress stops, it is explained once, in a helper on the meter's label ("The line marks 80% (40,000)..."), never in a footer line.
