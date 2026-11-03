# Token track record

Token counts the harness reported, so each session can be compared with the last. `repo-hygiene` adds a Session log
row at the end of every session.

## Session log
| Date | Shipped | Lead | Agents | Session total | Change |
|---|---|---|---|---|---|

## Corpus 1.1 baseline
Real runs from the 2026-11-03 session, before and after corpus 1.1 (PR #26). "Measured" is the token count the
harness reported for each agent. "Projected" is the estimate under the 1.1 rules.

### Per run
| Run | Before 1.1 (measured) | After 1.1 (projected) | Change | Why |
|---|---|---|---|---|
| #23, one-line CI change | 295k: pr-verifier 97k, content-verifier 93k, staging-keeper 105k | 60k: content-verifier 35k, staging-keeper 25k | -80% | Tiny tier drops pr-verifier; brief replaces the cold-start reading; both on Sonnet |
| #24, Facet batch 2 (1,000 lines, 3 fix rounds) | 966k: facet-builder 442k, design-verifier 233k, content-verifier 178k, pr-verifier 103k, staging-keeper 10k | 640k: facet-builder 360k, design-verifier 185k, content-verifier 40k, pr-verifier 30k, staging-keeper 25k | -34% | Builder self-check cuts a fix round; delta re-checks; content and PR checks on Sonnet with the brief |
| #25, release PR and sync | 154k: release-manager 131k, then 23k on Sonnet | 50k | -68% | Sonnet plus the brief |
| Lead session | Ran out of context after about 60 GitHub events from task PRs | Release PR events only, fresh session per release | Several times longer | Task PRs tracked through agent reports |

### First measured runs under 1.1
| Run | Agent | Before (comparable job) | After (measured) |
|---|---|---|---|
| #26 | content-verifier, Sonnet | 93k (#23) | 37k |
| #26 | pr-verifier, Sonnet | 97k (#23) | 31k |
| Release 2026-11-03 sync | release-manager, Sonnet | 131k (#25, default model) | 23k |

### Whole session
About 1.5M agent tokens shipped #23, #24 and #25. The same work under 1.1 projects to about 0.75M, roughly half.
