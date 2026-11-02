# Closing odds

Captures the last price before kickoff so closing line value can be measured. Runs Sunday 7:18 AM, 10:18 AM, 1:18 PM and 5:18 PM, and Monday and Thursday 6:03 PM.

1. Clock and schedule (`_shared.md`). If no game kicks off in the next 2 hours, finish with a one line message saying so and stop.
2. Capture Outlier prices.
3. Keep lines whose game kicks off within the next 2 hours. Group by week into `closeW.txt`. On a Monday also save lines for games more than 2 days out to `open_W.txt` by week, as next week's opening lines.
4. Load the pipeline.
5. For each week: `python3 hgs.py close closeW.txt picks.json WEEK NOW sched.json`. It sets the close price and line value on frozen rows and ignores games already kicked off, so live in game odds never enter. On a Monday, then: `python3 hgs.py open open_W.txt picks.json WEEK NOW sched.json`.
6. Save the pipeline.
7. Final message, short: games and props closed, how many moved our way, the three biggest moves toward our read, and on Mondays how many opening lines were logged for next week. No dashes.
