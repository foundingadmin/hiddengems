# The gauntlet

MOD7 starts blank at 2025 Week 1 holding ten seeds, each at 10% trust for every bet type, and walks forward one week
at a time to 2026 Week 8. Saturday it picks from the board, Monday it sees results, Tuesday it reweights its seeds.
The weights are the only thing that ever changes. The types every build codes against are in `contract.ts`.

## The ten seeds

| Seed | Reads | Its chance for the over | Silent when |
|---|---|---|---|
| Books disagree | Every other US book on the same line, cut removed | Their median chance | Fewer than 2 other books post it |
| Usage is destiny | Snaps, targets, carries, routes, recent games first, last season early | Its projection's chance to clear the line | No games on record |
| Next man up | Final injury report and depth chart | The backup's projection with the missing starter's recent volume added | No starter out or doubtful at his position |
| Game script | Spread and total on the board | The projection shifted by implied team points and run or pass lean | Never, for players with a projection |
| Matchup | Yards the opponent allowed his position recently, against league average | The projection scaled by that ratio | Fewer than 3 opponent games on record |
| Follow the move | The same line 3 days before the board | The fair chance carried on in the direction it moved | No early quote for that line |
| Ladder math | DraftKings' full alt ladder for the player | That rung's chance on one smooth curve fit through the ladder | Fewer than 3 rungs posted |
| Hot hand | Last 3 games against season average | The projection using the last 3 games | Fewer than 4 games on record |
| Cooling off | The same as hot hand | The projection using the season average when the last 3 ran above it | Fewer than 4 games on record |
| Hidden gems | Season fantasy points so far, last season early | Fair nudged down for the top 24 at his position, up for everyone else | No fantasy history |

Seeds hand over raw chances. Nothing in a seed is tuned on any week. Settings MOD4, MOD5 and MOD6 learned on 2026
Weeks 2 to 6 (edge floors, margins, shift sizes, the 9% alt cut) stay out. Fixes that make a seed read football
correctly stay in, like counting a game with snaps and no stat line as a zero.

## Each week

1. **Saturday, blend.** For each line, the MOD's chance is the weighted average of every seed's chance in log odds, with
   silent seeds standing in at DraftKings' fair chance. Weights come from the line's bet type.
2. **Saturday, pick.** Edge is the MOD's chance minus 1 / price, so the cut stays in. Keep lines with odds 1.50 to 5.00
   and positive edge, one per player, best edge first, up to 7. Picks are recorded before anything else happens.
3. **Monday, reveal.** Results and closing prices for every board line. Refunds (he did not play) are left out.
4. **Tuesday, reweight.** Each seed is scored on every graded board line it spoke on, per bet type: how much its chance
   beat DraftKings' fair chance on log loss. Seeds are ranked by score. The best moves up by `maxStep`, the worst down by
   `maxStep`, the rest in proportion. Silent seeds hold. Each set is renormalized to 1. A bet type's own weights then
   blend with the shared set by `lines / (lines + poolingLines)`, counting all its graded lines so far.

## Rules

`rules.json` holds the pick rule, learning speed, warm-up weeks and pass bars. It is frozen and hashed before the first
run, the way the MOD4 to MOD6 cards were. Warm-up weeks are picked and learned from but not graded: 2025 Weeks 1 to 8
and 2025 Week 18, when starters rested.

A pass needs all four: profit above the luck band (2 standard deviations of $1 flat betting at the gems' own odds),
a profit in both 2025 and 2026, more than half its gems beating the closing price, and its two heaviest seeds
earning at least half the profit.

## The loader

`world.ts` builds each week from the owned data in the private backup repository at 0 Odds API credits: the odds
capsules (board, close and the early snapshot 3 days before) and the stamped nflverse files for 2024 to 2026.

```
git clone https://github.com/foundingadmin/hiddengems-backups /tmp/backups   # private
BACKUPS_DIR=/tmp/backups packages/ingest/node_modules/.bin/tsx --test ops/gauntlet/world.test.ts
```

- Sunday and Monday games use the Saturday 7:47 PM Mountain board, every other game 7:47 PM Mountain the night before
  its game day. Each game's quotes come from its own board.
- Football data (box scores, snaps, injury reports, depth charts) stops at the week's first board. In a week with a
  Thursday game, every other team's latest final injury report is the previous week's.
- `fair` takes out DraftKings' own hold: both sides of a main line, the player's main line hold for a one-sided alt
  rung, else the median main line hold for that bet type on that board.
- An alt rung's `line` is its "60+" threshold (the book's 59.5 plus a half) and hits at or above it; a main line hits
  above its point. `overHits` in `world.ts` applies the rule.
- `reveal` refuses until `recordPicks` has written the week's picks to `experiments/gauntlet/ledger/<season>-wkNN-picks.json`.
  Picks are recorded once.

## Running it

`learner.ts` holds blend, pick, score, reweight and pool. `run.ts` walks the 26 weeks and `report.ts` writes the report.
Each seed is scored on the sum of its log loss gain over fair across the lines it spoke on, so a silent line counts 0,
exactly what the blend got from it. The run needs `world.ts` to export `openWeek`, `recordPicks` and `reveal`, and `seeds/index.ts` to
export the ten seeds as `SEEDS`.

Once the rules are frozen and hashed, the one real run is:

```bash
packages/ingest/node_modules/.bin/tsx ops/gauntlet/run.ts --hash <sha256 of the frozen rules.json>
```

It refuses unfrozen rules, a hash that does not match, and any hash that already has a folder in
`experiments/gauntlet/`, even from a run that stopped partway. Per week it writes `<season>-wNN-picks.json` before
reveal, then `<season>-wNN-results.json` with the results, the scores and the new weights, and at the end
`report.json`. The report can be rebuilt from the ledger with `tsx ops/gauntlet/report.ts <ledger folder>`.

## Freezing and running

The principal approves the run. The session that runs it then:

1. Restores the owned data and runs `world.test.ts` against it (every week opens, every wall holds).
2. Opens one 2025 week and one 2026 week without `reveal` and checks that each seed speaks on a sensible share of lines.
   Follow the move is expected to be mostly silent in 2025.
3. Sets `"frozen": true` in `rules.json`, commits it, and records `sha256sum ops/gauntlet/rules.json` under Runs below.
4. Runs `run.ts --hash <that sha256>` once, commits the ledger and `report.json`, and merges one pull request into `main`.
5. Fills the report in Figma from `report.json`, on a copy of the blank template. The template itself stays blank.

Any change to a seed, the rules or the learner after a run means a new run with a new hash, from 2025 Week 1.

## Figma

All in the Hidden Gems file, page "MOD7 experiment":

- [Seeds plate](https://www.figma.com/design/HBngz0dAGz4gy30QhPL8As/Hidden-Gems?node-id=57-2): the ten seeds and the frozen rules.
- [Blank report](https://www.figma.com/design/HBngz0dAGz4gy30QhPL8As/Hidden-Gems?node-id=57-175): the template each run fills on its own copy.
- [Example report](https://www.figma.com/design/HBngz0dAGz4gy30QhPL8As/Hidden-Gems?node-id=51-20): made-up numbers, for layout only.

## Adding a seed

A new seed starts from a football reason written down before any run, never from a MOD's losses. It gets one rerun of
the whole gauntlet from 2025 Week 1 with every seed at an equal start, compared week for week with the last run. It
joins live only if all three hold: its weight grows in the bet types it targets, the run beats the last one on money
and on beating the close, and the gain shows in both seasons. It joins at the weights it earned in that run.

## Runs

| Run | Rules sha256 | Date | Verdict |
|---|---|---|---|
