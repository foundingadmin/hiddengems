# s2 punchlist (fix/2026-11-03-2-punchlist)
1. Matchup: core `Matchup.tied` and `matchupTrack()` (null under `TREND_MIN_GAMES`, last rank at zero); gem-read says "No TDs allowed", "Tied for Nth most TDs allowed", or only the games line under 3 games. Tests in core `read.test.ts`; Facet `rank-track.md`.
2. Price chart: record times clamp between the first price and the Kickoff line; on record the line steps to the close price at the close (`gem-read.tsx`).
3. CLV takeaway pill reads "Beat/Missed/Matched the fair close"; the chart summary says "against the fair close".
4. `backtest` on sample usage (`ctx.providers.usage.id === 'sample'`) reports "Brier x over n player games in Weeks a to b on sample data" and never warns; ingest `backtest.test.ts` covers both.
5. Weather helper: `ConditionsList` takes `now`, renders `.fc-freshness` with a status dot (live under 6h) and `ago(pulled, now)`; Facet `data.css` spaces it in a `dd`, `description.md` documents it.
6. Shots in `.sprint/shots/s2punch/`: `data-*` and `data-weather-row-*`, `gem-context-*`, `gem-graded-chart-*`; graded chart from a local gem record on a sample pick with the server clock past kickoff, `gem-context-mock-*` with a temporary matchup override (zero, tied).
