# Effect marker `[F]`

Whether a note adds to or costs a record. CSS in `css/data.css` (`.fc-effect`); specimen in `preview/index.html`
(Effect marker, adds and costs).

## Anatomy
```html
<span class="fc-effect" data-effect="add">Adds</span>
<span class="fc-effect" data-effect="cost">Costs</span>
```
- An arrow (up for `add`, down for `cost`) in secondary text, then the word in primary, 14px 500.
- The arrow is generated content with empty alt text, so screen readers read only the word.

## Rules
- Gray only. A note is context: it never moves the delta or the score, so it never borrows delta
  green or red (`.fc-delta`) or any signal hue.
- The word carries the meaning; the arrow repeats it for scanning. Never the arrow alone.
- Sits in a list row's aside, one per row. Adds come before costs.

## In practice
Detail sheet, Notes: each adds or costs row (seat growth, a new champion, open tickets, a late invoice).
