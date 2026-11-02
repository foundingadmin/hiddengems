# Architecture

Hidden Gems pulls schedules, rosters, prices and results from providers, keeps every price it has
ever seen, ranks the current slate, and shows it through Facet. One person uses it, so the design
favors clarity and cheap operation over scale.

## Workspace

```
apps/web/          Next.js app: slate, data health, cron routes (Vercel, Root Directory apps/web)
packages/core/     Domain rules, no I/O: odds math, markets, gap, tiers, verdicts, pull cadence, game ids
packages/db/       Postgres schema (Drizzle), migrations, client, reference seed
packages/ingest/   Provider adapters, jobs, the job runner and the run log, CLI
packages/facet/    Design system, plus the NFL team kit (colors, logos, name resolver)
```

Dependencies point one way: `web` uses `ingest`, `db`, `core` and `facet`; `ingest` uses `db` and
`core`; `db` uses `core`; `core` reads team identity from Facet's kit, so there is one team list for
the data and the UI. Packages ship TypeScript source and Next compiles them (`transpilePackages`), so
there is no package build step.

## Data flow

```
providers ──> jobs (ingest) ──> Postgres ──> pages (web)
   │              │
   │              └─> runs + run_logs (the pull log), provider_usage (quota)
   └─ sample provider when no keys are set
```

| Job | Source | Writes | Cron (UTC) |
|---|---|---|---|
| `pull-schedule` | SportsDataIO | `games`, `provider_refs` | Daily 09:17 |
| `pull-rosters` | SportsDataIO | `players` (team, position, jersey number), `provider_refs` | Daily 09:23 |
| `pull-odds` | The Odds API | `odds_snapshots` (history), `odds_latest` (current), `games.odds_pulled_at` | Every 5 minutes |
| `build-picks` | after every odds pull | `estimates` (history), `picks` (current slate) | Follows `pull-odds` |
| `pull-results` | SportsDataIO | `player_game_stats`; settles `bets`, records closing prices | Hourly at :41 |

Cron runs every job often and lets the job decide. `pull-odds` fires every 5 minutes, but each game
is pulled on its own cadence (`core/src/cadence.ts`): every 5 minutes within 6 hours of kickoff
and during games, hourly within 3 days, every 6 hours otherwise. Daylight saving, Thursday and
Saturday games and international kickoffs need no cron changes, and quiet games spend no quota. A
run with nothing due is skipped and leaves no pull-log row.

## Identity

- **Teams**: Facet's kit ids (`kc`, `lar`). `findTeam` resolves any provider spelling: abbreviations,
  aliases (JAC, LA, WSH, OAK), nicknames, full names.
- **Games**: `gameId()` is provider-neutral: Eastern kickoff date, away, home (`2026-11-08-buf-kc`).
  A game that moves to a new date gets a new id; the old row is marked postponed.
- **Players**: our own UUIDs. `provider_refs` maps each provider's ids to ours. Odds feeds send only
  names, matched by `nameKey()` within the two teams playing. Unmatched names are logged as a warning
  and kept by name, so no price is lost.
- **Selections**: `selectionKey()` is game, market, player, side, line. One selection, many books.

## History

- `odds_snapshots` is append-only. A row is written only when a book's price changes (unique on
  selection, book and the provider's observed time), so repeated pulls cost nothing and line
  movement, closing prices and any past slate can be rebuilt.
- `estimates` is append-only: every model output, with its inputs.
- `odds_latest` and `picks` are current state, small, and what the app reads. A selection a book
  stops listing is marked `available = false`.

## Runs, logs and failures

Every job run goes through `runJob` (`ingest/src/runner.ts`):

1. Takes a lock row (`job_locks`) so overlapping or duplicated cron deliveries cannot double-pull. A
   crashed run frees its lock after 10 minutes.
2. Writes a `runs` row: job, provider, trigger (cron, manual, cli), status, one-sentence message with
   the numbers in it, request count, rows written, duration.
3. Keeps its log lines in `run_logs` (info, warn, error) and mirrors them to stdout as JSON, which
   lands in Vercel's runtime logs.
4. On failure records whose move it is (`failure_owner`), per Facet's failures pattern:
   - **ours**: a rejected key, a used-up quota, a payload the adapter no longer reads, missing config.
     Shown as red "Failed".
   - **provider**: outages, server errors, timeouts. The next run retries. Shown as amber "Provider down".
5. Runs follow-up jobs on success (`pull-odds` then `build-picks`).

HTTP to providers goes through one client (`ingest/src/http.ts`): 20 second timeout, one retry for
network and 5xx errors, request counting, quota headers into `provider_usage`, keys redacted from logs.

## Providers

| Provider | Used for | Key |
|---|---|---|
| The Odds API v4 | Player prop prices from DraftKings, FanDuel, BetMGM, Caesars | `ODDS_API_KEY` |
| SportsDataIO NFL v3 | Schedule, rosters with jersey numbers, player game stats | `SPORTSDATAIO_KEY` |
| Sample | Everything, deterministic, built around today's date | none |

`DATA_MODE=sample` (the default when `ODDS_API_KEY` is unset) runs the whole pipeline on sample data:
local development, tests, CI and previews need no secrets. Adapters validate payloads with zod, so
a provider changing its format fails loudly as "ours" instead of writing bad rows. The live adapters
are written to the providers' documented shapes and tested against fixtures; confirm them with the
first live pull.

Adding a provider: implement the interface for its role in `ingest/src/providers/types.ts`, map its
team names through `findTeam` and its ids through `provider_refs`, add fixture tests, and select it
in `providers/index.ts`.

## Model

`build-picks` uses `consensus-v0` (`ingest/src/model/consensus.ts`) until the real model exists. It
estimates each selection from the other books: their average fair chance where both sides of an
over/under are listed, otherwise their average priced chance. A positive gap means the best book is
longer than the market. That is line shopping, not a forecast, so only two signals are filled (price
gap, market depth) and every verdict reads Unchecked until the setup signal exists. The real model
replaces `estimate()` and fills the other four signals; the tables and pages do not change.

## Hosting v1: a claude.ai artifact

The first iteration is hosted as a private artifact in the owner's claude.ai account
(https://claude.ai/artifact/H4A8Nv5Pup51dW2DiGpdmh). An artifact page runs no server and cannot call
other hosts, so the split is:

- **The page** (`apps/artifact`): one self-contained HTML file with Facet, the fonts and the team
  logos inlined. `pnpm artifact:build` writes `apps/artifact/dist/hidden-gems.html`; publish that file
  to the same artifact URL to update it. It reads two documents from the artifact's database and
  re-renders live when they change: `hg/slate` (the ranked picks) and `hg/health` (sources and the
  pull log).
- **The pipeline** (unchanged): `pnpm job all` pulls and ranks, then `pnpm job snapshot <dir>` writes
  `slate.json` and `health.json`.
- **The hand-off**: Claude writes both files into the artifact database (`ArtifactData` batch, set
  `hg/slate` and `hg/health`). Access rules make `hg` readable by anyone the artifact is shared with
  and writable only by the owner.

`apps/web` stays the path to a full deployment (Vercel, cron, Postgres) when the artifact outgrows it.

## Database

- **Production**: Postgres from the Vercel Marketplace (Neon or Supabase). `DATABASE_URL` uses
  postgres.js with prepared statements off, so transaction poolers work.
- **Local and tests**: PGlite (Postgres in WebAssembly). Without `DATABASE_URL`, data lives in
  `.data/pglite` and the app migrates and seeds it on first request. PGlite allows one process at a
  time: stop `pnpm dev` before running CLI jobs against it, or point both at a real Postgres.
- **Migrations**: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, commit the SQL in
  `packages/db/drizzle`. Apply with `pnpm db:migrate`, which also upserts reference data (teams,
  books, markets). Production migrations run explicitly, never on a request.

## Access

The app is private. `apps/web/proxy.ts` puts every page behind HTTP Basic auth with `APP_PASSWORD`;
on Vercel (production and preview) the app stays closed until it is set. Cron routes skip the
password and require `Authorization: Bearer $CRON_SECRET` instead.

## Commands

| Command | Does |
|---|---|
| `pnpm install` | Installs the workspace (pnpm 10, Node 22+) |
| `pnpm dev` | Runs the app on PGlite with sample data |
| `pnpm job all` | Pulls schedule, rosters, odds (and picks) and results, in order |
| `pnpm job <name> [--force]` | Runs one job; `--force` ignores cadence |
| `pnpm db:generate` / `pnpm db:migrate` | Writes / applies migrations |
| `pnpm check` | Typecheck, tests, color lint |

## Next

- The model: real estimates and the four unfilled signals (setup, track record, sample, matchup).
- Bets: an entry form and the track record view (the table, settlement and closing prices exist).
- Alerts on line moves past fair price, and Vercel Queues if per-game pulls outgrow one function run.
- Line history charts from `odds_snapshots`.
