# Toggle chips `[F]`

Implemented in `css/data.css` as `.fc-toggle-chips` and `.fc-toggle-chip`. Specimen: `preview/index.html#components`.

## Purpose
Turns conditions on and off, any number at once, and the view beside them redraws as each one flips. Use it when
every option is a filter that combines with the others and nothing is saved.

## Anatomy
```html
<div class="fc-toggle-chips" role="group" aria-label="Conditions this week">
  <button type="button" class="fc-toggle-chip" aria-pressed="true"><svg aria-hidden="true">…check…</svg>Month end</button>
  <button type="button" class="fc-toggle-chip" aria-pressed="false"><svg aria-hidden="true">…plus…</svg>Promo running</button>
</div>
```
- **Group** (`.fc-toggle-chips`): wraps, 8px apart, named with `aria-label` when no visible label names it.
- **Chip** (`.fc-toggle-chip`): a real `<button>` with `aria-pressed`, a 16px Lucide icon and the condition's name.
  32px pill, like the filter chip.

## States
| State | Look |
|---|---|
| Off (`aria-pressed="false"`) | The suggestion chip's dashed edge, a plus, secondary text |
| On (`aria-pressed="true"`) | A checked control: brand edge, brand tint, a check in `--fc-control-on`, primary text |
| Hover | Gray fill when off, a deeper brand tint when on |
| Focus | The 2px canvas gap and brand ring (keyboard only) |

## Rules
- The name never changes with the state; `aria-pressed` and the icon carry it (a toggle button keeps its name).
- Name the condition as it stands now, 1 to 4 words in sentence case ("Month end", "Promo running").
- Announce what the view now shows in a polite live region (`role="status"`), never by moving focus.
- Not for exclusive choices: use the segmented control. Not for settings that persist: use the toggle.

## In practice
The detail sheet's conditions: month end, promo running, new owner, price change, each named for this week's state.
On, a condition keeps the weeks that match it; the outcome log beside it redraws, and goes cloudy under 3 weeks
(`components/outcome-log.md`).
