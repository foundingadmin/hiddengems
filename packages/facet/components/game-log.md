# Game log `[F]`

The Last 10 row from the Hidden Gems PRD (F0.3), promoted from the approved wireframes (`.hg-log` in
`docs/wireframes/hg-wire.css`). Implemented in `css/data.css` as `.fc-game-log`.

## Purpose
Shows a player's recent games at a glance: which ones hit, which missed, and where the bye fell, beside the
season record that outranks them.

## Anatomy
```html
<div class="fc-game-log">
  <p class="fc-game-log-rate"><span class="fc-game-log-value">5 of 8</span><span class="fc-game-log-label">This season</span></p>
  <ol class="fc-game-log-cells" aria-label="Last 8 games, oldest first">
    <li data-result="hit"><span aria-hidden="true">NYJ</span><span class="fc-visually-hidden">Week 1, vs NYJ, TD</span></li>
    <li data-result="miss"><span aria-hidden="true">JAX</span><span class="fc-visually-hidden">Week 3, at JAX, no TD</span></li>
    <li data-result="bye"><span aria-hidden="true">Bye</span><span class="fc-visually-hidden">Week 7, bye</span></li>
  </ol>
</div>
<ul class="fc-game-log-key" aria-label="Key"><li data-result="hit">TD</li><li data-result="miss">No TD</li><li data-result="bye">Bye</li></ul>
```
- **Rate** (`.fc-game-log-rate`): the season record as "n of m", leading, since it outranks the last 10.
- **Cells** (`.fc-game-log-cells`): one per game, oldest first, the opponent under each. At most 10 games, plus
  the bye when it falls inside them.
- **Key** (`.fc-game-log-key`): optional, names the three cell states with the market's words.

## States
| `data-result` | Cell | Meaning |
|---|---|---|
| `hit` | Filled, primary text gray | The prop hit (a TD for anytime TD) |
| `miss` | Hollow, gray-700 ring | It did not |
| `bye` | Dashed, label "Bye" | The team had no game that week |

Games the player missed are left out: they are neither a hit nor a miss.

## Rules
- Gray only. A hit is a result, not a gem, so purple stays out (`DESIGN.md`, Hue allocation).
- Shape carries the result, the label and hidden text carry it in words, so color is never the only cue.
- Write the record as "n of m", never a bare percentage (samples under 20, `patterns/hidden-gems.md`).
- The cells shrink to fit a phone; ten games and a bye fit in 342px.
