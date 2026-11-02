# Team mark, matchup and player

> Facet component `[F]`, owner decisions 2026-11-02. CSS in `css/teams.css`, colors and logos from a sport kit (`kits/nfl/teams.css`, `kits/nfl/logos/`), helpers in `js/teams.mjs`.

Team identity at a glance: the team's logo, the player's number on it, and matchups that read away @ home.

```html
<link rel="stylesheet" href="@foundingcreative/facet/kits/nfl/teams.css">

<!-- Empty elements are filled by mountTeams(document, findTeam) -->
<span class="fc-team" data-team="kc"></span>                               <!-- logo + Chiefs -->
<span class="fc-team" data-team="kc" data-size="sm" data-name="abbr"></span> <!-- logo + KC -->
<span class="fc-player-avatar" data-team="sea" data-number="11"></span>
<span class="fc-matchup" data-away="buf" data-home="kc"></span>
```

Or write markup with the helpers: `teamHTML(findTeam('KC'), { name: 'name' })`, `playerHTML(findTeam('SEA'), { name: 'Jaxon Smith-Njigba', number: 11, detail: 'WR · 8 TDs' })`, `matchupHTML(away, home)`.

## Team mark

| `data-mark` | Looks like | Use |
|---|---|---|
| (none) logo | The full-color logo tile from the kit | Default everywhere a team is named |
| `mono` | The logo silhouette in the current text color | Quiet, dense places: feeds, legends, long lists |
| `abbr` | Abbreviation on the team fill with a band of the second color | A kit without logos (client work) |

| `data-name` | Shows |
|---|---|
| `name` (default) | Chiefs (the city is read by screen readers) |
| `full` | Kansas City Chiefs |
| `abbr` | KC (screen readers hear the full name) |
| `stack` | City in secondary over the name, for game headers |
| `none` | Mark only, which then carries the full name as its label |

| Size | Mark | Use |
|---|---|---|
| `sm` | 18px | Table cells and sublines |
| default | 24px | Lists and inline text |
| `lg` | 40px | Game headers, with `data-name="stack"` |

## Player

One logo per player (owner decision, 2026-11-02): the team's logo tile with the jersey number in a badge floating on its upper right, then the name and a detail line (position, market, stat).

- **The logo appears once.** The detail line does not repeat the team, so a pick reads "[logo 88] Mike Gesicki, TE · Anytime TD scorer".
- **Number badge:** neutral and inverted (`--fc-surface-contrast`), so it reads on every team's tile, with a 2px ring of the canvas to lift it off the tile. Sans 600, tabular.
- **Sizes:** `sm` 32px in table rows, default 40px in lists, `lg` 56px in sheets and headers.
- **Label:** the tile carries "Cincinnati Bengals, number 88". Without a number it is just the team logo.

## Matchup

Away first, home second, joined by `@` (screen readers hear "at"). A neutral site reads `vs`. Inline matchups show logo plus abbreviation; add `data-name="name"` for nicknames.

**Scoreboard** (`data-layout="stack"`): away on top, home below, values in trailing columns that line up across rows. Set `--fc-matchup-values` to the number of value columns, put values in `.fc-matchup-value` (mono, tabular) and mark the best price with `data-strong`. A header row labels the columns.

## Rules

- **Team colors and logos stay inside identity marks** (team mark, player tile). Never tint rows, cells, text, borders, chart series or status with them. A red team must never read as a loss, and a purple one never as a gem.
- **Charts** keep Facet's palette. Put team marks in the legend or direct labels.
- **A name or abbreviation is always next to a mark**, unless the mark carries the full name as its label. Color is never the only cue.
- **Logos are NFL trademarks**, used because Hidden Gems is private. Reusing Facet for client work means `data-mark="abbr"` or a licensed logo set.
- **Resolve feed names through the kit.** `findTeam` accepts ids, abbreviations, aliases (JAC, LA, WSH, OAK) and full names, so provider data maps to one team id. Cities alone do not resolve, because two teams share Los Angeles and New York.
