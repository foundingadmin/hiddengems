---
id: MOD1
parent: none
status: trial
created: 2026-11-01
hypothesis: Props that hit 60% or more this season, priced 2.50 or higher, kept only when a news read finds nothing against them, beat the book.
---

# MOD1 · week 8 pilot method

How the pilot picked on Sun Nov 1 2026 (8 bets, 5 hits). The original method, run in every trial.

## Rules

1. **Screen.** Outlier, saved template Season Trends: NFL, book DraftKings, decimal odds 2.50 or more, 2026 hit
   rate 60% or more. Every market Outlier lists, both sides. Run it once per segment, after the app's decision pull
   and before the segment's first kickoff.
2. **Candidates.** Every prop the screen returns on the segment's games, at the DraftKings price and 2026 hit rate
   Outlier shows. Nothing is added by hand.
3. **Band.** Each candidate gets a band from its 2026 hit rate (table below).
4. **Read.** Every candidate gets a read (protocol below). The read keeps it, drops it one band, or cuts it.
5. **Gem.** A candidate still at GEM1 or above after the read. Lock price is the Outlier DraftKings price at screen
   time.

## Gem bands

| Band | 2026 hit rate |
| --- | --- |
| GEM1 | 60% to 64% |
| GEM2 | 65% to 69% |
| GEM3 | 70% to 74% |
| GEM4 | 75% to 79% |
| GEM5 | 80% and up |

Hit rate is Outlier's figure, truncated to a whole percent.

## Read protocol

The only judgment call in any MOD. MOD3 uses this protocol unchanged.

1. **Window.** News published after the player's last game and before the read. Nothing published after the read
   counts, so a read can never use hindsight.
2. **Where to look.** The official injury report first, then team beat reporters and national outlets.
3. **Effect.** One per candidate, judged on whether the news changes his chance of reaching the line.
   - **Keep.** Nothing found, or nothing that touches his role.
   - **Downgrade.** Something costs him: Questionable, limited practice, a teammate returning to his role, a
     tougher game script, weather that hurts the market (wind over 15 mph for passing and receiving).
     A GEM1 downgraded is cut.
   - **Cut.** He is Out, Doubtful or not expected to play, announced role loss (benched, demoted, snap limit),
     or a starting QB change against the market.
   - A read never raises a band.
4. **Log.** Every read writes one row, keeps included.

| Field | Content |
| --- | --- |
| prop | Player, market, side, line |
| outlet | Name of the source, or `none found` |
| url | Link to the item, blank when none found |
| published | Publish time of the item, Mountain time |
| read at | Time of the read, Mountain time |
| effect | keep, downgrade or cut |
| why | One line |

Outlets are compared over time, so name the outlet that published the item, not the site that repeated it.

## Backtest

- The screen can be approximated from nflverse: 2026 hit rate through the prior week, priced from a saved
  DraftKings board. Markets nflverse cannot grade (defensive props and similar) drop out, so a back trial is a
  partial replay, labeled `MOD1 replay`.
- The read cannot be backtested. News lookups after the fact carry hindsight. Back trials report the screen and
  band only.

## Record

- WK8 pilot, Sun Nov 1 2026: 5 of 8 (clear reads 4 of 5, hazy or cloudy reads 1 of 3, which the pilot bet
  instead of downgrading or cutting).
