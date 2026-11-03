# Appraisal snapshot

Adds a price point to each prop's appraisal line between opening and kickoff. Runs Saturday 7:47 PM and Sunday 8:43 AM.

1. Clock and schedule (`_shared.md`).
2. Capture Outlier prices.
3. Keep lines whose game has not kicked off and kicks off within the next 4 days. Group by week into `snapW.txt`.
4. Load the pipeline.
5. For each week: `python3 hgs.py open snapW.txt picks.json WEEK NOW sched.json` (adds props not yet logged and refreshes reads not frozen yet, keeping the original opening price), then `python3 hgs.py snap snapW.txt picks.json WEEK NOW sched.json` (adds one price point per row, never changing a frozen read or the opening price).
6. Save the pipeline.
7. Final message, short: props snapshotted and the three biggest price moves since the opening line (player, game, opening price to now). No dashes.
