# Range select
> Source: rank 1 dashboard captures, 2026-11-01 (`reference/inbox-review-2026-11-02/01-dashboard-monitoring.md`, takeaway 3). Facet build `[F]`, CSS in `css/shell.css`.

## Purpose
One compound control for choosing a span of time: a week, a kickoff window, a time range. Every page uses the same control in the same place, so the reader learns it once.

## Anatomy
```html
<div class="fc-range-select" data-size="small">
  <span class="fc-range-select-icon"><svg aria-hidden="true">…calendar or clock…</svg></span>
  <select class="fc-range-select-control" aria-label="Time range">
    <option>Last hour</option><option selected>Last 24 hours</option><option>Last 7 days</option>
  </select>
  <svg class="fc-range-select-chevron" aria-hidden="true">…chevron-down…</svg>
</div>
```
- One ring (`--fc-border-alpha`, hover `--ds-gray-alpha-500`) around the whole control. The icon cell is square, matches the control height, and draws its own right rule.
- The control is a native `<select>` by default. For a custom picker (a calendar popover), use `<button class="fc-range-select-control" aria-haspopup="dialog">` in the same slot.
- Values use tabular figures.

## Sizes
`data-size="small"` 32, default 36, `data-size="large"` 40 (radius 8, 16px text). Use small in page headers and toolbars.

## States
Rest, hover (ring darkens), focus (`--ds-focus-border` on the whole control through `:focus-within`, INT-02), disabled (`--fc-surface-fill`, `--fc-text-disabled`).

## Rules
- Icon by meaning: calendar for dates and weeks, clock for times of day.
- Labels in sentence case: "Last 7 days", "Early, 1:00 PM ET". No colon prefixes; name the control with `aria-label`.
- The selected range goes in the URL (INT-11).
- Charts under a range select label their x-axis relative to now when the range ends now.

## Hidden Gems usage
- Kickoff window on the Slate: clock, "Early, 1:00 PM ET", "Afternoon, 4:05 PM ET", "Night, 8:20 PM ET", "All windows".
- Odds pulls and History: calendar, "Last 24 hours", "Last 7 days", "Last 4 weeks", "This season".
- Week, where the top bar does not already hold it (a comparison view): calendar, "Week 8".
