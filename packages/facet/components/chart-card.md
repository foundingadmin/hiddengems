# Chart card

> Facet component `[F]`, modeled on the chart cards in the vercel.com app (Observability, Firewall, CDN; captured 2026-11-01). CSS in `css/charts.css`; drawing helper in `preview/parts/charts.html` (`FacetCharts`).

## Purpose
One surface that holds one chart and everything needed to read it: what it measures, its scale, how fresh it is, and where to go next.

## Anatomy
- `.fc-chart-card`: canvas surface, `--ds-shadow-border`, radius `--fc-radius-lg` (12).
- `.fc-chart-card-header`: 16px padding, then
  - `.fc-chart-card-titlerow`: `.fc-chart-card-title` (14/20, 500, primary) with optional `.fc-chart-card-meta` under it (13/18, secondary), and an optional `.fc-chart-card-drill` link (24px square, chevron, named with `aria-label`).
  - Optional `.fc-legend` (see `legend.md`). Default for multi-series charts.
- `.fc-chart-card-body`: 16px padding; `data-flush` drops the side padding to 8px for row lists that carry their own inset.
- `.fc-chart`: the plot. `<figure role="img" aria-label="summary">` containing one `<svg aria-hidden="true">` drawn at its real pixel width.
- Optional `.fc-chart-card-footer`: background 2 band with a top rule. Holds the freshness line (left) and actions (right).

## Chart anatomy (`.fc-chart`)
| Part | Class | Spec |
|---|---|---|
| Gridlines | `.fc-chart-grid` | Horizontal only, 1px `--fc-chart-grid`, 3 to 5 lines. No vertical lines, no frame. |
| Baseline | `.fc-chart-baseline` | Zero line on bar charts, `--fc-chart-axis`. |
| Tick labels | `.fc-chart-tick` | 12/16 Sans, secondary, tabular figures. Abbreviated units (`2k`, `1.4 s`). |
| Line | `.fc-chart-line` | 1.5px, round joins, no markers. Sparklines 1.25px. |
| Area | `.fc-chart-area` | Optional, series color at 6% opacity. |
| Bar | `.fc-chart-bar` | Series fill, 2px gap (1px when bars are under 8px wide). Always from zero. |
| Point | `.fc-chart-point` | Only at directly labelled points (open, now). |
| Direct label | `.fc-chart-label.fc-chart-halo` | Name in secondary, value in `data-strong` primary; a canvas halo keeps lines off the text. |
| Threshold | `.fc-chart-threshold` | See "Threshold line" below. |
| Empty | `.fc-chart-empty` | See "Empty chart" below. |

Heights: default 160px, `data-size="small"` 120px, `data-size="timeline"` 56px, or set `--fc-chart-height`.

## Series color
Marks read `--_s` from `data-series="1"` to `"6"` (`--fc-chart-1` to `-6`: gray-1000, blue, teal, pink, gray-700, gray-500) or `data-series="muted"`. Monochrome first: one series is always slot 1. Add slot 2 only when a second series must be told apart, then 3 and 4. A series keeps its slot in every view. Verdict hues and purple are never series colors; a chart that plots verdicts or gems uses the signal or gem tokens instead.

## Rules
- **Geometry first.** Change over time is horizontal order; magnitude is length from a shared zero. Bars always start at zero. A line may use a tight domain, and its ticks must show it.
- **Shared scale for peers.** Charts, sparklines or bars that compare the same measure share one domain (`FacetCharts.sharedDomain`). Small multiples of different measures may each have their own scale but share the time window.
- **Relative time axis.** When the right edge is now, label only the endpoints relative to now: `12h ago` on the left, `now` on the right. Times people read are Sans with tabular figures; Mono is for machine values only.
- **Incomplete last bucket.** A bucket that is still filling draws dashed: lines get `data-incomplete` on the last segment (`stroke-dasharray: 2 3`), bars get a dashed outline and a 14% fill. Say so in the chart's text summary, not on the plot.
- **Labels.** Single-series charts label directly (open and now on line movement). Multi-series charts use a legend with totals (`legend.md`).
- **One chart per card.** No cards inside cards, no stat cards stacked above a chart that already has a legend.
- **Drill link.** Optional, top right, goes to the full view. Name it (`aria-label="Open the pull log"`).
- **Footer.** Freshness on the left (`freshness.md`), actions on the right, secondary small buttons. A table toggle (`aria-expanded`, `aria-controls`) is the preferred audit path.

## Threshold line (C2)
- A 1px dashed line (`4 3`) across the plot, colored `--fc-text-secondary` by default.
- Its value sits in the y-axis lane at the line's height, 500 weight, primary; any tick within 16px is hidden so the two never collide.
- Its name sits in the plot just above the line at the left edge (`Our fair price`), with a canvas halo.
- `data-tone="warning"` or `"error"` only for a limit whose crossing is a warning or an error (quota warning, hard cap). A reference value, such as our fair price, stays gray: it is a reference, not a verdict.
- The dash, the axis value and the name carry it, so it never depends on color.

## Empty chart
- Keep the frame: gridlines, ticks and endpoints stay, so the card does not jump when data arrives.
- Center one line in `.fc-chart-empty` on a canvas knock-out. Name the scope that produced it (`No failed pulls in the last 3 hours`).
- One neutral `.fc-icon-tile data-size="sm"` above the line is allowed (owner decision D1).
- Legend values become `–` with `aria-label="Unknown"`.
- The figure's `aria-label` repeats the message.

## Accessibility
- `role="img"` plus an `aria-label` that states the reading in one or two sentences: start, end, extremes, and any incomplete bucket. The helper sets it from `summary`.
- Offer the exact numbers as a semantic `<table>` (footer toggle) wherever the reader may need values.
- Icon-only drill links and buttons are named (CON-19). Focus uses `--ds-focus-ring` (INT-02).
- Color is never the only cue (CON-09): dashes, positions, labels and words carry every encoding.

## Hidden Gems usage
- Line movement on pick detail: one series (the book's price), open and now labelled, our fair price as the threshold.
- Odds pulls per hour on Data: scheduled and on demand stacked, legend totals, dashed current hour.
- Alert preview: the gap series over 7 days with the alert level as a threshold.
