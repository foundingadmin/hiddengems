# Grading

Grades every finished anytime TD prop. Runs Tuesday 5:37 AM.

1. Load the pipeline (`_shared.md`).
2. `python3 hgs.py autograde picks.json`. It downloads nflverse play by play and snap counts from GitHub and marks each prop Hit (scored a touchdown in that game), Miss, or Void (did not play). It prints any game nflverse has not posted yet, or whose snap counts are pending.
3. For any game reported missing, and only for props left ungraded: use `fetch_sports_data` (league nfl, scores, then game_stats) to find who scored a rushing, receiving or return touchdown (passing touchdowns do not count). Write `results.json` as `{"<group>": 1 or 0 or null for inactive}` using each row's `group` field and run `python3 hgs.py grade results.json picks.json`. If a game is not final, leave it for next week's run.
4. Save the pipeline.
5. Final message Josh can judge in under a minute: props graded; hit rate by carat tier (30+, 15 to 29, 5 to 14, under 5, Fool's Gold under 0) each against the book's implied rate and our expected rate; flat $10 profit on gems of 5 carats and up; average closing line value; our forecast error against the book's on every graded prop; one honest sentence on whether the bigger stones beat the book by more. Short, scannable, no dashes.
