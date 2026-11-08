# Weeks 1 to 8 backtest

## MOD4, MOD5 and MOD6

Three MODs kept apart by what each may read, tailored on Weeks 2 to 6, frozen, then run once on sealed Weeks 7 and 8 with MOD2 (main today) alongside as the control. Every game counts (Thursday, Sunday, Monday) across ten bet types. Edge is the MOD's chance minus DraftKings' implied chance with the vig in, and a gem needs edge above zero. Each MOD keeps one bet per player and stat, and every gem logs its line position (MAIN or ALT) and the DraftKings main line. Passing means more hits than the book expected and a positive flat $1 ROI.

### Sealed Weeks 7 and 8

| MOD | Gems | Hits | Book expected | z | Flat ROI | Raw CLV | Verdict |
|---|---|---|---|---|---|---|---|
| MOD4 | 9 | 3 of 8 | 2.2 | 0.61 | +25.3% | +4.79% | pass |
| MOD5 | 24 | 12 of 23 | 11.3 | 0.3 | +8.6% | +3.10% | pass |
| MOD6 | 11 | 5 of 11 | 5.5 | -0.28 | -9.4% | -1.19% | fail |
| MOD2 control | 306 | 75 of 303 | 85.8 | -1.39 | -10.9% | +3.27% | fail |

Raw CLV is the price taken over DraftKings' price at the close, minus one, so above zero means the line moved toward the pick. MOD2 reads only its four markets. Gem overlap (shared game, player and stat, as a share of the smaller MOD) is MOD4 and MOD5 11%, MOD4 and MOD6 0%, MOD5 and MOD6 0%, MOD2 and MOD4 44%, MOD2 and MOD5 54%, MOD2 and MOD6 0%.

### By market, sealed

| MOD | Market | Gems | Hits | Book expected | z | Flat ROI | Raw CLV |
|---|---|---|---|---|---|---|---|
| MOD4 | reception_yds | 2 | 0 of 2 | 0.5 | -0.86 | -100.0% | +4.54% |
| MOD4 | rush_yds | 3 | 1 of 2 | 0.5 | 0.72 | +84.5% | +11.67% |
| MOD4 | pass_attempts | 4 | 2 of 4 | 1.2 | 0.93 | +58.3% | -0.24% |
| MOD5 | receptions | 10 | 6 of 10 | 4.4 | 0.99 | +37.8% | +1.66% |
| MOD5 | reception_yds | 4 | 3 of 4 | 2.1 | 0.89 | +41.5% | +2.00% |
| MOD5 | rush_yds | 6 | 2 of 5 | 2.6 | -0.58 | -23.6% | +1.76% |
| MOD5 | rush_attempts | 4 | 1 of 4 | 2.1 | -1.09 | -57.0% | +14.60% |
| MOD6 | receptions | 3 | 1 of 3 | 1.3 | -0.34 | -24.7% | -1.72% |
| MOD6 | reception_yds | 5 | 2 of 5 | 2.6 | -0.58 | -23.6% | 0.00% |
| MOD6 | rush_yds | 1 | 1 of 1 | 0.5 | 0.95 | +91.0% | n/a |
| MOD6 | rush_attempts | 1 | 0 of 1 | 0.5 | -1 | -100.0% | 0.00% |
| MOD6 | pass_completions | 1 | 1 of 1 | 0.5 | 0.99 | +98.0% | -1.98% |
| MOD2 | anytime_td | 14 | 6 of 13 | 3.3 | 1.73 | +85.0% | -0.68% |
| MOD2 | receptions | 74 | 13 of 74 | 20.7 | -2.02 | -37.9% | +4.11% |
| MOD2 | reception_yds | 154 | 42 of 154 | 44 | -0.35 | -2.2% | +3.68% |
| MOD2 | rush_yds | 64 | 14 of 62 | 17.8 | -1.08 | -20.3% | +2.18% |

### The cards

**MOD4** · Market only. DraftKings against the vig-free median of the other books at the same line. No player stats. Frozen after 3 of 15 runs, sha256 `add227a57f93677a`. Weeks 2 to 6 at the freeze had 37 gems (7.4 a week), 11 hits against 9.2 expected, ROI +20.6%, raw CLV +6.71%. Card `experiments/mods/MOD4-card.json`, log `experiments/mods/MOD4-log.md`.

**MOD5** · Football only. Projects each stat from recency weighted games, the 2025 season, the defense against the position and team implied points. No other books. Frozen after 8 of 15 runs, sha256 `a16234236541c07f`. Weeks 2 to 6 at the freeze had 36 gems (7.2 a week), 16 hits against 17.7 expected, ROI -9.9%, raw CLV +1.55%. Card `experiments/mods/MOD5-card.json`, log `experiments/mods/MOD5-log.md`.

**MOD6** · News only. Backs whoever inherits the work when a starter is Out or Doubtful (injury report plus depth chart), on DraftKings' own vig-free chance shifted for the event. No projections, no other books. Frozen after 5 of 15 runs, sha256 `db16b86ec26fe548`. Weeks 2 to 6 at the freeze had 37 gems (7.4 a week), 22 hits against 18.7 expected, ROI +17.4%, raw CLV +0.10%. Card `experiments/mods/MOD6-card.json`, log `experiments/mods/MOD6-log.md`.

### Tailoring and the seal

- Every run wrote its line in the MOD's log before it ran, and `ops/backtest/mods/harness.ts` refuses a run without a pending line or past 15. A count-only mode sizes a card by gems a week without reading outcomes or closes, and is not a run.
- Weeks 7 and 8 open only through `--sealed`, which checks each card is frozen and its sha256 matches the hash given, then runs once and refuses a second time. The cards and their hashes were committed before the unseal.
- The guard from the first backtest holds for every input. Box scores are stamped at kickoff, each team's injury report at its final report (Wednesday for Thursday games, Friday for Sunday, Saturday for Monday) and depth charts at their snapshot. Spreads and totals come from the Saturday (or Wednesday) board itself, so MOD5's game script carries no closing line.
- MOD5 run 8 ran at a 26 point edge floor while its log line says 22. The note sits under it in the log.
- The first backtest's MOD2 Sunday results for Weeks 7 and 8 were published before this brief. MOD4, MOD5 and MOD6 never saw those weeks.
- Samples are small (a few dozen sealed gems per MOD). A z between minus 2 and plus 2 is noise, so a pass or fail here is a direction, not a verdict.

### The history buy

- 32,847 credits on the 100K plan (cap 36,000, dry run upper bound 32,907), 67,153 left this month.
- Weeks 2 to 8, 105 games (91 Sunday, 7 Thursday, 7 Monday), board and close for each. Sunday games added 15 keys (pass yards, rush plus receiving yards, pass plus rush yards, rush attempts, pass completions and pass attempts, main and alt, plus main receptions, receiving yards and rushing yards). Thursday and Monday games took all 19. Spreads and totals for every game at each board.
- DraftKings posted every key at every board and close except pass plus rush yards main (Week 2 Browns at Buccaneers, Week 7 Rams at Raiders) and its alt ladder (Week 7 Rams at Raiders).
- Stored in `foundingadmin/hiddengems-backups` at `capsules/2026/wkNN/{sat,close}/odds/<gameId>.json.gz` (240 files, 4 MB), each holding the merged event and the original responses. A Thursday game's Wednesday board sits under `sat` as its board.

### Run it again, 0 credits

```
git clone https://github.com/foundingadmin/hiddengems-backups /tmp/backups   # private
packages/ingest/node_modules/.bin/tsx ops/backtest/capsule-io.ts import /tmp/backups
packages/ingest/node_modules/.bin/tsx ops/backtest/mods/harness.ts --mod MOD4 --count
```

## MOD0 to MOD3

The first backtest (Nov 7 2026), Sunday games and four markets only.

## Method

- Each 2026 Sunday of Weeks 1 to 8 is replayed from the Saturday 7:47 PM Mountain board before it. Thursday, Saturday and Monday games are skipped. Segments by Mountain kickoff: AM before noon, PM noon to 4 PM, SNF 4 PM on.
- Board: The Odds API historical event odds at that moment, DraftKings plus FanDuel, BetMGM, Caesars and Fanatics, for anytime TD and the receptions, receiving yards and rushing yards ladders, over sides only. Close: the same at 20 minutes before each kickoff, for CLV (taken over the close fair price, core `closingLineValue`).
- Inputs: nflverse 2026 play by play, snap counts and weekly stats from games before the week, the schedule's spread and total lines, that week's injury report and weekly roster.
- MOD0 is the gate in `gems.ts` before PR 51 on core `readProp` (anytime TD, any edge over the posted price, any price, no blocks). MOD1q is every DraftKings prop at 2.50 or more whose hit rate at that line over 3 or more games before the week is 60% or more, banded 60, 65, 70, 75, 80 as GEM1 to GEM5. MOD2 calls core `readProp`, `readStatProp`, `availabilityBlock`, `appraise` and `GEM_RULES` as `build-picks` does; its level is the rating in fifths. MOD1 and MOD3 are MOD1q and MOD2 after the read (below).
- Hit rate parity with Outlier's Season Trends: hit rate = games clearing the line this season / games played, from nflverse weekly stats, over games before the week. Clearing over 4.5 needs 5 (core `statNeeded`); anytime TD needs one rushing, receiving, return or recovery touchdown. Games played are games with an offensive snap or a stat line, so a game he played and recorded nothing counts as a miss.
- Grading: core `propHit` on the nflverse box score. A player with no snap or stat line that game is void, as the book voids it. Pass means hits at least equal the book's expected hits (the sum of DraftKings implied chances).
- Week 1 is in the ledger with no picks and no odds bought: no 2026 game precedes it, so MOD0 and MOD2 have no read and MOD1q has no 3 games.

## The read

Each week has a Saturday capsule, `experiments/backtest/capsules/WK{n}-saturday.md`, holding only material dated before that board: the nflverse injury report, the nflverse depth chart from its last snapshot before the board, and Wayback Machine captures of league injury and news pages taken before the board, each item with outlet, URL and capture time. It covers only players who passed MOD1q's or MOD2's screen. The read is a subagent (`.claude/agents/capsule-reader.md`) whose only tool is Read, limited to that capsule. It returns keep, cut or downgrade with one line why, logged in each pick's `reads`. Cut picks leave MOD1 and MOD3; a downgrade lowers the level by one.

## The guard

`ops/backtest/data.ts` `capsule()` stamps every input with when it became knowable and fails the run on any input stamped at or after the board: usage and box scores at their game's kickoff, the injury report at Friday 4 PM Eastern, the weekly roster at Wednesday 4 PM Eastern. Every board price and the snapshot itself must be stamped no later than the board, and every close must fall between the board and its game's close time.
Two things the guard cannot see. nflverse stores the closing spread and total, not Saturday's, so implied team points carry about one night of line movement. Stat corrections made after the week are in the box scores. Both are small and push every MOD the same way.

- Week 1: 2 inputs checked, 0 DraftKings selections, 0 player names unmatched
- Week 2: 16,121 inputs checked, 4137 DraftKings selections, 29 player names unmatched
- Week 3: 17,351 inputs checked, 4073 DraftKings selections, 32 player names unmatched
- Week 4: 19,543 inputs checked, 4297 DraftKings selections, 32 player names unmatched
- Week 5: 19,108 inputs checked, 3677 DraftKings selections, 29 player names unmatched
- Week 6: 20,111 inputs checked, 3583 DraftKings selections, 54 player names unmatched
- Week 7: 22,183 inputs checked, 4036 DraftKings selections, 42 player names unmatched
- Week 8: 23,665 inputs checked, 4142 DraftKings selections, 54 player names unmatched

## Credit spend

7,245 credits over 1 fetch runs (12714 left after the last). Raw responses are cached in `experiments/backtest/cache/`, never committed.

## Results

| MOD | Week | Picks | Graded | Hits | Book expected | Pass | ROI | CLV |
|---|---|---|---|---|---|---|---|---|
| MOD0 | 1 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD0 | 2 | 42 | 41 | 6 | 8.89 | fail | -53.5% | -12.1% |
| MOD0 | 3 | 44 | 42 | 8 | 7.14 | pass | +66.2% | -13.3% |
| MOD0 | 4 | 40 | 37 | 5 | 5.80 | fail | -6.9% | -14.4% |
| MOD0 | 5 | 59 | 58 | 4 | 8.69 | fail | -61.6% | -17.1% |
| MOD0 | 6 | 63 | 63 | 7 | 9.34 | fail | -20.2% | -14.9% |
| MOD0 | 7 | 52 | 51 | 5 | 7.97 | fail | -50.3% | -12.5% |
| MOD0 | 8 | 50 | 46 | 10 | 6.14 | pass | +96.6% | -18.5% |
| MOD1q | 1 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1q | 2 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1q | 3 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1q | 4 | 96 | 93 | 19 | 28.62 | fail | -37.6% | -9.8% |
| MOD1q | 5 | 33 | 33 | 7 | 10.21 | fail | -34.7% | -11.2% |
| MOD1q | 6 | 62 | 61 | 10 | 18.47 | fail | -50.0% | -7.6% |
| MOD1q | 7 | 39 | 39 | 15 | 12.36 | pass | +28.7% | -6.1% |
| MOD1q | 8 | 31 | 31 | 9 | 9.13 | fail | -2.7% | -6.7% |
| MOD1 | 1 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1 | 2 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1 | 3 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD1 | 4 | 96 | 93 | 19 | 28.62 | fail | -37.6% | -9.8% |
| MOD1 | 5 | 32 | 32 | 7 | 9.84 | fail | -32.6% | -11.0% |
| MOD1 | 6 | 62 | 61 | 10 | 18.47 | fail | -50.0% | -7.6% |
| MOD1 | 7 | 39 | 39 | 15 | 12.36 | pass | +28.7% | -6.1% |
| MOD1 | 8 | 31 | 31 | 9 | 9.13 | fail | -2.7% | -6.7% |
| MOD2 | 1 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD2 | 2 | 172 | 172 | 38 | 51.71 | fail | -25.2% | -8.8% |
| MOD2 | 3 | 147 | 142 | 29 | 40.54 | fail | -31.8% | -6.4% |
| MOD2 | 4 | 106 | 103 | 26 | 30.52 | fail | -11.6% | -8.9% |
| MOD2 | 5 | 98 | 98 | 24 | 28.36 | fail | -13.7% | -9.4% |
| MOD2 | 6 | 137 | 135 | 30 | 38.93 | fail | -21.9% | -6.9% |
| MOD2 | 7 | 144 | 144 | 42 | 40.64 | pass | +5.0% | -6.5% |
| MOD2 | 8 | 120 | 120 | 30 | 34.15 | fail | -8.3% | -4.5% |
| MOD3 | 1 | 0 | 0 | 0 | 0.00 | n/a | n/a | n/a |
| MOD3 | 2 | 172 | 172 | 38 | 51.71 | fail | -25.2% | -8.8% |
| MOD3 | 3 | 147 | 142 | 29 | 40.54 | fail | -31.8% | -6.4% |
| MOD3 | 4 | 106 | 103 | 26 | 30.52 | fail | -11.6% | -8.9% |
| MOD3 | 5 | 98 | 98 | 24 | 28.36 | fail | -13.7% | -9.4% |
| MOD3 | 6 | 137 | 135 | 30 | 38.93 | fail | -21.9% | -6.9% |
| MOD3 | 7 | 144 | 144 | 42 | 40.64 | pass | +5.0% | -6.5% |
| MOD3 | 8 | 120 | 120 | 30 | 34.15 | fail | -8.3% | -4.5% |

### Totals

| MOD | Picks | Graded | Hits | Book expected | Weeks passed | ROI | CLV | Brier, MOD | Brier, book |
|---|---|---|---|---|---|---|---|---|---|
| MOD0 | 350 | 338 | 45 | 53.97 | 2 of 7 | -7.8% | -14.8% | 0.1126 | 0.1105 |
| MOD1q | 261 | 257 | 60 | 78.79 | 1 of 5 | -25.9% | -8.5% | 0.3826 | 0.1804 |
| MOD1 | 260 | 256 | 60 | 78.42 | 1 of 5 | -25.6% | -8.5% | 0.3819 | 0.1806 |
| MOD2 | 924 | 914 | 219 | 264.85 | 1 of 7 | -16.0% | -7.3% | 0.1993 | 0.1846 |
| MOD3 | 924 | 914 | 219 | 264.85 | 1 of 7 | -16.0% | -7.3% | 0.1993 | 0.1846 |

### Price movement

Core's CLV prices the close with the assumed cut taken out, so an unmoved price scores about the cut below zero. Raw movement compares the lock price with the closing DraftKings price.

| MOD | With a close | Closed shorter | Closed longer | Raw price CLV |
|---|---|---|---|---|
| MOD0 | 339 | 109 | 166 | -1.4% |
| MOD1q | 257 | 129 | 117 | +0.2% |
| MOD1 | 256 | 129 | 116 | +0.2% |
| MOD2 | 913 | 508 | 381 | +1.4% |
| MOD3 | 913 | 508 | 381 | +1.4% |

### Kill rule

A MOD is retired and its slot opens when hits fall 2 or more standard deviations below the book's expected hits across all back trials. MOD2 and MOD3 are judged on Weeks 7 and 8 only, since the stat model was fit on Weeks 4 to 6.

| MOD | Weeks judged | Graded | Hits | Book expected | SD | z | Verdict |
|---|---|---|---|---|---|---|---|
| MOD0 | all | 338 | 45 | 53.97 | 6.54 | -1.37 | stays |
| MOD1q | all | 257 | 60 | 78.79 | 7.28 | -2.58 | retired |
| MOD1 | all | 256 | 60 | 78.42 | 7.27 | -2.54 | retired |
| MOD2 | all | 914 | 219 | 264.85 | 13.60 | -3.37 | in sample, not judged |
| MOD2 | 7 and 8 | 264 | 72 | 74.79 | 7.26 | -0.38 | stays |
| MOD3 | all | 914 | 219 | 264.85 | 13.60 | -3.37 | in sample, not judged |
| MOD3 | 7 and 8 | 264 | 72 | 74.79 | 7.26 | -0.38 | stays |

### The read

| Verdict | Graded picks | Hits | Book expected | Hits over expected |
|---|---|---|---|---|
| keep | 1071 | 259 | 314.21 | 0.82 |
| downgrade | 99 | 20 | 29.06 | 0.69 |

### By level

| MOD | Level | Graded | Hit rate | Mean MOD chance | Mean book chance | ROI |
|---|---|---|---|---|---|---|
| MOD0 | GEM1 | 261 | 11.9% | 15.5% | 14.5% | -3.9% |
| MOD0 | GEM2 | 71 | 19.7% | 23.4% | 20.9% | -14.5% |
| MOD0 | GEM3 | 6 | 0.0% | 29.0% | 23.7% | -100.0% |
| MOD1q | GEM1 | 61 | 21.3% | 60.0% | 30.6% | -35.9% |
| MOD1q | GEM2 | 145 | 22.1% | 66.7% | 29.9% | -30.3% |
| MOD1q | GEM3 | 4 | 0.0% | 71.4% | 25.4% | -100.0% |
| MOD1q | GEM4 | 18 | 27.8% | 75.0% | 34.0% | -20.3% |
| MOD1q | GEM5 | 29 | 34.5% | 90.0% | 33.0% | +24.1% |
| MOD1 | GEM1 | 74 | 20.3% | 61.2% | 30.5% | -39.0% |
| MOD1 | GEM2 | 132 | 22.7% | 66.7% | 29.9% | -28.1% |
| MOD1 | GEM3 | 5 | 0.0% | 72.1% | 26.9% | -100.0% |
| MOD1 | GEM4 | 17 | 29.4% | 75.3% | 33.9% | -15.6% |
| MOD1 | GEM5 | 28 | 35.7% | 90.3% | 33.0% | +28.6% |
| MOD2 | GEM1 | 107 | 19.6% | 30.2% | 27.8% | -22.8% |
| MOD2 | GEM2 | 455 | 25.3% | 32.7% | 28.6% | -11.7% |
| MOD2 | GEM3 | 277 | 22.7% | 40.7% | 29.9% | -22.5% |
| MOD2 | GEM4 | 71 | 26.8% | 39.0% | 29.3% | -7.4% |
| MOD2 | GEM5 | 4 | 25.0% | 42.1% | 31.3% | -24.3% |
| MOD3 | GEM1 | 156 | 21.2% | 31.3% | 27.9% | -19.6% |
| MOD3 | GEM2 | 424 | 25.2% | 33.1% | 28.8% | -12.4% |
| MOD3 | GEM3 | 260 | 22.7% | 40.4% | 29.8% | -22.2% |
| MOD3 | GEM4 | 70 | 27.1% | 39.0% | 29.4% | -6.1% |
| MOD3 | GEM5 | 4 | 25.0% | 42.1% | 31.3% | -24.3% |

## Calibration

Each MOD's stated chance against what hit, in bins of its chance.

| MOD | Chance bin | Graded | Mean MOD chance | Hit rate | Mean book chance |
|---|---|---|---|---|---|
| MOD0 | 0 to 10% | 76 | 7.4% | 10.5% | 6.7% |
| MOD0 | 10 to 20% | 145 | 14.3% | 7.6% | 12.9% |
| MOD0 | 20 to 30% | 84 | 24.3% | 20.2% | 22.4% |
| MOD0 | 30 to 40% | 26 | 34.0% | 23.1% | 31.9% |
| MOD0 | 40 to 50% | 5 | 42.3% | 40.0% | 40.8% |
| MOD0 | 50 to 60% | 2 | 54.9% | 50.0% | 54.1% |
| MOD1q | 60 to 70% | 206 | 64.7% | 21.8% | 30.1% |
| MOD1q | 70 to 80% | 22 | 74.4% | 22.7% | 32.5% |
| MOD1q | 80 to 100% | 29 | 90.0% | 34.5% | 33.0% |
| MOD1 | 60 to 70% | 206 | 64.7% | 21.8% | 30.1% |
| MOD1 | 70 to 80% | 21 | 74.3% | 23.8% | 32.3% |
| MOD1 | 80 to 100% | 29 | 90.0% | 34.5% | 33.0% |
| MOD2 | 20 to 30% | 297 | 26.4% | 21.9% | 23.3% |
| MOD2 | 30 to 40% | 357 | 34.8% | 22.7% | 29.8% |
| MOD2 | 40 to 50% | 198 | 44.2% | 28.3% | 33.5% |
| MOD2 | 50 to 60% | 58 | 52.8% | 24.1% | 36.7% |
| MOD2 | 60 to 70% | 4 | 63.6% | 75.0% | 37.6% |
| MOD3 | 20 to 30% | 297 | 26.4% | 21.9% | 23.3% |
| MOD3 | 30 to 40% | 357 | 34.8% | 22.7% | 29.8% |
| MOD3 | 40 to 50% | 198 | 44.2% | 28.3% | 33.5% |
| MOD3 | 50 to 60% | 58 | 52.8% | 24.1% | 36.7% |
| MOD3 | 60 to 70% | 4 | 63.6% | 75.0% | 37.6% |

## Run it

```sh
packages/ingest/node_modules/.bin/tsx ops/backtest/plan.ts        # plan.json from nflverse games.csv
node ops/backtest/fetch-odds.mjs --dry                               # credit estimate
ODDS_API_KEY_HISTORICAL=... node ops/backtest/fetch-odds.mjs        # buys only what the cache lacks
packages/ingest/node_modules/.bin/tsx ops/backtest/replay.ts      # MOD0, MOD1q, MOD2 ledgers and results.json
packages/ingest/node_modules/.bin/tsx ops/backtest/capsules.ts    # Saturday capsules for screened players
# the capsule-reader subagent writes experiments/backtest/reads/WK{n}.json, one per week
packages/ingest/node_modules/.bin/tsx ops/backtest/apply-reads.ts # MOD1 and MOD3 ledgers, this README
```

To test a new MOD without spending credits, add it to `replay.ts` and set `experiments/backtest/run.json` to `{ "mode": "replay" }` on a `data/backtest-*` branch. The run reuses the cached odds and fails rather than buy if the cache is gone. Each run also archives the cache to the private backup repository and restores from it when GitHub expires its own cache.

nflverse files go in `experiments/backtest/cache/nflverse/` (games, roster_2026, roster_weekly_2026, depth_charts_2026, stats_player_week_2026, play_by_play_2026.csv.gz, snap_counts_2026, injuries_2026), from the nflverse-data releases.
