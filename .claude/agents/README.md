# Hidden Gems agents

The agents that build, check and maintain Hidden Gems. Corpus version 1.1, updated 2026-11-03.

This is the overview for people. Agents read `corpus/brief.md`, their own directive and their open lessons, plus the
docs their directive names.

## Who decides
- **The principal: Titus, owner of Hidden Gems.** Makes every key and critical judgement (product meaning, the
  model, money and credits, data that cannot come back, access and secrets, brand and house rules, the corpus
  itself, anything public or irreversible). The full list, the standing delegations and the escalation format are
  in `corpus/principal.md`. Decisions are recorded in `corpus/decisions.md` and bind every agent.
- **The vice principal** (`vice-principal.md`): the Claude session the principal talks to. It owns the perpetual
  `staging` branch and its preview, dispatches every step below to the agent that owns it, makes the calls that are
  not the principal's, and escalates the ones that are. It never merges.
- **Agents.** Do their directive, state assumptions, and escalate a key or critical judgement instead of making it.

## Order of work
One run builds one release. Every step has an owner; the vice principal dispatches them in order.

| Step | Owner | Standard operations |
|---|---|---|
| 1. Review | the principal | Reviews the single staging preview and comments there, or asks in the session |
| 2. Intake | `preview-triager` | Every comment becomes a lane task with a tier, a branch name and a brief |
| 3. Build | `screen-builder`, `data-builder`, `facet-builder` | One task per branch from `staging`, PR into `staging`, self-check before hand-off; DS requests batched into one `ds/` branch that merges first |
| 4. Verify | the gate for the task's tier (below) | Exact fixes go back to the builder that owns the branch; re-checks cover only the new commits |
| 5. Merge to staging | `staging-keeper` | PR checklist on every PR, then a merge with CI green, in a conflict-free order; branches told to update |
| 6. Release | `release-manager` | Release PR from `staging` to `main` with the preview link, review routes, changes and owner steps |
| 7. Ratify | the principal | Merges the release to `main`; that merge ratifies the run. `release-manager` syncs `staging` |
| 8. Learn | `corpus-steward` and `facet-curator`, then `repo-hygiene` | Retrospective: lessons, decisions, minor amendments applied, major ones to the principal; Facet's demo pages and changelog brought up to date; then tidying |

### Gates by tier
| Tier | What | Gate |
|---|---|---|
| Tiny | No UI, data, schema, model or Facet change: CI, config, wording only, the corpus unless it changes rules | `content-verifier` on the delta, then `staging-keeper`'s checklist |
| Standard | UI, Facet, copy across pages | The lane's verifiers, then `staging-keeper`; `pr-verifier` only when a verifier left something open or the branch is large (over about 600 changed lines, or the shell, `app.css` or Facet CSS) |
| Heavy | Data, schema, providers, jobs, the model, gem rules, secrets | The lane's verifiers, then `pr-verifier`, then `staging-keeper` |

`staging-keeper`'s checklist: merge state, CI green on the head, a house-rule grep on the diff, verdicts present,
owner steps.

| Lane | Builder | Lane verifiers | Usual tier |
|---|---|---|---|
| `fix/` preview comments, small defects | any builder, or `repo-hygiene` for tidying | content, design (if UI) | tiny or standard |
| `screens/` build brief screens | `screen-builder` | content, design | standard |
| `ds/` Facet parts | `facet-builder`; `facet-curator` (after a release) | design, content (docs) | standard |
| `data/` jobs, providers, schema, Data health | `data-builder` | data safety, content and design (if UI) | heavy |
| `copy/` wording | any builder | content | tiny or standard |
| model and gem rules (`packages/core`) | `data-builder` | model, data safety | heavy |
| `agents/` this corpus | `corpus-steward` or the vice principal | content; the principal for rule or scope changes | tiny |

## Agents
Routine checks run on `sonnet`; judgement, building, encodings and anything touching data or the model run on the
lead's model (`inherit`).

| Agent | Kind | Model | Version | Updated | Job |
|---|---|---|---|---|---|
| `vice-principal` | lead | inherit | 2.2 | 2026-11-03 | Owns staging, dispatches every step, makes the calls, escalates |
| `staging-keeper` | operations | sonnet | 2.0 | 2026-11-03 | PR checklist, merges into staging, keeps it green |
| `release-manager` | operations | sonnet | 1.1 | 2026-11-03 | Release PR for the principal's review; syncs staging after ratification |
| `corpus-steward` | operations | inherit | 1.1 | 2026-11-03 | Retrospective: lessons, decisions, amendments, versions |
| `facet-curator` | operations | sonnet | 1.2 | 2026-11-03 | Facet demo pages, changelog and version after each release |
| `preview-triager` | intake | sonnet | 1.1 | 2026-11-03 | Vercel comments into lane tasks; resolves threads after merge |
| `screen-builder` | builder | inherit | 1.2 | 2026-11-03 | Build brief screens in Facet |
| `data-builder` | builder | inherit | 1.2 | 2026-11-03 | Jobs, providers, schema, model changes |
| `facet-builder` | builder | inherit | 1.2 | 2026-11-03 | DS requests built into Facet |
| `repo-hygiene` | maintainer | sonnet | 2.1 | 2026-11-03 | Stale branches, dead code, doc and corpus drift, the token log |
| `content-verifier` | verifier | sonnet | 2.0 | 2026-11-03 | Words against the house rules and Facet's content guide |
| `design-verifier` | verifier | inherit | 2.1 | 2026-11-03 | UI against Facet and the encodings, with screenshots |
| `data-safety-verifier` | verifier | inherit | 2.0 | 2026-11-03 | Migrations, history, backups, credits, secrets |
| `model-verifier` | verifier | inherit | 2.0 | 2026-11-03 | Model changes against Week 8, with the rating impact |
| `pr-verifier` | gate | sonnet | 2.0 | 2026-11-03 | Full review of heavy-tier and escalated PRs |

Verifiers are read only. Builders never push to another agent's branch. No agent verifies its own work.

## Changing the corpus
- **Lessons** (`corpus/lessons.md`): agents report them one line each; `corpus-steward` records them with evidence
  and a `For:` line, and lists open ones per agent in `MANIFEST.json` (`lessons`).
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
| `MANIFEST.json` | The corpus in machine-readable form: principal, documents, agents, versions, open lessons |
| `corpus/brief.md` | What every agent reads first |
| `corpus/principal.md` | The principal, key and critical judgements, standing delegations, escalation format |
| `corpus/decisions.md` | The principal's recorded decisions |
| `corpus/lessons.md` | Lessons, with who they help and their status |
| `corpus/amendments.md` | How directives change, and the change log |
| `corpus/efficiency.md` | Token totals per session |
| `../../AGENTS.md` | House rules every agent and session follows |
