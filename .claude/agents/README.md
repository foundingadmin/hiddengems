# Hidden Gems agents

The agents that build, check and maintain Hidden Gems, working as one corpus. Each agent's file is its
directive. `MANIFEST.json` lists them with versions, and `corpus/` holds the rules they share. Corpus version 1.0,
updated 2026-11-03.

## Who decides
- **The principal: Titus, owner of Hidden Gems.** Makes every key and critical judgement (product meaning, the
  model, money and credits, data that cannot come back, access and secrets, brand and house rules, the corpus
  itself, anything public or irreversible). The full list, the standing delegations and the escalation format are
  in `corpus/principal.md`. Decisions are recorded in `corpus/decisions.md` and bind every agent.
- **The vice principal** (`vice-principal.md`). The vice principal's standing role: the Claude session the principal
  talks to. It owns the perpetual `staging` branch and its preview, runs the lanes, merges verified task PRs into
  `staging`, presents releases, and escalates. It never merges to `main`.
- **Agents.** Do their directive, state assumptions, and escalate a key or critical judgement instead of making it.

## How they work together
```
 principal request ─┐
 preview comments ──┴─▶ preview-triager ─▶ lane tasks (fix/ screens/ data/ ds/ copy/ agents/)
                                                   │
                     ┌─────────────────────────────┼──────────────────────────┐
                     ▼                             ▼                          ▼
               screen-builder                 data-builder               facet-builder ◀── DS requests
                     │                             │                          │            from any builder
                     └──────────────┬──────────────┴──────────────────────────┘
                                    ▼
          verifiers (read only, by lane): content · design · data safety · model
                                    │ exact fixes go back to the builder that owns the branch
                                    ▼
                         pr-verifier ─▶ Merge: ready ─▶ vice principal merges into staging
                                    │
                                    ▼
      staging preview ─▶ release PR (staging to main) ─▶ principal reviews the preview and merges to main
                                    │
                                    ▼
          preview-triager resolves threads · main flows back into staging · repo-hygiene tidies
```

## Order of work
1. **Intake.** A principal request, or `preview-triager` reading Vercel toolbar comments. Every comment becomes a
   tracked task with a lane, a branch name (`<lane>/<slug>`) and a brief. Product decisions go to the principal.
2. **Build.** One builder per task on its own branch from the latest `staging`; its PR targets `staging`. Missing Facet parts become DS
   requests. When several builders need parts at once, they are batched into one `ds/` branch that merges first.
3. **Verify.** The lane's verifiers run (table below). Their fixes go back to the builder that owns the branch: the
   same agent while it is still running, otherwise a new builder.
4. **Gate.** `pr-verifier` checks merge state, CI, house rules, verdicts and owner steps, and returns
   `Merge: ready` or a fix list.
5. **Merge to staging.** The vice principal merges in an order that keeps shared files (shell, `app.css`, Facet CSS)
   conflict free, then tells open branches to update from `staging`.
6. **Release.** The vice principal opens a release PR from `staging` to `main` with the staging preview, what
   changed and any owner steps. The principal reviews the preview and merges to `main`; `main` then flows back into
   `staging`.
7. **Close.** Preview threads are resolved silently. `repo-hygiene` tidies after a batch of merges.
8. **Learn.** Lessons go to `corpus/lessons.md`. The vice principal proposes adoption as amendments
   (`corpus/amendments.md`); a change that touches a key or critical judgement needs the principal.

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

Verifiers are read only. Builders never push to another agent's branch. No agent approves its own work.

## Changing the corpus
- **Lessons** (`corpus/lessons.md`): any agent adds what it learned, with evidence and the directives it would help.
- **Amendments** (`corpus/amendments.md`): the vice principal turns lessons or principal requests into directive
  changes on an `agents/` branch, bumps the version in the agent's file, `MANIFEST.json` and this table, and logs
  it.
- **Escalations** (`corpus/principal.md`): one-read format, decided by the principal, recorded in
  `corpus/decisions.md`.
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
