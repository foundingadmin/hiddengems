# Architecture

Hidden Gems pulls schedules, rosters, prices and results from providers, keeps every price it has
ever seen, ranks the current slate, and shows it through Facet. One person uses it, so the design
favors clarity and cheap operation over scale.

## Workspace

```
apps/web/          Next.js app: Gems, Slips, Ask the Jeweler, data health, cron routes (Vercel, Root Directory apps/web)
packages/core/     Domain rules, no I/O: odds math, gem rating, Fool's Gold, Recommended order, snapshot schedule, game ids
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
| `pull-schedule` | nflverse | `games` (with spread and total lines), `provider_refs` | Daily 09:17 |
| `pull-rosters` | nflverse | `players` (team, position, jersey number), `provider_refs` | Daily 09:23 |
| `pull-odds` | The Odds API | `odds_snapshots` (history), `odds_latest` (current, with slip links), `odds_slots` | Every 5 minutes, pulls only on the snapshot schedule |
| `build-picks` | after every odds pull | `estimates` (history), `picks` (the board: gem rating, Fool's Gold, Recommended order) | Follows `pull-odds` |
| `pull-results` | nflverse | `player_game_stats` (backfills the season on first run); settles `bets`, records closing prices | Daily 10:41 |
| `pull-usage` | nflverse | `player_usage` (inside 10 carries and targets, touchdowns, snap share per player game), injury report onto `players`; then `build-picks` | Daily 10:53 |

Cron runs every job often and lets the job decide. Odds come from The Odds API free plan: 500 credits a
month, about 1 credit per game per pull, anytime TD only. So `pull-odds` fires every 5 minutes but calls
the provider only on the snapshot schedule (`core/src/snapshots.ts`, Denver time):

| Snapshot | When | Games |
|---|---|---|
| Opening line | Tue 10:07 AM | Next 7 days |
| Saturday night | Sat 7:47 PM | Next 4 days |
| Sunday morning | Sun 8:43 AM | Next 4 days |
| Freeze | Within 20 minutes before each kickoff | That game |

A snapshot reached more than 90 minutes late is skipped, never pulled late. Each slot is recorded in
`odds_slots`, so none repeats. Before any pull the job checks the month's remaining credits and refuses a
pull it cannot finish (a red "Failed", ours to fix). A full week is about 60 credits, about 250 a month.
Manual pulls bypass the schedule only for the sample provider, which costs nothing. A run with nothing
due is skipped and leaves no pull-log row.

## Gem rating

`packages/core/src/gems.ts` holds the rules from `docs/prd.md` section 8:

- **Posted price**: DraftKings, the purchase book. Other books inform the estimate.
- **Fair chance**: the posted price's implied chance times one minus the assumed cut (5% plus 1% per
  point of decimal odds, at most 35%; section 11.4).
- **Gem**: our hit chance beats the posted price's implied chance (clears the cut). Rating =
  `round(100 * clamp(carat / 10, 0, 1) * clarity / 100)`, where carat is our chance minus the fair
  chance in points.
- **Fool's Gold**: beats the fair price but not the posted price, so the cut eats it. No rating.
- **Unrated**: no 2026 stats, so no read and the market stands.
- **Recommended order**: gems by hit chance times clarity, then unrated, then Fool's Gold last.

Approved Nov 3 2026: Fool's Gold beats the fair price but not the posted price (a prop that beats
neither is no gem); the rating uses carat (gap to fair), while the Edge column shows our chance minus the
priced chance; the opening snapshot is Tue 10:07 AM Denver.

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
| The Odds API v4, free plan | Anytime TD prices from DraftKings, FanDuel, BetMGM, Caesars, Fanatics, with DraftKings slip links | `ODDS_API_KEY` |
| nflverse | Schedule with spread and total lines (`schedules/games.csv`), 2026 rosters with jersey numbers, weekly player stats, play by play, snap counts, injury reports | none |
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

`build-picks` reads every prop with Hidden Gems v3.0 (PRD section 11), ported from `hgs.py` into
`packages/core/src/model.ts`. Inputs come from `pull-usage` (nflverse play by play and snap counts, the
injury report) and `pull-schedule` (spread and total lines).

1. **Red zone read**: inside 10 carries times the league's TD rate per carry, plus inside 10 targets times
   the rate per target, plus long touchdowns shrunk toward his position's rate for his snap share
   (32 prior games). Scaled by implied team points over the league average through that week.
2. **Blend**: 80% red zone read, 20% TD hit rate (shrunk toward 20% over 8 games, scaled by snap share),
   then logistic recalibration (a = -0.213, b = 0.755).
3. **Market blend**: stats weight 0.5 (0.3 under 4 games) times min(1, 8 / (odds + 4)); the rest is the
   fair price. No 2026 games: no read, the market stands, unrated.
4. **Clarity**: sample 40 (touchdowns we would expect to have seen), consistency 30 (red zone read and
   hit rate agree), books agree 15 (range of the books' implied chances over their mean), setup 15
   (injury report: Questionable 8, Doubtful 2, Out 0; minus 5 for a falling snap share).

`packages/core/test/model.test.ts` checks the port against `hgs.py` on Week 8: every player's form and
stats chance, and every Week 8 board read, to 1e-9. The fixture is nflverse data as of the Week 8 freeze.
Each estimate row stores its inputs (form, implied points, stats weight, clarity parts) so any read can
be explained later.

## Database

- **Setup and migrations on Supabase**: `pnpm db:supabase-sql [--app-password <password>]` writes one script to
  paste into the Supabase SQL editor (run as the owner). It applies each migration once, recorded exactly as
  `pnpm db:migrate` records it, upserts reference data, closes Supabase's automatic public API on the app's
  tables, and (with a password) creates `hiddengems_app`, the login the app uses: rows only, no create, alter,
  drop or truncate. Run it again after any PR that adds a migration.
- **Safety**: history tables reject update, delete and truncate (migration 0003); `pnpm db:guard` fails CI on
  a migration that drops, truncates or deletes unless the line says `-- destructive-approved: <reason>`.
- **Backups**: the `backup` job (daily 11:07 UTC) writes the whole database as gzipped JSON to a private GitHub
  repository (`BACKUP_GITHUB_REPO`, written with `BACKUP_GITHUB_TOKEN`, a fine-grained token for that one
  repository with Contents read and write), one file per day plus `BACKUP.md` with row counts. Never this
  repository. Restore with `pnpm db:restore <file>` into an empty, migrated database.

- **Production**: Postgres from the Vercel Marketplace (Neon or Supabase). `DATABASE_URL` uses
  postgres.js with prepared statements off, so transaction poolers work.
- **Local and tests**: PGlite (Postgres in WebAssembly). Without `DATABASE_URL`, data lives in
  `.data/pglite` and the app migrates and seeds it on first request. PGlite allows one process at a
  time: stop `pnpm dev` before running CLI jobs against it, or point both at a real Postgres.
- **Migrations**: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, commit the SQL in
  `packages/db/drizzle`. Apply with `pnpm db:migrate`, which also upserts reference data (teams,
  books, markets). Production migrations run explicitly, never on a request.

## Access

The sign-in gate is off for now (owner decision, 2026-11-03). `apps/web/proxy.ts` holds it: set
`APP_LOCK=on` in Vercel and redeploy, and every page asks for `APP_PASSWORD` again (HTTP Basic). Cron
routes never use it; they require `Authorization: Bearer $CRON_SECRET`. With the gate off, anyone with
the URL can open the app and press its pull buttons. What protects the data then is the database
itself (the app login cannot drop or alter anything, history rejects edits, nightly backups) and the
odds job, which never spends more credits than the month has left.

## Commands

| Command | Does |
|---|---|
| `pnpm install` | Installs the workspace (pnpm 10, Node 22+) |
| `pnpm dev` | Runs the app on PGlite with sample data |
| `pnpm job all` | Pulls schedule, rosters, results, usage, then odds (and ratings), in order |
| `pnpm job <name> [--force]` | Runs one job; `--force` ignores cadence |
| `pnpm db:generate` / `pnpm db:migrate` | Writes / applies migrations |
| `pnpm check` | Typecheck, tests, color lint |

## Next

- The screens build (`docs/build-brief.md`): new gems row, gem sheet, slips, the Jeweler, history.
