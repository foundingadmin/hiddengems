# Freshness line

> Facet component `[F]`. Modeled on the usage footnote in the vercel.com app ("Usage data can be up to 1 hour old"; captured 2026-11-01). CSS in `css/charts.css`.

## Purpose
One caption under aggregated data that says how fresh it is and how old it can be.

## Anatomy
```html
<p class="fc-freshness">
  <span class="fc-status-dot" data-state="live" aria-hidden="true"></span>
  <span>Updated <time datetime="2026-11-02T18:05:12-07:00" title="Nov 2, 2026, 6:05:12 PM MST">1 min ago</time>. Odds can be up to 2 min old.</span>
</p>
```
- An 8px status dot (`.fc-status-dot` with `data-state`: live, recent, stale, failed).
- The relative time in primary, with the exact timestamp in `datetime` and on hover (dotted underline marks the hover).
- Optional caveat sentence: the maximum age of the aggregate.
- 13/18, secondary, tabular figures.

## Rules
- Rule 11: any number that can go stale shows a dot plus a relative time. The dot's color follows the freshness tokens, and the words carry the state, so color is never alone.
- Place it directly under the data it qualifies, or in the chart card footer on the left. One per card.
- Keep the caveat only when it changes the reading (aggregates that lag the live feed). Do not repeat the source name the heading already gives.
- When the data fails to refresh, the dot turns `failed` and the words say so: `Failed to refresh 3 hours ago`.
- Human-read times are Sans; never Mono.

## Hidden Gems usage
Under best price share, line movement, and any odds aggregate. "Odds can be up to 2 min old."
