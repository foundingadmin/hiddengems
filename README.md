# Hidden Gems

A research tool for NFL betting: it pulls market data, correlates quantitative signals with
qualitative reporting, and ranks available sportsbook bets as custom "gem" tiers.

## Repository

```
apps/web/          The app: slate, data health, cron routes (Next.js on Vercel)
packages/core/     Domain rules: odds math, gaps, tiers, verdicts, cadence
packages/db/       Postgres schema, migrations, client
packages/ingest/   Providers, jobs, the run log
packages/facet/    Facet, the design system (start with packages/facet/DESIGN.md)
docs/              Architecture and deployment
```

## Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and choose Pull everything. With no keys it runs on sample data and a
local Postgres (PGlite), so nothing else is needed. For live data, copy `.env.example` to
`apps/web/.env.local` and fill in the keys.

How data moves, where history lives and how failures are reported: `docs/architecture.md`.
Deploying: `docs/vercel-deployment.md`.
