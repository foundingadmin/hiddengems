# Outcome log `[F]`

Implemented in `css/data.css` as `.fc-outcome-log`.

## Purpose
Shows a record's recent periods at a glance: which ones hit, which missed, and where a skip fell, beside the
overall rate that outranks them.

## Anatomy
```html
<div class="fc-outcome-log">
  <p class="fc-outcome-log-rate"><span class="fc-outcome-log-value">5 of 8</span><span class="fc-outcome-log-label">This quarter</span></p>
  <ol class="fc-outcome-log-cells" aria-label="Last 8 weeks, oldest first">
    <li data-result="hit"><span aria-hidden="true">W1</span><span class="fc-visually-hidden">Week 1, target met</span></li>
    <li data-result="miss"><span aria-hidden="true">W3</span><span class="fc-visually-hidden">Week 3, target missed</span></li>
    <li data-result="skip"><span aria-hidden="true">W7</span><span class="fc-visually-hidden">Week 7, paused</span></li>
  </ol>
</div>
<ul class="fc-outcome-log-key" aria-label="Key"><li data-result="hit">Met</li><li data-result="miss">Missed</li><li data-result="skip">Paused</li></ul>
```
- **Rate** (`.fc-outcome-log-rate`): the overall record as "n of m", leading, since it outranks the last 10.
- **Cells** (`.fc-outcome-log-cells`): one per period, oldest first, its label under each. At most 10 periods, plus
  any skip that falls inside them.
- **Key** (`.fc-outcome-log-key`): optional, names the three cell states with the product's words.

## States
| `data-result` | Cell | Meaning |
|---|---|---|
| `hit` | Filled, primary text gray | The outcome hit (the weekly target was met) |
| `miss` | Hollow, gray-700 ring | It did not |
| `skip` | Dashed | Nothing was due that period (the target was paused) |

Periods with no data are left out: they are neither a hit nor a miss.

## Cloudy `[F]`
A thin sample (under 3 periods) is cloudy: `data-cloudy` on `.fc-outcome-log-cells` blurs and fades the
marks, and on a `.fc-outcome-log-rate` it turns the value secondary and softens it. Labels stay sharp,
and the rate's label says how many periods there are ("Only 2 weeks match"), so the haze is never the only cue.
Reduced transparency drops the blur and keeps the fade.

## In the detail sheet `[F]`
The detail sheet puts toggle chips (`components/toggle-chip.md`) over the log and a second rate beside the overall one:
```html
<div class="fc-outcome-log">
  <p class="fc-outcome-log-rate"><span class="fc-outcome-log-value">38%</span><span class="fc-outcome-log-label">3 of 8 this quarter</span></p>
  <p class="fc-outcome-log-rate" data-cloudy><span class="fc-outcome-log-value">42%</span><span class="fc-outcome-log-label">Only 2 weeks match</span></p>
  <ol class="fc-outcome-log-cells" data-cloudy aria-label="Last 2 matching weeks, oldest first">…</ol>
</div>
```
- Both rates are percents here, so they compare; the overall record sits in its label as "n of m".
- The matching rate is shrunk toward the overall rate, and its value carries a tip that says so.
- Filtered, the cells are the matching periods only, with no skip: a week left out is not a skip.

## Rules
- Gray only. A hit is a result, not a highlight, so the brand accent stays out (`DESIGN.md`, Hue allocation).
- Shape carries the result, the label and hidden text carry it in words, so color is never the only cue.
- Write the record as "n of m", never a bare percentage (samples under 20, `patterns/board.md`).
- The cells shrink to fit a phone; ten periods and a skip fit in 342px.
