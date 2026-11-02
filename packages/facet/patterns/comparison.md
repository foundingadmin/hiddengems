# Comparison

Two layouts for putting options side by side, from vercel.com's own comparison pages.

## Matrix
Options across the top, criteria down the side, one verdict per cell. Use `.fc-table` with the criteria as row headers and `.fc-signal` (dot plus word) in each cell, so color is never the only cue.

```html
<table class="fc-table">
  <thead><tr><th scope="col">Criterion</th><th scope="col">DraftKings</th><th scope="col">FanDuel</th></tr></thead>
  <tbody><tr><th scope="row">Best price on anytime TD</th>
    <td><span class="fc-signal" data-signal="go">Often</span></td>
    <td><span class="fc-signal" data-signal="wait">Sometimes</span></td></tr></tbody>
</table>
```

Rules: columns are true peers with the same rows in the same order; a cell with no data reads "None" in secondary text; no column gets a highlight unless the data earns it.

## Alternatives
Two or three options in columns, each with identical key and value rows (`.fc-description[data-layout="rows"]`), so the difference is seen row by row instead of read in prose. Lead each column with the option's name; put the deciding row first.
