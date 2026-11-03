# Signed money
> Facet `[F]`. Promoted from the approved wireframes (`DesktopResult`, `DesktopSlipHistory`; `docs/wireframes/hg-wire.css`). CSS in `css/slip.css`. Specimen: `preview/index.html#slips`.

## Purpose
A result in money, profit or loss, that reads correctly in grayscale and at a glance.

## Anatomy
```html
<span class="fc-money" data-sign="positive">+$100.20</span>
<span class="fc-money" data-sign="negative">&minus;$15.00</span>
<span class="fc-money">$0.00</span>
```
- The sign is in the text: `+` for a gain, `−` (U+2212, `&minus;`) for a loss. Screen readers and copy and paste get it too.
- `data-sign="positive"` colors it `--fc-edge-positive`, `data-sign="negative"` `--fc-edge-negative`. Zero has no sign and no color.
- Tabular figures, never wraps. In a stat it sits inside `.fc-stat-value`; in a table cell it is right-aligned with `data-align="numeric"`.

## Rules
- Color is never the only cue: the sign always comes first, and the color only repeats it.
- Only results are signed: profit, loss, a plan's net. Stakes, payouts and balances are amounts and stay plain gray.
- Green and red here mean good and bad for the bettor (hue allocation), never "big" or "important".
- Peers share precision: all cents or all whole dollars in one set.

## Hidden Gems usage
Graded slip: Profit. Slips history: season Profit, Suggested plays and Your own plays, and the Profit column of past slips.
