# Deploying Hidden Gems on Vercel

Practical plan for deploying this pnpm + Turborepo monorepo (`apps/web` Next.js app, `packages/*` including `packages/facet`) on Vercel, plus the platform features we will likely want later. Based on Vercel docs fetched as Markdown on 2026-11-02; each section cites the page and its `last_updated` date. Items marked **Unverified** need a check before we rely on them.

## TL;DR

1. One Vercel project for `apps/web`, Root Directory `apps/web`, framework Next.js. Leave build/install on auto-detect; turbo is available globally and scopes itself to the Root Directory.
2. Root `package.json` declares `packageManager` and `pnpm-workspace.yaml` lists `apps/*` and `packages/*`. `apps/web` depends on `@hiddengems/facet` with `workspace:*` so Vercel can tell which commits affect the app.
3. Turn on "Skip deployment" for unaffected projects (GitHub only). Link the Turborepo Remote Cache.
4. Declare build-affecting env vars per task in `turbo.json` so caches never cross environments.
5. Plan on the **Pro** plan before launch: Hobby is non-commercial only and limits cron jobs to once per day.

## 1. Project setup

Sources: https://vercel.com/docs/monorepos.md (2026-08-11), https://vercel.com/docs/monorepos/turborepo.md (2026-08-28), https://vercel.com/docs/builds/configure-a-build.md (2026-08-28), https://vercel.com/docs/monorepos/monorepo-faq.md (2026-08-11).

| Setting | Value for Hidden Gems | Notes |
| --- | --- | --- |
| Root Directory | `apps/web` | The app cannot reach files outside it unless "Include source files outside of the Root Directory in the Build Step" is on (default for projects created after 2020-08-27). Keep it on so `packages/facet` resolves. |
| Framework preset | Next.js | Auto-detected. |
| Build command | Default (`next build` from `apps/web` scripts) or `turbo run build` | Vercel's table: `turbo run build` (turbo >= 1.8) or `cd ../.. && turbo run build --filter=web`. Global `turbo build` infers the filter from the Root Directory. |
| Install command | Auto-detected from the root `pnpm-lock.yaml` | Optional filtered install in `apps/web/vercel.json`: `"installCommand": "pnpm install --filter web..."` (replace `web` with the app's package `name`). |
| Output directory | Framework default | Must match turbo `outputs` or cache hits fail to deploy. |
| Skip unaffected deployments | Enabled (Root Directory section, "Skip deployment") | Requirements: GitHub repo; pnpm workspaces; every workspace package has a unique `name`; internal deps declared explicitly in each `package.json`. Skipped deploys do not use build slots. |
| Ignored Build Step | Only if skipping does not fit | `turbo query affected --base=$VERCEL_GIT_PREVIOUS_SHA --packages <name> --exit-code` (current recommendation), or `npx turbo-ignore --fallback=HEAD^1`. Canceled builds still count against limits. |
| Node.js | 26.x (current Vercel default) | Per https://vercel.com/docs/functions/runtimes/node-js/node-js-versions.md; `engines.node` such as `26.x` or `>=22.0.0` resolves to latest 26.x. |
| Config file | `apps/web/vercel.json` or `apps/web/vercel.ts` (one only) | `vercel.ts` uses `@vercel/config` for typed, build-time-computed config (https://vercel.com/docs/project-configuration/vercel-ts.md, 2026-08-25). |
| CLI | `vercel link --repo` from the repo root | Links all projects in the monorepo; run CLI from the root, not subfolders. |

**Package manager version (Unverified).** Vercel's package-manager page (https://vercel.com/docs/package-managers.md) documents auto-selection only up to pnpm 10 for `lockfileVersion: 9.0`, and an override `pnpm install` uses the oldest pnpm in the image. Turborepo's own examples now pin pnpm 12.16.1. If we adopt pnpm 11+, set `"packageManager": "pnpm@<version>"` in the root `package.json`, consider `ENABLE_EXPERIMENTAL_COREPACK=1`, and confirm the version in the first build log.

**How `packages/facet` is consumed.** Two workable patterns:

- *Just-in-time (recommended to start):* Facet exports TS/CSS source; `apps/web/next.config` sets `transpilePackages: ['@hiddengems/facet']`. No Facet build step, fastest iteration.
- *Compiled (Turborepo `with-tailwind` pattern):* Facet builds `dist/` (Tailwind CLI to `dist/index.css`, `tsc` to JS) and exports `./styles.css`; `build` in `turbo.json` has `dependsOn: ["^build"]` so Facet builds first and is cached.

**Fonts.** Simplest path that matches Vercel examples: add `geist` to `apps/web` and use `geist/font/sans` + `geist/font/mono` (Next 15+ needs no `transpilePackages`). Using `next/font/local` against files inside `packages/facet/fonts` should also work but is **Unverified** across package boundaries; test before committing to it.

## 2. turbo.json and environment variables

Sources: https://vercel.com/docs/monorepos/turborepo.md, https://vercel.com/docs/environment-variables.md (2026-09-17), https://vercel.com/docs/environment-variables/sensitive-environment-variables.md, https://vercel.com/docs/environment-variables/shared-environment-variables.md.

Starting point (merge of Vercel's guidance and the `with-tailwind` example):

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]
    },
    "web#build": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL", "ODDS_API_KEY", "CRON_SECRET", "GLOBAL_CONFIG", "VERCEL_RELATED_PROJECTS"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**"]
    },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^build", "^check-types"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

Env var list above is illustrative; keep it to variables that actually affect build output.

- **Why declare env vars:** Turborepo must hash any variable that changes build output, or a cached staging build can ship to production. `NEXT_PUBLIC_*` is inferred automatically for Next.js; anything else inlined or read at build time must be listed. Scope vars to the app task (`web#build`) rather than `globalEnv` for better cache hits.
- **Environments:** Production, Preview (all non-production branches or a specific branch), Development (`vercel env pull` writes `apps/web/.env.local`). Custom Environments exist for staging-like setups.
- **Types:** variables are now **Config** (readable after save) or **Secret** (write-only). Use Secret for API keys, DB URLs and `CRON_SECRET`. Secrets of 32+ characters are redacted from build logs. Secrets are now allowed in Development.
- **Shared env vars** live at the team level and can be linked to several projects (useful if we add a second app).
- **Limits:** 64 KB total per deployment for Node runtimes; 5 KB for edge runtime functions and middleware.
- **Marketplace resources** (Neon, Supabase, Upstash) inject their own env vars scoped to the environments on the connection.
- **Remote Caching:** `pnpm dlx turbo login` then `pnpm dlx turbo link` from the repo root. Builds on Vercel use it automatically; the deployment page has a Turborepo Run Summary for diagnosing cache misses.

## 3. Features for later, mapped to Hidden Gems

### Cron Jobs: scheduled odds pulls

Sources: https://vercel.com/docs/cron-jobs.md (2026-09-16), https://vercel.com/docs/cron-jobs/manage-cron-jobs.md (2026-08-11), https://vercel.com/docs/cron-jobs/usage-and-pricing.md (2026-07-15), https://vercel.com/docs/functions/limitations.md (2026-08-24).

- Defined in `apps/web/vercel.json` under `crons: [{ "path": "/api/cron/odds", "schedule": "*/5 * * * *" }]`. Vercel sends an HTTP GET to the **production** deployment only, user agent `vercel-cron/1.0`, with an `x-vercel-cron-schedule` header (lets several schedules share one route, for example a 5-minute incremental pull and a nightly full sync).
- **Plan limits:** Hobby allows only once-per-day jobs (more frequent expressions fail the deploy) with timing anywhere within the hour. Pro and Enterprise allow once per minute with per-minute precision. 100 cron jobs per project on all plans. Cron runs are billed as normal function usage.
- **Expressions:** UTC only; no `MON`/`JAN` names; day-of-month and day-of-week cannot both be set. NFL windows (for example Sunday 1:00 PM ET) must be converted to UTC and adjusted for daylight saving.
- **Security:** set a `CRON_SECRET` (16+ random chars); Vercel sends `Authorization: Bearer <CRON_SECRET>`; reject anything else with 401.
- **Reliability:** no retries on failure; delivery is best effort and can be missed or duplicated; overlapping runs are possible if a run outlasts the interval; redirects are not followed. Design pulls as idempotent upserts keyed by (game, book, market, observed_at), reconcile everything since the last successful run, and take a lock (for example Upstash Redis) to prevent overlap.
- **Duration:** with Fluid compute (default for new projects) functions default to 300 s; Pro max 800 s (1800 s in beta). Split long jobs.
- **Local testing:** call the route directly (`http://localhost:3000/api/cron/odds`); `vercel dev`/`next dev` do not run schedules.
- **Fan-out options:** Vercel Queues (Beta: durable topics, retries, at-least-once; https://vercel.com/docs/queues.md, 2026-09-03) for one message per sportsbook or market, and Vercel Workflows (durable multi-step code with `'use workflow'`; https://vercel.com/docs/workflows.md, 2026-09-04) for pull, normalize, model, alert pipelines.

### Global Config (formerly Edge Config)

Source: https://vercel.com/docs/global-config/migration-guide.md (2026-07-29), https://vercel.com/docs/storage.md (2026-09-03).

- **Renamed:** Edge Config is now Global Config. New SDK `@vercel/global-config` (drop-in for `@vercel/edge-config`), env var `GLOBAL_CONFIG` (SDK falls back to `EDGE_CONFIG`), CLI `vercel global-config`. Old names keep working. Use the new SDK before connecting a store, because newly connected stores only create `GLOBAL_CONFIG`.
- **Fit:** read-heavy, rarely written runtime config: kill switches, enabled sportsbooks, model thresholds, maintenance banner. Reads mostly under 1 ms.
- **Limits:** store size 1 MB; writes 250/month on Hobby, 100/hour on Pro. Not for odds data.

### Flags

Sources: https://vercel.com/docs/flags.md (2026-09-15), https://vercel.com/docs/flags/vercel-flags.md (2026-07-15).

- Vercel Flags (all plans) with the Flags SDK (`flags` package) for Next.js; targeting, segments, per-environment values, A/B splits, embedded definitions as a fallback, Flags Explorer in the Vercel Toolbar for local overrides, and evaluations visible in Runtime Logs and Web Analytics. Marketplace providers (LaunchDarkly, Statsig, etc.) also plug in.
- Use for gating new models, beta views and pricing experiments.

### Database and storage via Marketplace

Sources: https://vercel.com/docs/postgres.md, https://vercel.com/docs/storage.md, https://vercel.com/docs/marketplace-storage.md.

- **Vercel Postgres no longer exists** (existing databases moved to Neon in December 2024). Provision Postgres through the Marketplace: Neon, Supabase, Prisma Postgres or AWS Aurora Postgres. `vercel install neon` (or `supabase`, `upstash`) installs, connects to the linked project and pulls credentials into `.env.local`.
- **Suggested split:** Postgres (Neon or Supabase) for games, lines history, models and users; Upstash Redis for cron locks, rate limits and hot caches; Vercel Blob (`@vercel/blob`, public or private stores, signed URLs) for raw odds payload snapshots and CSV exports.
- Put the database region next to the function region (default `iad1`, US East, which suits a US NFL audience).

### Observability: Web Analytics and Speed Insights

Sources: https://vercel.com/docs/analytics.md (2026-08-11), https://vercel.com/docs/analytics/quickstart.md, https://vercel.com/docs/speed-insights/quickstart.md (2026-09-01).

- Web Analytics: `pnpm add @vercel/analytics`, `import { Analytics } from '@vercel/analytics/next'` in the root layout. Cookieless, daily-rotating visitor hash. Custom events (for example "filter applied", "bet slip exported") need Pro or Enterprise.
- Speed Insights: `pnpm add @vercel/speed-insights`, `import { SpeedInsights } from '@vercel/speed-insights/next'`. Tracks Core Web Vitals per route; important for heavy table pages.
- Observability Plus is needed for route-level metrics used by the `vercel-optimize` agent skill.

### AI SDK and AI Gateway

Source: https://vercel.com/docs/ai-sdk.md (2026-10-05).

- `ai` package (v7 in Vercel's chatbot template): `generateText`, `generateObject` with Zod schemas, `ToolLoopAgent` for tool-using agents, streaming UI via `@ai-sdk/react`. AI Gateway lets us pass `provider/model` strings with routing, fallbacks and spend limits.
- Candidate uses: natural-language filters ("home dogs off a bye"), structured matchup summaries, anomaly explanations for line moves. Keep model outputs advisory and clearly labeled.

### Other relevant platform features

- **Skew Protection** (Pro/Enterprise; https://vercel.com/docs/skew-protection.md, 2026-09-16): keeps clients on the deployment that served them; good for a long-lived dashboard tab. Caveat from the Turborepo page: Next.js builds with Skew Protection always miss the Turborepo cache, and turbo must be >= 2.4.1.
- **Deployment Protection** for previews; **Related Projects** (`relatedProjects` in `vercel.json`, max 3, `VERCEL_RELATED_PROJECTS` env var, `@vercel/related-projects`) if we later split out an API app.
- **Fluid compute** is the default for new projects; functions run in one region by default (`iad1`).

## 4. Plan and policy notes

- **Hobby is non-commercial, personal use only** (https://vercel.com/docs/plans/hobby.md, citing fair use guidelines). A monetized Hidden Gems requires Pro. Hobby also caps cron at daily and Global Config writes at 250/month.
- **Content policy (Unverified):** the Acceptable Use Policy page (https://vercel.com/legal/acceptable-use-policy) contained no mention of gambling or betting when searched on 2026-11-02. We provide research, not wagering, but the full Terms of Service were not reviewed.

## 5. Checklist

- [ ] Root: `package.json` with `packageManager`, `engines.node`, scripts calling `turbo run`; `pnpm-workspace.yaml` with `apps/*`, `packages/*`; `turbo.json` as above; one `pnpm-lock.yaml` at root.
- [ ] Unique package names (`web`, `@hiddengems/facet`, ...) and explicit `workspace:*` deps.
- [ ] Vercel project: Root Directory `apps/web`, include outside files on, Skip deployment on, Node 26.x.
- [ ] `turbo login` + `turbo link` for Remote Cache.
- [ ] Env vars created as Secret/Config per environment; `vercel env pull` for local; build-affecting vars listed under `web#build.env`.
- [ ] Pro plan before enabling sub-daily cron or any commercial launch.
- [ ] `apps/web/vercel.json` (or `vercel.ts`) with `crons`; `CRON_SECRET`; idempotent, locked cron handlers.
- [ ] Marketplace Postgres + Upstash; `@vercel/global-config` (not `@vercel/edge-config`) for runtime config.
- [ ] `<Analytics />` and `<SpeedInsights />` in the root layout.
- [ ] Verify first build log: pnpm version, turbo cache status, Root Directory scoping.
