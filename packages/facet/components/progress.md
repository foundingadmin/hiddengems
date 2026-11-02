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
- Only use stops for real multi-stage work, and label the current stage next to the bar (`Step 3 of 4`).

### When to use stops (owner question, 2026-11-02)

Stops (the thin step lines) mean one thing: this job runs in ordered stages you wait through.

- **Use them** for one job with 2 to 5 ordered stages, such as a scoring run: pull odds, match markets, score, publish. More than 5 stages is a checklist, not a bar.
- **Never** on a single-stage job (uploads, a pull), a quota against a limit (Meter), or a countdown.
- **The fill measures the whole job.** Each stop sits where its stage starts, at that stage's usual share of the work; equal spacing only when shares are unknown. In the specimen, stages 1 and 2 are done (50%) and scoring is 182 of 412 through stage 3, so the fill sits at 61%.
- **The text names the current stage and its own count** ("Scoring 182 of 412 markets", "Step 3 of 4"), and the step label carries a helper listing every stage in order.
- Always show text naming the work and units (`Uploading 12 of 30 files`). On completion, switch to a completion state (toast or row). Do not write `complete`.
- Give it an accessible name (`aria-label` or `aria-labelledby`). Throttle `aria-valuenow` updates to about once per second. Give each stop an `ariaLabel`.

## Hidden Gems usage
- **Slate ingestion / model run progress** (`Scoring 182 of 412 markets`) in the toolbar or on a status page.
- **Bankroll or unit exposure vs a self-set limit**: The reference would choose Gauge for quota-style values, but a thin bar (`height={4}`) next to the label also works in dense headers.
- **Closing-line countdown is not progress.** Do not use Progress for time-to-kickoff.
- Note that `type="success"` renders blue. If Hidden Gems wants green for "complete", pass `colors` explicitly.

## Facet additions `[F]`
CSS in `css/charts.css`. All of these work on the native `<progress>` and on the div form; only the div form takes stops.

```html
<div class="fc-progress" role="progressbar" aria-labelledby="run" aria-valuemin="0" aria-valuemax="412" aria-valuenow="182" aria-valuetext="Step 3 of 4, scoring 182 of 412 markets">
  <span class="fc-progress-fill" style="--value:61"></span>
  <span class="fc-progress-stop" style="--at:25"></span><span class="fc-progress-stop" style="--at:50"></span><span class="fc-progress-stop" style="--at:75"></span>
</div>
```

- **Types follow the hue allocation.** `data-type="success"` is green (`--fc-status-success-solid`), not the reference's blue; `warning` amber, `error` red, `secondary` gray (`--fc-chart-5`). Default stays gray-1000. Success means a check passed (`Books refreshed, 3 of 3`), never "money" or "done" by itself.
- **Stops.** `.fc-progress-stop` with `--at` (0 to 100): a 1px canvas-colored tick across fill and track. Stops are decorative (`aria-hidden` by default); the current stage is written next to the bar (`Step 3 of 4`) and in `aria-valuetext`.
- **Threshold colors.** Set `data-level="warning"` or `"error"` from the product's shared breakpoints (the same ones Meter and Gauge use). When the bar turns a color, the text beside it says why (`$38 of $50, near limit`), so color is never alone.
- **Row.** `.fc-progress-row` puts the work (500, primary) and the count or stage (secondary, tabular) on one line above the bar.
- `data-height="4"` gives the thin dense-header bar.
- Quota against a limit is not progress: use `meter.md`.
