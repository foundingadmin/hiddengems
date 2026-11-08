---
id: MOD0
parent: none
status: retired
created: 2026-11-02
retired: 2026-11-06
hypothesis: The v3.0 red zone model alone finds anytime TD props that beat the posted DraftKings price, at any price.
---

# MOD0 · retired app rules

The board as the app picked it from Nov 2 to Nov 6 2026, before pull request 51. Kept as the back trial baseline.

## Source

Main at commit `99590a7` (the merge of pull request 50, the last commit before pull request 51). Rules live in
`packages/core/src/gems.ts` and `packages/core/src/model.ts` at that commit. The TD model is unchanged since, so
MOD0 can be rebuilt from today's estimates.

## Rules

1. **Board.** Anytime TD props with a DraftKings price on the lock pull. No other market.
2. **Hit chance.** Hidden Gems v3.0 with implied team points (`readProp()` in `model.ts`): red zone read, 80/20
   blend with the shrunk TD hit rate, logistic recalibration a = -0.213 and b = 0.755, then the market blend with
   stats weight 0.5 (0.3 under 4 games) times min(1, 8 / (price + 4)).
3. **Clarity.** Sample 40, consistency 30, books agree 15, setup 15. Setup is 15, Questionable 8, Doubtful 2, Out 0,
   minus 5 for a falling snap share. No practice penalty.
4. **Edge.** Hit chance minus the posted price's implied chance (1 / price), in points.
5. **Gem.** The player has 2026 stats and the edge is above 0. No price range and no injury or roster block: an
   Out player can still be a gem, with low clarity.
6. **Rating.** `round(100 * clamp(carat / 10, 0, 1) * clarity / 100)`, where carat is hit chance minus the fair
   chance (`fairChance()`), in points.

### Rebuilding from a current pull

For each `estimates` row on the lock pull with `model = 'hg-v3.0'` and market `anytime_td`, take `probability` as
hit chance and the DraftKings price from `inputs.books.draftkings`. Rebuild setup without the practice penalty as
`max(0, (INJURY_SETUP[inputs.injury] ?? 15) - falling)`, where `falling` is 5 when
`inputs.form.snapRecent < 0.8 * inputs.form.snapSeason`, else 0. Then clarity is `round(sample + consistency + booksAgree + setup)` with the first three taken from
`inputs.clarity`. Ignore `inputs.block`. Rows with `inputs.form` null have no 2026 stats and are no gem. Apply
rules 4 to 6.

## Gem bands

| Band | Rating |
| --- | --- |
| GEM1 | 0 to 19 |
| GEM2 | 20 to 39 |
| GEM3 | 40 to 59 |
| GEM4 | 60 to 79 |
| GEM5 | 80 to 100 |

## Read

None.

## Backtest

Fully backtestable from any saved board: the model reads only games played before the week, plus that week's
lines, injury report and prices.

## Record

- Thu Nov 5 2026 board (WK9 Thursday, outside the segments): 0 of 5.
