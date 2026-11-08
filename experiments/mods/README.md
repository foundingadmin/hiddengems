# MOD trials

Each MOD is a fixed rule set that turns a board into gems. Its card (`MOD0.md` to `MOD3.md`) holds every rule
needed to reproduce its gems, so any session gets the same picks from the same board. Any rule change makes a new
MOD with its own card. Retired rules are never reused without a new hypothesis.

| MOD | Status | Parent | One line |
| --- | --- | --- | --- |
| [MOD0](MOD0.md) | retired | none | App rules Nov 2 to Nov 6 2026, back trial baseline |
| [MOD1](MOD1.md) | trial | none | Week 8 pilot, Outlier hit rate screen plus a read |
| [MOD2](MOD2.md) | trial | MOD0 | App as shipped Nov 7 2026, no read |
| [MOD3](MOD3.md) | trial | MOD2 | MOD2 plus MOD1's read |

## Shared definitions

1. **Segment.** Sunday kickoffs only, by Mountain time. WK9AM is every game kicking off before 12:00 PM, WK9PM
   every game from 12:00 PM to 5:59 PM, WK9SNF the Sunday night game. Thursday, Saturday and Monday games are
   outside every segment (WK9MNF excluded).
2. **Run.** One MOD on one segment, named `MOD2·WK9AM`. Its picks are every gem the MOD calls on the segment's
   games. Every gem is a pick; the wager tier only decides which picks carry money.
3. **Lock.** The price a pick is graded against. App MODs (MOD0, MOD2, MOD3) lock at the app's decision snapshot
   (`decisionSnapshot()` in `packages/core/src/snapshots.ts`, Sunday 8:43 AM for Sunday games) and all three read
   the same pull. MOD1 locks at the DraftKings price Outlier shows at screen time, which must fall after that pull
   and before the segment's first kickoff. Record the lock time on every run.
4. **Close.** The last DraftKings price before the prop's kickoff, from the app's kickoff freeze.
5. **Same prop.** Same player, same market, same side, same line. Shared picks match on this key only.
6. **Hit.** Graded from the box score. A player who does not play is a void and leaves the run (DraftKings voids
   the bet too).

## Grading rule

A run passes when its hits exceed book-expected hits.

- **Book-expected hits** = the sum of 1 / lock price over the run's picks. The price keeps the book's cut, so this
  bar sits slightly above a fair coin and passing it means beating the book, not just matching it.
- **Supporting stats**, reported on every run and never part of pass or fail:
  - flat $10 ROI, every pick a $10 single at its lock price, profit over stake;
  - average CLV (closing line value) on anytime TD picks, `lock price / close fair price - 1`, with the fair price
    from `fairChance()` in `packages/core/src/gems.ts`. Ladders are left out until the close is pulled for them.
- A run with no picks is recorded as empty, neither pass nor fail.

## Trials and verdicts

1. A **trial** is one week of a MOD: its WK AM, PM and SNF runs pooled. The trial passes when the week's pooled
   hits exceed its pooled book-expected hits. An empty week does not count as a trial.
2. A **live trial** is graded on a week played after the card was written. A **back trial** replays a past week
   from the saved board, blind to results. Verdicts count live trials only; back trials are reported beside them.
3. The **verdict** comes after 3 live trials.
   - 3 of 3 passed: promoted.
   - 2 of 3 passed: held, run 3 more.
   - 1 or fewer: retired, card status set to retired and never reused without a new hypothesis.

## Outcome map

Read after each verdict, MODs compared on the same weeks.

| Result | Next step |
| --- | --- |
| MOD3 beats MOD2 | The read earns a place in the app |
| MOD2 matches or beats MOD3 | The read adds nothing, skip building it |
| MOD1 passes, MOD2 fails | The hit rate screen is the signal, rebuild around it |
| All fail | Rerun unchanged next week |
| All pass | Rerun all to grow the sample |

"Beats" means more trials passed; on a tie, the larger pooled hits minus book-expected hits.

## Wager tiers

Chosen per segment before its lock. Grading ignores the tier.

1. **Real.** Josh's usual rules on one named MOD's picks. Decimal 2.50 or more, $10 to $20 singles, $5 to $15
   parlays of up to 3 legs from different games.
2. **Partial.** $10 singles only, on picks two or more MODs share (same prop).
3. **Dry.** Record only, no money. Every pick without a bet is a dry pick.

## Unratified terms

Coined here, pending the lexicon session. **Screen** (the filter that makes candidates), **band** (the rule that
maps a candidate to GEM1 to GEM5), **shared pick** (a pick two or more MODs called on the same prop), **lock time**,
**void**.
