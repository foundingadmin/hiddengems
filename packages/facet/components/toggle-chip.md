# Toggle chips `[F]`

Built for the loupe in the Hidden Gems gem sheet (PRD F2.2). Implemented in `css/data.css` as `.fc-toggle-chips`
and `.fc-toggle-chip`. Specimen: `preview/index.html#components`, figure "Game log".

## Purpose
Turns conditions on and off, any number at once, and the view beside them redraws as each one flips. Use it when
every option is a filter that combines with the others and nothing is saved.

## Anatomy
```html
<div class="fc-toggle-chips" role="group" aria-label="Conditions this week">
  <button type="button" class="fc-toggle-chip" aria-pressed="true"><svg aria-hidden="true">…check…</svg>Home</button>
  <button type="button" class="fc-toggle-chip" aria-pressed="false"><svg aria-hidden="true">…plus…</svg>Short week</button>
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
- Name the condition as it stands now, 1 to 4 words in sentence case ("Short week", "Favored").
- Announce what the view now shows in a polite live region (`role="status"`), never by moving focus.
- Not for exclusive choices: use the segmented control. Not for settings that persist: use the toggle.

## Hidden Gems usage
The loupe's conditions: starting QB, teammate out, home or away, rest, implied points, favored or underdog, each
named for this week's side. On, a condition keeps his games on that side; the game log beside it redraws, and goes
cloudy under 3 games (`components/game-log.md`).
