# Agent instructions for this repository

These apply to any AI coding session (Claude Code, Cursor, v0, etc.) working here.

## The repo is the source of truth

- This repository is the only source of truth for Hidden Gems: product (`docs/prd.md`), build briefs,
  wireframes, design system, model, pipeline code and scheduled task directives. Start every task from
  the latest `staging` (`main` is production). Never work from a copy kept by an earlier session, a claude.ai artifact or memory.
- Do not create, publish, update or consult claude.ai artifacts for this project (design systems,
  canvases, dashboards, labs, docs). Anything worth keeping is a file here, changed by pull request. If
  something you need lives only outside the repo, bring it in first, then work from the repo copy.
- Superseded artifacts are archived in `docs/archive/` as they were; they are history, not specs.
- Secrets live only in Vercel environment variables (`ODDS_API_KEY`, `DATABASE_URL`, `CRON_SECRET`,
  `APP_PASSWORD`, `ANTHROPIC_API_KEY`, `BACKUP_GITHUB_TOKEN`), never in the repo, an artifact or a scheduled task.
- The database is protected by design (`docs/architecture.md`, "Database"): the app connects as `hiddengems_app`,
  which cannot alter or drop anything; history tables reject edits; `pnpm db:guard` blocks destructive
  migrations. Never work around these. Schema changes reach Supabase through `pnpm db:supabase-sql`, run by the owner.
- The old pipeline (claude.ai dashboard store and its scheduled tasks) retired on Nov 3 2026. Its code is
  `ops/pipeline/hgs.py`; its directives, picks history and scorecard are in `docs/archive/pipeline/`.

## UI work must use Facet

- Read `packages/facet/DESIGN.md` before designing or building any interface.
- Use Facet tokens and classes. Semantic names first (`--fc-*`), Facet primitives second
  (`--ds-*`), raw hex or px values never. Type uses the `.text-*` role classes only.
- Never edit generated files (`packages/facet/css/tokens.css`, `typography.css`, `materials.css`,
  `tailwind.css`, `js/tokens.mjs`). Edit `packages/facet/tokens/*.json` and run
  `node packages/facet/scripts/build.mjs`.
- Truth hierarchy for design questions: vercel.com (captured tokens, measurements, reference docs) >
  Vercel's Web Interface Guidelines > Facet decisions > third-party references. See
  `packages/facet/SOURCES.md`.
- Hue allocation is a hard rule (see `packages/facet/DESIGN.md`, "Hue allocation"). Every hue has one
  job; purple is for gems and the brand accent (focus, selection, checked controls) only. Run `node packages/facet/scripts/lint-color.mjs apps` before pushing UI.
- Hidden Gems encodings are fixed: verdict = dot + word, edge = sign + arrow + color, gem rating =
  one 0 to 100 number + purple intensity that rises with it (no tiers), freshness = status dot + relative time, team = logo plus name or abbreviation, player = team logo tile plus name with trailing #number, team colors and logos inside those marks only. Color is never the only cue.
- Do not use Vercel logos, the Vercel name, or Vercel authorship styling in the product.
- Review UI changes against `packages/facet/guidelines/web-interface-guidelines.md` and cite rule IDs.

## Writing style (house rules)

- Never use em dashes in any output: code comments, docs, UI copy, commit messages.
- Say it once: never repeat on a page what a tab, heading, label, column header, icon or control already said.
  Lessons and exceptions in `packages/facet/foundations/content.md`.
- Earn every line: cut any text whose removal would not reduce understanding (ledes that describe the layout,
  reasons nobody asked for, selling lines, restated sentences, captions on examples, numbers already shown).
- Headlines are simple and objective, naming the purpose; specifics live in the content so headlines never go stale.
- Sentence case for headings and UI labels.
- No colons in titles, headings or nav labels.
- The design system is called Facet. Never call it Geist in UI copy, docs or comments; the upstream
  name appears only in provenance (`packages/facet/SOURCES.md`, `reference/`) and real package names.

## Working agreements

- Integrate approved scalability decisions as soon as they come up (tokens, slots, generators), rather than deferring them.
- Preview reviews (Vercel toolbar comments) run as sprints: when the principal types `go`, run
  `.claude/skills/sprint/SKILL.md`. Threads get a 👀 reaction when picked up and a one-line reply when resolved; reply
  otherwise only to say why a comment is parked or dropped.
- When work needs a component, pattern, token or class that Facet lacks, do not hand-roll it in app CSS: the builder
  builds it in `packages/facet` in the same branch (tokens, CSS, component doc, preview specimen), then wires it into
  the feature. App CSS is only layout glue between Facet parts, using `--fc-*` tokens.
- Words and UI are checked twice: by scripts on every change (`pnpm check`, and `node ops/sprint/lint-words.mjs` for
  em dashes, colons in headings and sentence case, which CI runs on every pull request), and by the one `verifier`
  review of each sprint branch (content, design, data safety and the model).
- A product's accent goes through `--fc-brand-*` (`packages/facet/tokens/facet.semantic.json`); reusing Facet for another product means changing those four tokens, not hunting for hues.

## Branches and pull requests

- `main` is production and only the principal merges into it, from a release PR (`staging` to `main`) after
  reviewing the staging preview.
- Builders branch from the latest `staging` and push their branch, with no PR. Prefix by kind: `screens/`, `data/`,
  `facet/`, `copy/`. Never push to someone else's branch, force push or rewrite history.
- The sprint session merges every ready branch into one `sprint/<id>` branch, and merges one sprint PR into
  `staging` once CI is green.
- Work outside a sprint (tooling, docs, the agent workflow) goes on a `fix/` or `agents/` branch with one PR into
  `staging`; changes to the agent workflow are the principal's call.

## Agents

The sprint workflow is in `.claude/skills/sprint/SKILL.md`; the agents it spawns (`builder`, `verifier`,
`ci-fixer`) are in `.claude/agents/`, with an overview in `.claude/agents/README.md`. The principal (Titus, the
owner) makes every key and critical judgement (`.claude/agents/corpus/principal.md`); work that needs one is parked,
never guessed. Recorded decisions are in `.claude/agents/corpus/decisions.md`.

## Data and jobs

- Read `docs/architecture.md` before changing data, jobs or providers.
- Domain rules live in `packages/core` and stay free of I/O. Pages and jobs import them; never re-derive odds math, tiers or verdicts elsewhere.
- History tables (`odds_snapshots`, `estimates`) are append-only. Never update or delete their rows.
- Every provider call goes through a job and `runJob`, so it lands in the pull log with whose move a failure is. No provider calls from pages.
- Schema changes: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, commit the migration.
- Tests run on PGlite with the sample provider: `pnpm check` needs no secrets.

## Repo layout

- `packages/facet/` design system (self-contained, reusable in other projects). This repo is Facet's only source of truth: read `packages/facet` directly, including the specimen pages in `packages/facet/preview`. There are no published copies to consult or keep in sync.
- `packages/core/` domain rules, `packages/db/` schema and client, `packages/ingest/` providers and jobs
- `apps/web/` Hidden Gems app (Next.js, deploys on Vercel with Root Directory `apps/web`)
- `docs/` project documentation
- `ops/sprint/` sprint files, traces and scripts (`merge.mjs`, `lint-words.mjs`)
- `ops/directives/` retired; each file tells any old scheduled run to do nothing
- `ops/pipeline/hgs.py` the old pipeline's code, the reference the v3.0 model was ported from
