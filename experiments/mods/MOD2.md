---
id: MOD2
parent: MOD0
status: trial
created: 2026-11-07
hypothesis: The app's models alone, held to the pilot's price range and a 1 point edge, beat the book with no read.
---

# MOD2 · app as shipped

The Gems board exactly as the app builds it from Nov 7 2026, after pull requests 51 and 52.

## Source

Main at commit `d06b4ea` (the merge of pull request 52). Rules live in `packages/core/src/gems.ts`
(`appraise()`, `GEM_RULES`), `availability.ts`, `model.ts` and `stat-model.ts`. A live run reads the `picks`
table on the lock pull, `kind = 'gem'`.

## Changes from MOD0

Four rule changes shipped together in one release, so a MOD2 against MOD0 result cannot say which one mattered.

1. Stat ladders added.
2. Price range 2.50 to 5.00.
3. Edge 1 point or more, up from above 0.
4. Injury and roster blocks, plus a practice penalty on clarity.

## Rules

1. **Board.** DraftKings props on the lock pull in four markets. Anytime TD, and over side only at every line on
   receptions, receiving yards and rushing yards. Each rung is its own prop.
2. **Hit chance, anytime TD.** Hidden Gems v3.0 with implied team points, as in MOD0 rule 2.
3. **Hit chance, ladders.** `readStatProp()` (model `hg-stat-1.0`): his 2026 games at the line, recency weight
   0.9 per game back, smoothed by half his spread (at least 0.5 receptions or 5 yards), recalibrated a = -0.28 and
   b = 0.85, then the same market blend as the TD model.
4. **Clarity.** As MOD0, with ladders measuring sample at full marks from 8 games and consistency as the gap
   between the smoothed read and his plain hit rate (zero at 20 points). A limited or missed last practice costs 4
   setup points.
5. **Blocks.** No gem when he is Out or Doubtful on the latest injury report, or his team now differs from the
   team of his latest 2026 game.
6. **Edge.** Hit chance minus 1 / price, in points.
7. **Gem.** Not blocked, has 2026 stats, DraftKings price 2.50 to 5.00 inclusive, and edge 1 point or more.
8. **Rating.** Same formula as MOD0.

## Gem bands

| Band | Rating |
| --- | --- |
| GEM1 | 0 to 19 |
| GEM2 | 20 to 39 |
| GEM3 | 40 to 59 |
| GEM4 | 60 to 79 |
| GEM5 | 80 to 100 |

## Read

None. The injury report enters only through rules 4 and 5.

## Backtest

Fully backtestable from a saved board. Ladders need a saved board with ladder prices; on the free odds plan
those exist only from the Sunday morning pull and confirmed manual pulls. The nflverse injury report is
archived by week, so blocks replay too.

## Record

Backtest only so far. Live from WK9AM, Sun Nov 8 2026.
