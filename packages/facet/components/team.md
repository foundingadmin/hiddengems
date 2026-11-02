# Team mark, matchup and player

> Facet component `[F]`, owner decisions 2026-11-02. CSS in `css/teams.css`, colors and logos from a sport kit (`kits/nfl/teams.css`, `kits/nfl/logos/`), helpers in `js/teams.mjs`.

Team identity at a glance: the team's logo, players with their number, and matchups that read away @ home.

```html
<link rel="stylesheet" href="@foundingcreative/facet/kits/nfl/teams.css">

<!-- Empty elements are filled by mountTeams(document, findTeam) -->
<span class="fc-team" data-team="kc"></span>                               <!-- logo + Chiefs -->
<span class="fc-team" data-team="kc" data-size="sm" data-name="abbr"></span> <!-- logo + KC -->
<span class="fc-player-avatar" data-team="sea"></span>
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

The team logo tile once, then the name with the jersey number trailing it, then a detail line (position, market, stat). Owner decisions, 2026-11-02.

```html
<span class="fc-player">
  <span class="fc-player-avatar" data-team="cin" data-size="sm"></span>
  <span class="fc-player-main">
    <span class="fc-player-line"><span class="fc-player-name">Mike Gesicki</span><span class="fc-player-number" data-number="88"></span></span>
    <span class="fc-player-meta">TE · Anytime TD scorer</span>
  </span>
</span>
```

- **The logo appears once.** The detail line does not repeat the team.
- **Number:** "#88" in secondary text right after the name, tabular. Screen readers hear "number 88". The name truncates before the number does.
- **Tile sizes:** `sm` 32px in table rows, default 40px in lists, `lg` 56px in sheets and headers. The tile carries the team's full name as its label.
- **Clickable names:** put the button or link in `.fc-player-line` in place of `.fc-player-name`, so the number still trails it (the slate does this).

## Matchup

Away first, home second, joined by `@` (screen readers hear "at"). A neutral site reads `vs`. Inline matchups show logo plus abbreviation; add `data-name="name"` for nicknames.

**Scoreboard** (`data-layout="stack"`): away on top, home below, values in trailing columns that line up across rows. Set `--fc-matchup-values` to the number of value columns, put values in `.fc-matchup-value` (mono, tabular) and mark the best price with `data-strong`. A header row labels the columns.

## Rules

- **Team colors and logos stay inside identity marks** (team mark, player tile). Never tint rows, cells, text, borders, chart series or status with them. A red team must never read as a loss, and a purple one never as a gem.
- **Charts** keep Facet's palette. Put team marks in the legend or direct labels.
- **A name or abbreviation is always next to a mark**, unless the mark carries the full name as its label. Color is never the only cue.
- **Logos are NFL trademarks**, used because Hidden Gems is private. Reusing Facet for client work means `data-mark="abbr"` or a licensed logo set.
- **Resolve feed names through the kit.** `findTeam` accepts ids, abbreviations, aliases (JAC, LA, WSH, OAK) and full names, so provider data maps to one team id. Cities alone do not resolve, because two teams share Los Angeles and New York.
