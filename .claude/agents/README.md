# Hidden Gems agents

The agents that build, check and maintain Hidden Gems. Corpus version 1.0, updated 2026-11-03.

## Who decides
- **The principal: Titus, owner of Hidden Gems.** Makes every key and critical judgement (product meaning, the
  model, money and credits, data that cannot come back, access and secrets, brand and house rules, the corpus
  itself, anything public or irreversible). The full list, the standing delegations and the escalation format are
  in `corpus/principal.md`. Decisions are recorded in `corpus/decisions.md` and bind every agent.
- **The vice principal** (`vice-principal.md`): the Claude session the principal talks to. It owns the perpetual `staging` branch and its preview, runs the lanes, merges verified task PRs into
  `staging`, presents releases, and escalates. It never merges to `main`.
- **Agents.** Do their directive, state assumptions, and escalate a key or critical judgement instead of making it.

## Order of work
One run builds one release:
1. **Review.** The principal reviews the single staging preview and leaves comments there (Vercel toolbar), or asks
   in the session.
2. **Intake.** `preview-triager` turns every comment into a tracked task with a lane, a branch name
   (`<lane>/<slug>`) and a brief. Key and critical judgements go to the principal.
3. **Build.** One builder per task, on its own branch from the latest `staging`, with a PR targeting `staging`. Missing
   Facet parts become DS requests; when several builders need parts at once, they are batched into one `ds/` branch
   that merges first.
4. **Verify.** The lane's verifiers run (table below). Their fixes go back to the builder that owns the branch: the
   same agent while it is still running, otherwise a new builder.
5. **Merge to staging.** `pr-verifier` gives the verdict; on `Merge: ready` with CI green the vice principal merges at
   once, in an order that keeps shared files (shell, `app.css`, Facet CSS) conflict free, and tells open branches to
   update from `staging`. Preview threads are resolved silently as their fixes land.
6. **Release.** When the run's tasks are in, the vice principal opens a release PR from `staging` to `main` and tells
   the principal the staging preview is ready for a full front end review.
7. **Ratify.** The principal merges the release to `main`. That merge ratifies every task, verdict and decision in
   it. `main` then flows back into `staging`.
8. **Learn.** After ratification the vice principal runs a retrospective: it adds the run's lessons, drafts
   amendments to the directives that would benefit, records decisions, and brings any rule or scope change to the
   principal before it applies. `repo-hygiene` tidies. The next run starts from the enriched corpus.

| Lane | Builder | Verifiers before merge |
|---|---|---|
| `fix/` preview comments, small defects | the vice principal or any builder | content, design (if UI), PR |
| `screens/` build brief screens | `screen-builder` | content, design, PR |
| `ds/` Facet parts | `facet-builder` | design, content (docs), PR |
| `data/` jobs, providers, schema, Data health | `data-builder` | data safety, content and design (if UI), PR |
| `copy/` wording | any builder | content, PR |
| model and gem rules (`packages/core`) | `data-builder` | model, data safety, PR |
| `agents/` this corpus | the vice principal | content, PR; the principal for key changes |

## Agents
| Agent | Kind | Version | Updated | Job |
|---|---|---|---|---|
| `vice-principal` | lead | 1.0 | 2026-11-03 | Owns staging and its preview, runs the lanes, presents releases |
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
- **Lessons** (`corpus/lessons.md`): any agent adds what it learned, with evidence and the directives it would help.
- **Amendments** (`corpus/amendments.md`): the vice principal turns lessons or principal requests into directive
  changes on an `agents/` branch, bumps the version in the agent's file, `MANIFEST.json` and this table, and logs
  it.
- **Escalations** (`corpus/principal.md`): an agent escalates to the vice principal, who asks the principal in the
  session in the one-read format and records the answer in `corpus/decisions.md`.
- Every directive begins with its version line. `repo-hygiene` checks that files, manifest and this table agree.

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
