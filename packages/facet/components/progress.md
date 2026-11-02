# Progress
> Source: https://vercel.com/geist/progress (captured 2026-11-02)

## Purpose
A horizontal bar showing progress toward a known total or limit.

## Anatomy
- Native `<progress>` element with a track and a value fill. Radius is `--geist-radius` (6px).
- Optional `stops`: markers along the track, each with a tooltip and an `ariaLabel`.

## Variants & sizes
- `value`, `max` (default 100). The percentage is `value / max`.
- `type`: `success` | `error` | `warning` | `secondary`. Measured fills: success → `--ds-blue-700` (blue, not green), error → `--ds-red-700`, warning → `--ds-amber-700`, secondary → `--ds-gray-700`. The default fill is `--ds-gray-1000`.
- `colors`: a threshold map, value → CSS color. The docs example uses legacy `--geist-*` variables.
- `stops`: `[{ value, tooltip, ariaLabel? }]`.
- `width`: number (px) or percentage string. Demos: 100, 200, 300, `50%`, `100%`.
- `height`: number (px). The default is **10px** (measured). Demos: 4, 10, 50, 200.
- Track: `--ds-gray-200` (measured). Fill transition is 0.1s ease-in on width and color.

## States
Empty (0), partial, full. No disabled or indeterminate state (use Spinner or Gauge `indeterminate`).

## Tokens
`--ds-gray-200` (track), `--ds-gray-1000` (default fill), `--ds-blue-700` / `--ds-red-700` / `--ds-amber-700` / `--ds-gray-700` (types), radius 6px.

## Rules
- Use for determinate work with a knowable total. Use Spinner for short indeterminate waits, LoadingDots for inline text, and Gauge for quota or ratio.
- Pass the real ceiling as `max`. Do not hardcode 100.
- Threshold colors match the product's other breakpoints.
- Only use stops for real multi-stage work, and label the current stage next to the bar (`Step 2 of 4 · Building`).
- Always show text naming the work and units (`Uploading 12 of 30 files`). On completion, switch to a completion state (toast or row). Do not write `complete`.
- Give it an accessible name (`aria-label` or `aria-labelledby`). Throttle `aria-valuenow` updates to about once per second. Give each stop an `ariaLabel`.

## Hidden Gems usage
- **Slate ingestion / model run progress** (`Scoring 182 of 412 markets`) in the toolbar or on a status page.
- **Bankroll or unit exposure vs a self-set limit**: The reference would choose Gauge for quota-style values, but a thin bar (`height={4}`) next to the label also works in dense headers.
- **Closing-line countdown is not progress.** Do not use Progress for time-to-kickoff.
- Note that `type="success"` renders blue. If Hidden Gems wants green for "complete", pass `colors` explicitly.
