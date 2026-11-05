# Rank track `[F]`

Where one team sits from 1 to N on a single measure (32 once every team has played). CSS in `css/data.css`
(`.fc-rank-track`); specimen in `preview/index.html` (Game conditions).

## Anatomy
```html
<span class="fc-rank-track" aria-hidden="true" style="--at: 0.13">
  <span>1</span>
  <span class="fc-rank-track-rail"><span class="fc-rank-track-mark"></span></span>
  <span>32</span>
</span>
```
- Both ends labelled in 12px secondary, tabular figures. The rail is a 1px `--fc-border-active` hairline, the mark
  an 8px dot in primary text.
- `--at` is the position from 0 (rank 1) to 1 (rank N): `(rank - 1) / (N - 1)`.
- At most 256px wide, so the dot reads as a position, not a bar.

## Rules
- The words beside it state the rank ("5th most TDs allowed"), so the track is `aria-hidden`; it never carries
  the rank alone.
- Gray only. A rank is context, not a verdict, so no signal or gem hue.
- Inside a context row (`data-context`, `description.md`) the mark turns secondary with the rest of the row.
- Ties say so ("Tied for 2nd most TDs allowed"). A team at zero reads "No TDs allowed" with the mark at the
  last rank. Under 3 games there is no rank and no track, only the basis ("0.0 a game over 1 game").

## Hidden Gems usage
Gem sheet, Context: the opponent's rank in touchdowns allowed to the player's position, above its last four games
as game log cells (filled: allowed one or more, hollow: none).
