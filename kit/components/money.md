# Signed money
> Facet `[F]`.

## Purpose
A result in money, gain or loss, that reads correctly in grayscale and at a glance.

## Anatomy
```html
<span class="fc-money" data-sign="positive">+$100.20</span>
<span class="fc-money" data-sign="negative">&minus;$15.00</span>
<span class="fc-money">$0.00</span>
```
- The sign is in the text: `+` for a gain, `−` (U+2212, `&minus;`) for a loss. Screen readers and copy and paste get it too.
- `data-sign="positive"` colors it `--fc-delta-positive`, `data-sign="negative"` `--fc-delta-negative`. Zero has no sign and no color.
- Tabular figures, never wraps. In a stat it sits inside `.fc-stat-value`; in a table cell it is right-aligned with `data-align="numeric"`.

## Rules
- Color is never the only cue: the sign always comes first, and the color only repeats it.
- Only results are signed: a gain, a loss, a net change. Revenue, invoices and balances are amounts and stay plain gray.
- Green and red here mean good and bad for the reader (hue allocation), never "big" or "important".
- Peers share precision: all cents or all whole dollars in one set.

## In practice
Account detail: Net change. Revenue history: the quarter's Net change, Expansion and Contraction, and the Change column of past quarters.
