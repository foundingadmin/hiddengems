# Freeze

Freezes today's anytime TD props so the read is fixed before kickoff. Runs Thursday 9:41 AM for the Thursday night game and Sunday 6:41 AM for Sunday's games.

1. Clock and schedule (`_shared.md`).
2. Capture Outlier prices.
3. Keep lines whose game kicks off within the next 36 hours: today's freeze. Group them by week into `rawW.txt`. Lines for later games go to `open_W.txt` by week as opening lines.
4. Load the pipeline.
5. For each week: `python3 hgs.py freeze rawW.txt picks.json WEEK NOW sched.json`. Then for later games: `python3 hgs.py open open_W.txt picks.json WEEK NOW sched.json`. The script skips games that already kicked off, never refreezes a frozen or graded row, and stamps kickoff date and time on each row.
6. Save the pipeline.
7. Final message, short: games and props frozen, then the top 5 by carat with player, game, kickoff, odds, our % vs book %, clarity. Plain language, no dashes.
