# Stacked bar

> Facet component `[F]`. Built for the agent workflow replay (Settings, Agent workflow). CSS in `css/charts.css`.

## Purpose
Splits one total into the shares of its parts on a single bar, so the reader sees which part takes most of it. The legend beside it prints each value.

## Anatomy
```html
<div class="fc-stacked-bar" role="img" aria-label="Tokens so far by agent: triage 22k, builder 88k">
  <i data-series="1" style="--value:18"></i>
  <i data-series="2" style="--value:70"></i>
</div>
<ul class="fc-legend" role="list" aria-label="Tokens so far by agent">
  <li class="fc-legend-item" data-series="1"><span class="fc-legend-key" aria-hidden="true"></span><span class="fc-legend-name">triage</span><span class="fc-legend-value">22k</span></li>
  …
</ul>
```
- Track: 8px (`--fc-meter-height`), fully rounded, `--fc-surface-fill-hover`. One bar height across meters, progress and segments.
- Segments: one `<i>` per part, in legend order (series 1 first), each `--value` percent of the bar. A 1px canvas rule separates neighbors, so two grays never merge.
- The unfilled track is the part of the total still to come (a replay that has not reached its end).

## Rules
- Always pair with an `.fc-legend` that carries each part's value; the key colors are decoration, the names carry the meaning.
- Series colors come from `data-series` (`--fc-chart-1..6`): gray first, then blue, teal, pink. Never verdict hues or purple.
- `role="img"` with an `aria-label` that lists every part and value, since the segments themselves are silent.
- Widths animate over 300ms with the standard easing; reduced motion turns that off.
- More than six parts: group the smallest into one muted segment (`data-series="muted"`).

## Hidden Gems usage
Tokens so far by agent on the agent workflow replay.
