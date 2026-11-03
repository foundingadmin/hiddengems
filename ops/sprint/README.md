# Sprint files

The record of each sprint run by `.claude/skills/sprint/SKILL.md`.

| Path | Holds |
|---|---|
| `template.json` | The shape of a sprint file. Status runs `routed` or `parked`, then `building`, `ready`, `shipped`, or `dropped` with a reason. |
| `sprints/<id>.json` | One file per sprint: entries, their branches and status, and one `lesson` line on what went wrong. The next triage reads the last 5. Only the lead session edits it. |
| `traces/<entry-id>.md` | A builder's short trace of what it changed, for the CI fixer and the next sprint. |
| `merge.mjs` | Builds `sprint/<id>` from `origin/staging` and merges every ready branch; conflicts are dropped. `--drop <entry-id> --reason "..."` rebuilds it without a bad branch. |
| `scope.mjs` | Lists the review sections a sprint branch needs (words, design, data safety, model) from the paths it changes. |
| `lint-words.mjs` | The writing rules a script can check on a branch's added lines and commits: em dashes, colons in headings, sentence case in headings. CI runs it on every pull request. |
| `proper-nouns.txt` | Words that keep their capital in a sentence-case heading. |
