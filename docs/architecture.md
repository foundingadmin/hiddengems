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
| `build-picks` | after every odds pull | `estimates` (history), `picks` (the board: gem rating, Fool's Gold, Recommended order), `gem_records` (history) once a game's freeze is pulled | Follows `pull-odds` |
| `pull-results` | nflverse | `player_game_stats` (backfills the season on first run); settles `bets`, records closing prices, writes `grades` | Daily 10:41 |
| `pull-usage` | nflverse | `player_usage` (inside 10 carries and targets, touchdowns, snap share per player game), injury report onto `players`; then `build-picks` | Daily 10:53 |
| `pull-weather` | Open-Meteo | `game_weather` (the latest kickoff forecast per game at an open stadium in the next 7 days) | Follows `pull-odds` |
| `backtest` | our data | Nothing: its run keeps the walk-forward Brier against the 0.1360 baseline, one log line per week, and warns above it | Tuesday 12:37 |

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
- `gem_records` is append-only: every appraised prop (all four kinds) once per game, written when its
  freeze is pulled. It keeps the board at the freeze, priced and fair at the decision price and at the
  freeze, the New gems flag and the estimate behind it. The decision price is DraftKings as of the last
  weekly snapshot before kickoff (`decisionSnapshot()`): Sunday 8:43 AM, or earlier for Thursday and
  Saturday games.
- `grades` holds one row per gem record or placed bet once the game is final and the player's stat line is
  in: CLV (`taken / close fair - 1`, taken being the decision price or the bet's price, close fair the
  fair chance at the freeze) and the box (Earned, Unlucky, Lucky, Wrong read), from `core/src/grades.ts`.
- `odds_latest` and `picks` are current state, small, and what the app reads. A selection a book
  stops listing is marked `available = false`.
- `slips` and `slip_legs` are current state: one open slip per week (draft, assessed, sent, placed), each leg a
  pick's selection with its price when added (`packages/db/src/slips.ts`). Marking a slip placed writes one `bets`
  row per leg, so `pull-results` records the close and grades it; a parlay leg settles with no payout of its own.
  In sample mode `build-picks` starts one draft from the top gems, so previews have a slip.
- Slips, History reads them through `packages/db/src/history.ts` (graded gems, placed slips with each leg's bet
  and grade) and `core/src/history.ts` (the results line, each slip's outcome, the season record). In sample mode
  (`providersFor()`, never in tests) `pull-results` first writes gem records and two placed slips for final games
  with no records, so previews have graded gems and a graded slip.

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
5. Runs follow-up jobs on success (`pull-odds` then `build-picks` and `pull-weather`).

HTTP to providers goes through one client (`ingest/src/http.ts`): 20 second timeout, one retry for
network and 5xx errors, request counting, quota headers into `provider_usage`, keys redacted from logs.

## Providers

| Provider | Used for | Key |
|---|---|---|
| The Odds API v4, free plan | Anytime TD prices from DraftKings, FanDuel, BetMGM, Caesars, Fanatics, with DraftKings slip links | `ODDS_API_KEY` |
| nflverse | Schedule with spread and total lines (`schedules/games.csv`), 2026 rosters with jersey numbers, weekly player stats, play by play, snap counts, injury reports | none |
| Open-Meteo forecast API | Hourly forecast at kickoff for open stadiums: temperature, wind and gusts, precipitation chance and amount, snow | none |
| Sample | Everything, deterministic, built around today's date | none |
| Anthropic Messages API | The Jeweler's answers (`claude-sonnet-5-5`) | `ANTHROPIC_API_KEY` |

`DATA_MODE=sample` (the default when `ODDS_API_KEY` is unset) runs the whole pipeline on sample data:
local development, tests, CI and previews need no secrets. Adapters validate payloads with zod, so
a provider changing its format fails loudly as "ours" instead of writing bad rows. The live adapters
are written to the providers' documented shapes and tested against fixtures; confirm them with the
first live pull.

Adding a provider: implement the interface for its role in `ingest/src/providers/types.ts`, map its
team names through `findTeam` and its ids through `provider_refs`, add fixture tests, and select it
in `providers/index.ts`.

## The Jeweler

An ask is interactive, so it is not on cron: the Jeweler's server action runs it at once as the `ask-jeweler`
job through `runJob` (`ingest/src/jeweler.ts`), so every call lands in the pull log with whose move a failure is.
Before any call a guard needs both `ANTHROPIC_API_KEY` and the owner's monthly cap (`provider_caps`, US cents,
provider `anthropic`), and refuses an ask the month's spend (`provider_usage`, cents, restarting each UTC month)
cannot cover at the longest answer. Without either, the composer is off and a note says why. The prompt carries the
gem in context and the week's board, read from `picks`. `ANTHROPIC_BASE_URL` points the adapter at a stub for
screenshots. Set the cap in the Supabase SQL editor:
`insert into provider_caps (provider, monthly_cents) values ('anthropic', <cents>) on conflict (provider) do update set monthly_cents = excluded.monthly_cents;`

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
The `backtest` job (`core/src/backtest.ts`) scores the same functions walk forward each Tuesday: every completed week from
Week 4, each player game read from the weeks before it, against his stat line. `packages/core/test/backtest.test.ts`
gives 0.1313 for Weeks 4 to 8 on the fixture; the 0.1360 baseline was scored before most Week 8 snap counts landed.
Each estimate row stores its inputs (form, implied points, stats weight, clarity parts) so any read can
be explained later.

## Weather

Context for the gem sheet's environmental factors (docs/prd.md F2.5); it never moves a rating.
`core/src/weather.ts` holds each team's home stadium with its roof (dome, retractable, open) and `weatherNote()`,
a short line only when it matters at an open stadium: wind 15 mph or more, 25°F or colder, a 50% chance of rain
or more, or any snow. `pull-weather` runs after each odds pull that takes a snapshot or a freeze, one free request per
game at an open stadium; domes, retractable roofs and neutral sites get none. `game_weather` holds the latest
forecast per game. The sheet reads it with `getGameWeather(db, gameId)` (`packages/db/src/weather.ts`), which
returns the forecast, the stadium and the note, or null.

## Splits

Context for the loupe (docs/prd.md F2.2); no split moves a rating. `core/src/splits.ts` reads anytime TD splits this
season from data the jobs already store, so there is no new pull or table. Each split is shrunk toward his season
rate over 4 games, and under 3 games is thin:

| Condition | Sides | From |
|---|---|---|
| Starting QB | usual, other | `player_usage`: each team game's QB with the most snaps (passing yards, then the only QB, before snap counts land); the usual starter has the most starts |
| Teammate out | in, out | `player_usage`: the team's WR1, RB1 and TE1 by mean snap share; a game they missed after their first one for the team; unknown before snap counts land |
| Home or away | home, away | `games`; a neutral site is neither |
| Rest | short, normal, bye | `games` kickoffs: 5 days or fewer since the team's last game, 13 or more, or between |
| Implied points | above, below | `games` lines through core `impliedFactor()` |
| Favored or underdog | favorite, underdog | `games` spread; a pick'em is neither |

This week's side for the QB and teammates comes from the roster and the injury report (Out, Doubtful or off the
active roster is out; Questionable leaves it unknown). `getSplits(db, playerId, gameId)` (`packages/db/src/splits.ts`)
returns every condition with this week's side, every side's hits, games and rate, his games tagged by side (so
`combineSplits()` can intersect conditions without another query), and the names of the players the conditions name.

The gem sheet loads them once with the gem (`apps/web/lib/gem.ts`). The loupe keeps its conditions in `?loupe=` and
changes it with `history.replaceState`, so a toggle redraws on the client with no request. The Notes add up to two
split lines from `splitNotes()`: QB, teammate, rest or implied points, not thin, at least 10 points from his season
rate after shrinking, ranked by the trend lines' score. Home or away and favored or underdog stay trend lines.

## Database

- **Setup and migrations on Supabase**: `pnpm db:supabase-sql [--app-password <password>]` writes one script to
  paste into the Supabase SQL editor (run as the owner). It applies each migration once, recorded exactly as
  `pnpm db:migrate` records it, upserts reference data, closes Supabase's automatic public API on the app's
  tables, and (with a password) creates `hiddengems_app`, the login the app uses: rows only, no create, alter,
  drop or truncate. Run it again after any PR that adds a migration. If Supabase offers "Run and enable RLS",
  choose "Run without RLS": grants and the closed public API control access, and RLS without policies would block
  the app login.
- **Applied automatically (rapid build mode, until the beta)**: `.github/workflows/db-migrate.yml` sends the same
  script to production on every push to `main`, through the Supabase Management API
  (`pnpm db:supabase-apply production`). It needs the `SUPABASE_ACCESS_TOKEN` secret and the
  `SUPABASE_PRODUCTION_REF` variable in GitHub; without the secret it skips. The same command runs one statement with `--sql "..."` and prints the rows, so a session holding the token
  can inspect or fix either database; a session whose Supabase connector is signed in to the account that owns the
  projects can do the same with the connector's SQL tool. `pnpm db:guard` runs first, so a destructive migration never reaches one.
- **Safety**: history tables reject update, delete and truncate (migrations 0003 and 0005); `pnpm db:guard` fails CI on
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

## Environments

| | Production | Staging and every preview |
|---|---|---|
| Branch | `main` (merged only by the principal) | `staging` and task branches |
| URL | hidden-gems-webapp.vercel.app | the staging preview (`hidden-gems-webapp-git-staging-...`) and per-branch previews |
| Database | the real Supabase project (Vercel `DATABASE_URL`, Production, login `hiddengems_app`) | production, read only (Vercel `DATABASE_URL`, Preview, login `hiddengems_preview`); without it, an in-memory sample fixture |
| Data | live: nflverse and The Odds API | sample provider: realistic, fake games, rosters, odds and results, labeled "Sample data" |
| Odds credits | spent on the snapshot schedule | never: previews are forced to sample mode in code (`VERCEL_ENV=preview`) |
| Crons | run (`vercel.json`) | do not run on previews; pull with Data health's buttons |
| Backups | nightly to the private GitHub repository | in memory only |

Preview's `DATABASE_URL` must never be the production URL: a pull there would append sample rows to production's
history tables, which cannot be removed. A release with a migration needs its `pnpm db:supabase-sql` output run
in both projects, staging first.

## Previews

Previews read production so staging is always full, and can change nothing (`apps/web/lib/db.ts`):

- Vercel's Preview `DATABASE_URL` uses `hiddengems_preview`, a login with `SELECT` only whose transactions are
  read only (`pnpm db:supabase-sql` creates it without a login). To set it up, run in the Supabase SQL editor
  `ALTER ROLE hiddengems_preview LOGIN PASSWORD '<a long random password>';`, then copy the Production
  `DATABASE_URL` into Preview with the user changed to `hiddengems_preview.<project ref>` and that password.
- With it set, every server action (slips, Mark read, pulls, pause, the Jeweler) returns "Previews show production
  data and cannot change it", and the cron route refuses. A preview with a new table shows its empty state until the
  release migrates production.
- Without it, a preview builds an in-memory fixture from the sample provider on each server start.

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
