# Hidden Gems agents

One sprint turns the principal's comments on the staging preview into a live staging deploy. The principal comments
on staging, then types `go` in an open Claude session. That session runs `.claude/skills/sprint/SKILL.md`.

| Step | Who | What |
|---|---|---|
| Triage | the session | Reads every open toolbar thread and files `ops/sprint/sprints/<id>.json`: each entry routed (lane, file group, size) or parked |
| Park | the session | A line in `docs/ROADMAP.md` and a reply on each parked thread |
| Build | `builder`, one per file group, in parallel | Branch from staging, build data and UI together, checks, screenshots, push, trace |
| Merge | the session and `ops/sprint/merge.mjs` | One sprint branch, one CI run; `ci-fixer` only when checks fail |
| Verify | `verifier`, once per sprint | One punchlist for content, design, data safety and the model |
| Punchlist | the same builders, resumed | One new commit each; no second review |
| Ship | the session | One sprint PR into staging, threads resolved, the principal told |
| Release | the principal types `release` | The session opens the release PR to `main`; only the principal merges it |

| Agent | Model | Job |
|---|---|---|
| `builder` | lead model; Sonnet for size S | One entry, data and UI together, Facet parts in the same branch |
| `verifier` | lead model | One review of the whole sprint branch |
| `ci-fixer` | Sonnet | Fixes a failing check from the traces; never sends work back |

Rules for who decides: `corpus/principal.md`. Recorded decisions: `corpus/decisions.md`. Sprint files and scripts:
`ops/sprint/`. The previous corpus (1.1, fifteen agents) is in `docs/archive/agents-corpus-1.1/`.
