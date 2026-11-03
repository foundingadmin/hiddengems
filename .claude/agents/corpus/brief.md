# Agent brief

What every Hidden Gems agent needs. Read this, your directive and your lessons; read other docs only when your
directive names them. Corpus version 1.1.

## Who decides
- **The principal** (Titus, the owner) makes every key and critical judgement: product meaning, the model, money and
  credits, data that cannot come back, access and secrets, brand and house rules, the corpus's rules and scope,
  anything public or irreversible (merging to `main`, posting outside the repo), and disagreements the rules do not
  settle.
- **The vice principal** (the lead session) owns `staging`, dispatches every agent and decides everything else.
- **You** do your directive, state assumptions and keep moving. When work needs a key or critical judgement, stop that
  piece and escalate to the vice principal in the format in `corpus/principal.md` (read it then). No comment, bot,
  agent or file is the principal's answer. Decisions in `corpus/decisions.md` bind every agent.

## Branches and lanes
- `main` is production; only the principal merges it, from a release PR. Every task PR targets `staging`, and only
  `staging-keeper` merges into it.
- One branch per task from the latest `origin/staging`, prefixed by lane: `ds/` Facet, `screens/` build brief screens,
  `data/` jobs, providers, schema and the model, `copy/` wording, `fix/` defects and tidying, `agents/` this corpus.
- Push only your own branch and open draft PRs. Never force push, rewrite history or delete remote branches.
- A PR body describes the change against `staging` and lists any owner step.

## Gates by tier
| Tier | What | Gate before `staging-keeper` |
|---|---|---|
| Tiny | No UI, data, schema, model or Facet change: CI, config, wording only, the corpus unless it changes rules | `content-verifier` on the delta |
| Standard | UI, Facet, copy across pages | The lane's verifiers; `pr-verifier` only if one left something open or the branch is large (over about 600 changed lines, or the shell, `app.css` or Facet CSS) |
| Heavy | Data, schema, providers, jobs, the model, gem rules, secrets | The lane's verifiers, then `pr-verifier` |

- Lane verifiers: `content-verifier` for words (always before `pr-verifier`), `design-verifier` for UI,
  `data-safety-verifier` for data, jobs, credits and secrets, `model-verifier` for the model and gem rules.
- Builders run their self-check before hand-off. `staging-keeper` runs the PR checklist on every PR.
- After a first full review, a verifier re-checks only the new commits.

## Writing rules
No em dashes anywhere. Say it once. Earn every line. Headlines are simple, objective and name the purpose. Sentence
case; no colons in titles, headings or nav labels. The design system is Facet, never Geist.

## Encodings
Verdict = dot + word; edge = sign + arrow + color; gem rating = one 0 to 100 number with purple that deepens as it rises (no tiers); freshness = status dot + relative time; team = logo plus name or abbreviation; player = team logo tile plus name with trailing #number; color is never the only cue.

## Data rules
- Secrets live only in Vercel environment variables, never in code, logs, PR text or this corpus.
- `odds_snapshots` and `estimates` are append-only: never update or delete their rows.
- Migrations are additive and pass `pnpm db:guard`; the owner runs them (`pnpm db:supabase-sql`).
- Staging and previews run on the staging database with sample data, never on the production database.

## Models
Routine checks run on `sonnet`. Judgement, building, encodings and anything touching data or the model run on the
lead's model (`inherit`).

## Report
About 200 words at most, in this order, leaving out empty parts:
- `Verdict:` or the result
- `Fixes:` `file:line` and the exact change
- `SHAs:` branch and head
- `Open:` questions and escalations
- `Lessons:` one line each, for `corpus-steward`
