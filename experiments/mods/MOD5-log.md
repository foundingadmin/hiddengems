# MOD5 tailoring log

One line per run, written before the run. The harness adds the result under it. Weeks 2 to 6 only, 15 runs at most.

- Run 1 · Baseline. Half-life 2 games, matchup and script weights 0.5, snap trend 0.5, 10 point edge, prices 1.50 to 5.00, all ten markets.
  - Result · gems 604 (120.8 a week, 22% main) · hits 199 vs 204 expected of 598 graded · z -0.44 · ROI -2.0% · raw CLV 1.24% · overlap MOD4 18%
- Run 2 · Too many gems (121 a week, mostly long alt rungs). Edge floor to 18 points, prices capped at 3.50, and 2 games minimum so Week 3 can pick.
  - Result · gems 462 (92.4 a week, 19% main) · hits 166 vs 172 expected of 456 graded · z -0.59 · ROI -3.5% · raw CLV 2.19% · overlap MOD4 26%, MOD6 5%
- Run 3 · Edges still huge on hundreds of bets, a sign the normal curve overstates overs (yards are right skewed, books hang the median). Switch counts and yards to a lognormal with the same mean and spread.
  - Result · gems 299 (59.8 a week, 41% main) · hits 138 vs 137.8 expected of 296 graded · z 0.03 · ROI -0.9% · raw CLV 2.22% · overlap MOD4 26%, MOD6 2%
- Run 4 · Hits match the book on 18 point claimed edges, so the chances are overconfident (small samples, winner's curse). Blend 2 games of the position's per-snap rate at the player's snap share into his average, and widen the spread by the uncertainty of that average.
  - Result · gems 204 (40.8 a week, 70% main) · hits 109 vs 103.6 expected of 201 graded · z 0.78 · ROI 3.7% · raw CLV 1.00% · overlap MOD4 21%, MOD6 0%
- Run 5 · Still 41 a week. One bet per player (his best edge, so a receiver is not backed on catches and yards at once) and a 30 point edge floor, sized with the count-only mode to about 15 a week.
  - Result · gems 70 (14 a week, 77% main) · hits 35 vs 35.4 expected of 68 graded · z -0.1 · ROI -2.6% · raw CLV -0.04% · overlap MOD4 11%, MOD6 0%
- Run 6 · Found why the edges were fake: games with snaps but no stat row were missing (averages inflated), and the curve put no weight on blanks. Now snap-only games count as zeros, the chance of any output is priced apart from the curve, 4 games of each player's 2025 average are blended in, and QB rushing is skipped (kneels pile up at zero). Edge floor 25 points, about 10 a week by count.
  - Result · gems 50 (10 a week, 36% main) · hits 17 vs 20.7 expected of 48 graded · z -1.12 · ROI -21.1% · raw CLV 2.14% · overlap MOD4 0%, MOD6 0%
- Run 7 · Run 6 backed players whose lines had dropped for reasons the logs cannot see. Pass on anyone on the injury report (game status or limited or missed practice) and on passing and receiving stats when the starting QB is Out or Doubtful. Edge floor 20 points (about 16 a week by count, Weeks 3 to 6).
  - Result · gems 78 (15.6 a week, 49% main) · hits 34 vs 36.4 expected of 77 graded · z -0.55 · ROI -10.5% · raw CLV 1.13% · overlap MOD4 5%, MOD6 0%
- Run 8 · A check with no outcomes showed the model's average chance on book main lines is near even (no upward bias), so the big edges are model noise in the tails. The snap-share prior inflated fringe players, so it goes (shrink 0); keep 4 games of 2025, require a 2025 season or 4 games this year, main lines only, edge floor 22 points (about 11 a week by count).
  - Result · gems 36 (7.2 a week, 100% main) · hits 16 vs 17.7 expected of 35 graded · z -0.57 · ROI -9.9% · raw CLV 1.55% · overlap MOD4 0%, MOD6 0%
  - Note · The card ran at a 26 point floor, not 22 as written above: the last count-only check left it there. Kept as run, not rerun.
