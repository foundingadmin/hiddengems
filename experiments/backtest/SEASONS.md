# 2025 season odds buy

Approved by Josh, Sun Nov 8 2026 3:51 AM MT. Odds only, no MOD built or run.

## Spend

- 54,867 credits against a 58,000 cap. Probe 81, first pass 51,172, second pass 3,614 (2026 Weeks 2 to 8 board event lists and their early snapshots).
- The plan went from 67,153 to 12,286 left, read from the response headers. The 6,000 floor for live capsules was never approached.
- The dry run's upper bound was 56,663. Calls cost 10 per market returned, so missing markets cost nothing.

## What was bought

- Priority 1. 2025 Weeks 1 to 18, all 272 games, board and close, 8 keys (rush, receiving, passing, rush plus receiving yards, main and alt).
- Priority 2. 2026 Week 1, all 16 games, the same keys. With the earlier history buy this makes 2025 Week 1 to 2026 Week 8 unbroken for these keys.
- Priority 3. Early snapshot 3 days before each board, the 4 main keys, all 121 games of 2025 Weeks 1 to 8 and all 121 of 2026 Weeks 1 to 8. Complete.
- Spreads and totals at every board. Boards follow one rule. Sunday and Monday games use the Saturday 7:47 PM Mountain board, every other game 7:47 PM Mountain the night before its game day. Close is kickoff minus 20 minutes.

## DraftKings coverage

- 2025 board. Every key on 257 to 269 of 272 games. The gaps are Weeks 17 and 18 (resting starters).
- 2026 Weeks 1 to 8 board and close. Every key on all 121 games.
- Early snapshots are thin in 2025 (rush plus receiving yards on 29 of 121 games, Week 5 at 11 of 56 key slots), because DraftKings posted most yardage props later in the week. 2026 early covers 82 to 111 of 121 games per key.
- Thin alt ladders (under 40% of the key's season median) on 11 boards in 2025 and 6 in 2026, listed in each season's CATALOG.md.

## Where it lives

- `foundingadmin/hiddengems-backups`, `capsules/<season>/wkNN/{early,sat,close}/odds/<gameId>.json.gz`, with board event lists and game lines under `sat/odds-lists`, a `catalog.json` per week and `CATALOG.md` per season.
- nflverse 2024 and 2025 files (box scores, weekly stats, snap counts, rosters, depth charts, injury reports, schedules, play by play) under `nflverse/<season>/`, with a manifest giving each file's source, sha256 and stamp rule.
- `ops/backtest/season-capsules.ts import <backups clone>` restores the odds to the local cache at 0 credits (round trip checked file by file).
