# Team mark and matchup

> Facet component `[F]`, owner decision 2026-11-02. CSS in `css/teams.css`, colors from a sport kit (`kits/nfl/teams.css`), helpers in `js/teams.mjs`.

A team mark is the team's abbreviation on its primary color, with a band of its secondary color underneath. It is how a team is recognized at a glance in tables, lists and game headers.

```html
<link rel="stylesheet" href="@foundingcreative/facet/kits/nfl/teams.css">

<span class="fc-team" data-team="kc">
  <span class="fc-team-mark" aria-hidden="true">KC</span>
  <span class="fc-team-name"><span class="fc-visually-hidden">Kansas City </span>Chiefs</span>
</span>

<!-- Mark only: the mark carries the full name -->
<span class="fc-team" data-team="kc" data-size="sm"><span class="fc-team-mark" role="img" aria-label="Kansas City Chiefs">KC</span></span>
```

Or let the helpers write the markup: `teamHTML(findTeam('KC'), { name: 'name' })`, or leave `<span class="fc-team" data-team="kc" data-name="full"></span>` empty and call `mountTeams(document, findTeam)`.

## Anatomy

- **Mark:** abbreviation in 600 weight on `--team-1`, band of `--team-2`, inner hairline (`--fc-border-alpha`) so black and navy marks hold their edge in dark mode. Fixed width (1.5 times its height), so two- and three-letter marks line up in a column.
- **Ink:** the build picks white or black, whichever contrasts more with the fill. That is why Bengals, Broncos, Chargers, Dolphins, Panthers and Saints read in black. A kit may override `ink` only with a value that still passes 4.5:1.
- **Name:** `name` (Chiefs), `full` (Kansas City Chiefs), `stack` (city in secondary over the name) or `none` (mark only).

## Sizes

| Size | Mark | Use |
|---|---|---|
| `sm` | 18px, 2px band, 10px type | Table cells and sublines |
| default | 24px, 3px band, 11px type | Lists and inline text |
| `lg` | 40px, 4px band, 14px type | Game headers, with `data-name="stack"` |

## Matchup

Away first, home second, joined by `@` (screen readers hear "at"). A neutral site reads `vs`.

```html
<span class="fc-matchup" data-away="buf" data-home="kc" data-size="sm"></span>   <!-- filled by mountTeams -->
```

**Scoreboard** (`data-layout="stack"`): away on top, home below, values in trailing columns that line up across rows. Set `--fc-matchup-values` to the number of value columns, put values in `.fc-matchup-value` (mono, tabular) and mark the best price with `data-strong`. A header row labels the columns.

## Rules

- **Team colors stay inside the mark** (hue rule, `DESIGN.md`). Never tint rows, cells, text, borders, chart series or status with them. A red team must never read as a loss, and a purple one never as a gem.
- **Charts** keep Facet's palette. Put team marks in the legend or direct labels, not team colors in the lines.
- **The abbreviation is always visible.** Color is never the only cue, and two navy teams (Patriots, Seahawks) still read apart.
- **Abbreviations, not logos.** Logos are trademarks. A licensed logo can replace the abbreviation inside `.fc-team-mark` later without changing any layout.
- **Resolve feed names through the kit.** `findTeam` accepts ids, abbreviations, aliases (JAC, LA, WSH, OAK) and full names, so provider data maps to one team id. Cities alone do not resolve, because two teams share Los Angeles and New York.
