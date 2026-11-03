# Stat
> Facet component `[F]`. Pattern source: vercel.com marketing stat blocks and shared-hairline cells (`reference/inbox-review-2026-11-02/04-brand-marketing.md`, 3.1). Implemented in `css/components.css` (base) and `css/data.css` (figure, basis, cells).

## Purpose
One number the reader came for, kept together with what it measures and how far to trust it. Peers sit in a strip and look equal.

## Anatomy
```html
<div class="fc-stat-strip" data-variant="cells" role="group" aria-label="Track record">
  <div class="fc-stat">
    <p class="fc-stat-label">Hit rate</p>
    <p class="fc-stat-figure"><span class="fc-stat-value">55%</span><span class="fc-stat-qualifier">23 of 42</span></p>
    <p class="fc-stat-basis">Settled picks only</p>
  </div>
  …
</div>
```
| Part | Class | Role |
|---|---|---|
| Label | `.fc-stat-label` | What was measured. 13px secondary |
| Figure | `.fc-stat-figure` | Holds value and qualifier on one baseline; wraps as a unit |
| Value | `.fc-stat-value` | 24px semibold, tabular, primary |
| Qualifier | `.fc-stat-qualifier` | Unit, count or direction that belongs to the number ("pts", "23 of 42", "lower"). 14px secondary |
| Basis | `.fc-stat-basis` | Sample, window or source ("41 picks, Weeks 1 to 8"). 13px secondary |
| Detail | `.fc-stat-detail` | Existing free-form line; still supported |
| Action | `.fc-stat-action` | Optional. One small CTA under the basis (`[F]`, 2026-11-03) |

The parts stack top-down with 4px gaps and never spread apart to fill a taller cell, so a basis line always reads with its own number.

## Action slot `[F]`
When the stat itself says something needs doing, one small CTA sits under the basis line, at its own width and at the start of the cell.
```html
<div class="fc-stat">
  <dt class="fc-stat-label">Status</dt>
  <dd class="fc-stat-figure"><span class="fc-stat-value">2 need a look</span></dd>
  <dd class="fc-stat-basis">Rosters overdue, Results failed</dd>
  <dd class="fc-stat-action"><button class="fc-button" data-variant="secondary" data-size="small" type="button">Fix all</button></dd>
</div>
```
- Holds one `.fc-button` (`data-size="small"`, secondary or tertiary) or one `.fc-link-action`. Never two, never primary: the page's primary action belongs to the page header.
- 12px above it (the 4px stack gap plus 8px), so the basis still reads with its number and the CTA reads as the next step. It never stretches to the cell's width, so a phone cell (about 150px at 390px) keeps the button at its label's width.
- Show it only while it has work to do ("Fix all" disappears when every source is clear), and say what it does in the label (CPY-14). A button that runs a job is a `<button>`; one that goes somewhere is an action link (INT-27). While it works it shows a spinner and `aria-busy="true"` (INT-09).
- Peers without an action keep their height: parts stack from the top, so the extra line never pushes a peer's basis down.

## Variants
- **Default strip** (`.fc-stat-strip`): cells separated by a vertical hairline. Use inside a card or panel that already has a boundary.
- **Cells** (`data-variant="cells"`): every edge is drawn once, as in the reference's shared-hairline rows. The strip wraps into rows (minimum 180px per cell) and keeps both horizontal and vertical hairlines, with one 6px-radius outer ring. No card per metric, and no `.fc-card` around it.

## Rules
- Peers share role, size, weight and precision. Never enlarge one value because it is bigger.
- Units and qualifiers stay beside the number. Do not move them into the label.
- Every stat that summarises a sample carries its basis. Under 20 events, show "n of m", not a bare percentage.
- Distinguish observed, derived and projected values in the basis ("Projected from 6 games").
- Signed values use a real sign; direction words ("lower") go in the qualifier. Color only through `.fc-delta`, never on the value itself.
- Labels say what was measured, not a teaser. The basis is a disclosure, so it stays even when space is tight.
- A missing value renders `–` with `aria-label="Unknown"`.

## Hidden Gems usage
- Track record strip on History: Return on stake `+6.2%` (41 picks, Weeks 1 to 8), Hit rate `55%` `23 of 42`, Average gap `+4.0` `pts`, Beat the closing line `29` `of 41`.
- Slate summary above the table: picks, average gap, go verdicts, odds freshness.
- Data health overview: Status carries "Fix all" (or "Fix" for one source) in `.fc-stat-action` while any source needs a look.
- A selectable strip that drives a chart (metric tabs) is a planned extension, `data-selectable`.
