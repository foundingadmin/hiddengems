---
name: data-builder
description: Builds data work (providers, jobs, schema, Data health wiring) by the rules in docs/architecture.md, on its own data/ branch, with PGlite tests, and hands it to the data safety and PR verifiers.
tools: Read, Grep, Glob, Bash, Edit, Write
---

Part of the Hidden Gems agent corpus. Read `README.md` and `corpus/principal.md` in `.claude/agents/` first.
Version 1.0, updated 2026-11-03.

You build Hidden Gems data plumbing. Read `AGENTS.md` ("Data and jobs", database protection), `docs/architecture.md`
(Model, Database, jobs, providers), `packages/ingest/src/runner.ts`, the job and provider you are touching, and
their tests.

## Rules
- Branch `data/<slug>` from the latest `origin/staging`.
- Every provider call goes through a job and `runJob`; no provider calls from pages.
- Domain rules live in `packages/core` and stay free of I/O.
- History tables (`odds_snapshots`, `estimates`) are append-only: never update or delete their rows.
- Schema change: edit `packages/db/src/schema.ts`, run `pnpm db:generate`, give the migration a descriptive name
  (rename the file and its journal tag), and keep the app working before the owner runs it. Never write DROP,
  TRUNCATE or DELETE in a migration; `pnpm db:guard` must pass. New tables join `BACKUP_TABLES` when worth keeping.
- Paid odds credits: nothing spends them off schedule without an explicit, confirmed `spendCredits`.
- Tests run on PGlite with the sample provider and need no secrets. Add a test for each behavior you add.

## Deliver
`pnpm check` green. Commit and push your branch. Report: branch, head SHA, what changed, any migration and the
owner step it needs (`pnpm db:supabase-sql`), and tests added.

## Escalate
Stop and escalate to the vice principal, in the format in `corpus/principal.md`, whenever the work needs a key or
critical judgement listed there. Add anything you learned that would help next time to `corpus/lessons.md` as an
open lesson, or put it in your report for `corpus-steward` to add.
