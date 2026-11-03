# Hidden Gems agents

The agents that build, check and maintain Hidden Gems. Corpus version 1.0, updated 2026-11-03.

## Who decides
- **The principal: Titus, owner of Hidden Gems.** Makes every key and critical judgement (product meaning, the
  model, money and credits, data that cannot come back, access and secrets, brand and house rules, the corpus
  itself, anything public or irreversible). The full list, the standing delegations and the escalation format are
  in `corpus/principal.md`. Decisions are recorded in `corpus/decisions.md` and bind every agent.
- **The vice principal** (`vice-principal.md`): the Claude session the principal talks to. It owns the perpetual
  `staging` branch and its preview, dispatches every step below to the agent that owns it, makes the calls that are
  not the principal's, and escalates the ones that are. It never merges to `main`.
- **Agents.** Do their directive, state assumptions, and escalate a key or critical judgement instead of making it.

## Order of work
One run builds one release. Every step has an owner; the vice principal dispatches them in order.

| Step | Owner | Standard operations |
|---|---|---|
| 1. Review | the principal | Reviews the single staging preview and comments there, or asks in the session |
| 2. Intake | `preview-triager` | Every comment becomes a lane task with a branch name and a brief; key judgements go to the principal |
| 3. Build | `screen-builder`, `data-builder`, `facet-builder` | One task per branch from `staging`, PR into `staging`; DS requests batched into one `ds/` branch that merges first |
| 4. Verify | the lane's verifiers (table below) | Exact fixes go back to the builder that owns the branch |
| 5. Merge to staging | `pr-verifier`, then `staging-keeper` | Verdict, then a merge on `Merge: ready` with CI green, in a conflict-free order; branches told to update |
| 6. Release | `release-manager` | Release PR from `staging` to `main` with the preview link, review routes, changes and owner steps |
| 7. Ratify | the principal | Merges the release to `main`; that merge ratifies the run. `release-manager` syncs `staging` |
| 8. Learn | `corpus-steward`, then `repo-hygiene` | Retrospective: lessons, decisions, minor amendments applied, major ones to the principal; then tidying |

| Lane | Builder | Verifiers before merge |
|---|---|---|
| `fix/` preview comments, small defects | the vice principal or any builder | content, design (if UI), PR |
| `screens/` build brief screens | `screen-builder` | content, design, PR |
| `ds/` Facet parts | `facet-builder` | design, content (docs), PR |
| `data/` jobs, providers, schema, Data health | `data-builder` | data safety, content and design (if UI), PR |
| `copy/` wording | any builder | content, PR |
| model and gem rules (`packages/core`) | `data-builder` | model, data safety, PR |
| `agents/` this corpus | `corpus-steward` or the vice principal | content, PR; the principal for rule or scope changes |

## Agents
| Agent | Kind | Version | Updated | Job |
|---|---|---|---|---|
| `vice-principal` | lead | 1.1 | 2026-11-03 | Owns staging, dispatches every step, makes the calls, escalates |
| `staging-keeper` | operations | 1.0 | 2026-11-03 | Merges verified PRs into staging, keeps it green |
| `release-manager` | operations | 1.0 | 2026-11-03 | Release PR for the principal's review; syncs staging after ratification |
| `corpus-steward` | operations | 1.0 | 2026-11-03 | Retrospective: lessons, decisions, amendments, versions |
| `preview-triager` | intake | 1.0 | 2026-11-03 | Vercel comments into lane tasks; resolves threads after merge |
| `screen-builder` | builder | 1.0 | 2026-11-03 | Build brief screens in Facet |
| `data-builder` | builder | 1.0 | 2026-11-03 | Jobs, providers, schema, model changes |
| `facet-builder` | builder | 1.0 | 2026-11-03 | DS requests built into Facet |
| `repo-hygiene` | maintainer | 1.0 | 2026-11-03 | Stale branches, dead code, doc and corpus drift |
| `content-verifier` | verifier | 1.0 | 2026-11-03 | Words against the house rules and Facet's content guide |
| `design-verifier` | verifier | 1.1 | 2026-11-03 | UI against Facet and the encodings, with screenshots |
| `data-safety-verifier` | verifier | 1.0 | 2026-11-03 | Migrations, history, backups, credits, secrets |
| `model-verifier` | verifier | 1.0 | 2026-11-03 | Model changes against Week 8, with the rating impact |
| `pr-verifier` | gate | 1.1 | 2026-11-03 | One PR end to end before merge |

Verifiers are read only. Builders never push to another agent's branch. No agent verifies its own work.

## Changing the corpus
- **Lessons** (`corpus/lessons.md`): builders and `corpus-steward` add what was learned, with evidence and the
  directives it would help; read-only agents report it under "Lessons".
- **Amendments** (`corpus/amendments.md`): `corpus-steward` turns lessons or principal requests into directive
  changes on an `agents/` branch, bumps versions in the agent's file, `MANIFEST.json` and the table above, and logs
  them. A change to a rule or scope waits for the principal.
- **Escalations** (`corpus/principal.md`): an agent escalates to the vice principal, who asks the principal in the
  session in the one-read format and records the answer in `corpus/decisions.md`.
- Every directive begins with its version line. `corpus-steward` and `repo-hygiene` check that files, manifest and
  the table above agree.

## Files
| Path | Holds |
|---|---|
| `*.md` (with frontmatter) | One directive per agent, loaded by Claude Code by name |
| `MANIFEST.json` | The corpus in machine-readable form: principal, documents, agents, versions |
| `corpus/principal.md` | The principal, key and critical judgements, standing delegations, escalation format |
| `corpus/decisions.md` | The principal's recorded decisions |
| `corpus/lessons.md` | Lessons waiting for adoption |
| `corpus/amendments.md` | How directives change, and the change log |
| `../../AGENTS.md` | House rules every agent and session follows |
