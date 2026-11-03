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

## Cloudy `[F]`
A thin sample (under 3 games, PRD F2.2) is cloudy: `data-cloudy` on `.fc-game-log-cells` blurs and fades the
marks, and on a `.fc-game-log-rate` it turns the value secondary and softens it. Opponents and labels stay sharp,
and the rate's label says how many games there are ("Only 2 games match"), so the haze is never the only cue.
Reduced transparency drops the blur and keeps the fade.

## In the loupe `[F]`
The loupe puts toggle chips (`components/toggle-chip.md`) over the log and a second rate beside the season's:
```html
<div class="fc-game-log">
  <p class="fc-game-log-rate"><span class="fc-game-log-value">38%</span><span class="fc-game-log-label">3 of 8 this season</span></p>
  <p class="fc-game-log-rate" data-cloudy><span class="fc-game-log-value">42%</span><span class="fc-game-log-label">Only 2 games match</span></p>
  <ol class="fc-game-log-cells" data-cloudy aria-label="Last 2 matching games, oldest first">…</ol>
</div>
```
- Both rates are percents here, so they compare; the season's record sits in its label as "n of m".
- The matching rate is shrunk toward the season rate, and its value carries a tip that says so.
- Filtered, the cells are the matching games only, with no bye: a week left out is not a bye.

## Rules
- Gray only. A hit is a result, not a gem, so purple stays out (`DESIGN.md`, Hue allocation).
- Shape carries the result, the label and hidden text carry it in words, so color is never the only cue.
- Write the record as "n of m", never a bare percentage (samples under 20, `patterns/hidden-gems.md`).
- The cells shrink to fit a phone; ten games and a bye fit in 342px.
