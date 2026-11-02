# Gauge
> Source: https://vercel.com/geist/gauge (captured 2026-11-02)

## Purpose
A circular meter for a 0–100 value against a fixed maximum, where comparing to the maximum is the point (quota, hit rate, uptime).

## Anatomy
- SVG ring: a track arc and a value arc, with a small gap between them.
- Optional centered value (`showValue`). The number is rendered with `text-copy-14` (measured).
- Optional `children`: reserved for an icon overlay.
- `role="progressbar"` with `aria-valuemin`, `aria-valuemax` and `aria-valuenow`.

## Variants & sizes
- `size`: `tiny` 20px, `small` 32px, `medium` 64px, `large` 128px (measured SVG sizes). Stroke width is 2 in a 100-unit viewBox.
- `value`: 0–100.
- `showValue`: shows the number only, with no unit.
- `colors`: either a threshold map (`{'0': ..., '10': ..., ...}`, where the highest key ≤ value wins) or `{ primary, secondary }` for the value arc and the track.
- `arcPriority="equal"` (example code) / `arc="equal"` (best-practice prose; see contradiction note): both arcs are drawn at equal visual weight, for true ratios.
- `indeterminate`: a loading state. `value` is still passed.
- Default color scale (measured): value 14 → `--ds-red-800`, values 34 and 50 → `--ds-amber-700`, values 68 / 80 / 100 → `--ds-green-700`. The track is `--ds-gray-alpha-400`. Exact breakpoints are **not specified by the reference**.

## States
Determinate, indeterminate, full (100). No hover, focus or disabled states.

## Tokens
`--ds-gray-alpha-400` (track), `--ds-red-800`, `--ds-amber-700`, `--ds-green-700` (default scale), any `--ds-*` step through `colors`. `text-copy-14` for the value.

## Rules
- Use Gauge for usage or ratio values. Use `Progress` for task progress, `StatusDot` for deployment state, and `Badge` for enumerated state.
- Use the equal arc for true ratios, so 50% looks like exactly half. Use the default primary arc for single-percentage usage.
- Thresholds must match the breakpoints used elsewhere in the product (the reference's example is ≥80% warning, ≥95% error). Never invent gauge-only thresholds.
- Show copy such as `Calculating usage…` next to an indeterminate gauge.
- Always label it with an adjacent label or a Tooltip. The ring alone does not say what it measures. Units go in the label (`Uptime · 99.97%`), not in `children` and not in the value.
- Do not override the ARIA progressbar attributes. Wire the visible label to the gauge with `aria-labelledby`.
- Do not rely on color alone for thresholds. Repeat the threshold in text or in the Tooltip.

## Hidden Gems usage
- **Composite gem score (0–100)**: `size="medium"` with `showValue` on the bet detail Sheet header. Use `small` in summary cards. In table rows use `PieGauge` instead (inline, 13–16px).
- The reference's default scale (red low → amber → green high) matches "higher score = better". Still define Hidden Gems score bands once (e.g. <40 weak, 40–69 moderate, ≥70 strong) and pass them through `colors`, so Gauge, Badge tier and filters share one source of truth.
- **Quant vs qualitative split**: `arcPriority="equal"` with two `--ds-*` colors (e.g. blue-700 = quantitative weight, purple-700 = qualitative weight) works as a two-part ratio dial.
- Use `indeterminate` while a score is recomputing after a line move, with `Recalculating…` text next to it.
- Label pattern: `Gem Score` above, Tooltip with `Weighted blend of model edge, line value and news signals.`
