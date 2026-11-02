// The job runner: every run gets a row in `runs` (the pull log) and its lines in `run_logs`, takes a
// lock so overlapping cron deliveries cannot double-pull, and records whose move it is on failure.
import { type Db, jobLocks, providerUsage, runLogs, runs } from '@hiddengems/db';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { type FailureOwner, toJobError } from './errors';
import { createHttp, type Http } from './http';
import type { ProviderBase, ProviderContext, Providers } from './providers/types';

export type Trigger = 'cron' | 'manual' | 'cli' | 'test';
export type Level = 'info' | 'warn' | 'error';

export interface JobContext {
  db: Db;
  runId: string;
  now: Date;
  trigger: Trigger;
  providers: Providers;
  /** Forces work a cadence check would skip (manual pulls). */
  force: boolean;
  log(level: Level, message: string, data?: Record<string, unknown>): void;
  /** A provider context with instrumented HTTP for one adapter. */
  using(provider: ProviderBase): ProviderContext;
}

export interface JobOutcome {
  /** One sentence with the numbers in it ("Pulled 386 prices across 3 books for 5 games"). */
  message: string;
  rowsWritten?: number;
  /** Warned instead of succeeded: the run finished, but something needs a look. */
  warned?: boolean;
  meta?: Record<string, unknown>;
}

export interface Job {
  name: string;
  /** Which provider the run log shows as the source. */
  provider?: keyof Providers;
  run(ctx: JobContext): Promise<JobOutcome | { skipped: string }>;
  /** Jobs to run after this one succeeds (a fresh odds pull rebuilds picks). */
  then?: string[];
  /** Lock lifetime; a crashed run frees its lock after this. */
  lockMs?: number;
}

export interface RunResult {
  job: string;
  runId: string | null;
  status: 'succeeded' | 'warned' | 'failed' | 'skipped' | 'locked';
  message: string;
  failureOwner?: FailureOwner;
  durationMs: number;
  followUps?: RunResult[];
}

export interface RunOptions {
  db: Db;
  providers: Providers;
  trigger: Trigger;
  now?: Date;
  force?: boolean;
  registry: Record<string, Job>;
  /** Mirrors log lines to stdout as JSON (Vercel runtime logs). */
  echo?: boolean;
}

async function acquire(db: Db, job: string, holder: string, ms: number): Promise<boolean> {
  await db.insert(jobLocks).values({ job }).onConflictDoNothing();
  const got = await db.update(jobLocks)
    .set({ holder, lockedUntil: sql`now() + ${`${ms} milliseconds`}::interval` })
    .where(and(eq(jobLocks.job, job), or(isNull(jobLocks.lockedUntil), lt(jobLocks.lockedUntil, sql`now()`))))
    .returning({ job: jobLocks.job });
  return got.length > 0;
}
const release = (db: Db, job: string, holder: string) =>
  db.update(jobLocks).set({ holder: null, lockedUntil: null }).where(and(eq(jobLocks.job, job), eq(jobLocks.holder, holder)));

export async function runJob(name: string, opts: RunOptions): Promise<RunResult> {
  const job = opts.registry[name];
  if (!job) throw new Error(`Unknown job "${name}". Jobs: ${Object.keys(opts.registry).join(', ')}`);
  const started = Date.now();
  const now = opts.now ?? new Date();
  const holder = crypto.randomUUID();
  const { db } = opts;

  if (!(await acquire(db, name, holder, job.lockMs ?? 10 * 60_000))) {
    return { job: name, runId: null, status: 'locked', message: `${name} is already running`, durationMs: Date.now() - started };
  }

  const lines: { level: Level; message: string; data?: Record<string, unknown>; at: Date }[] = [];
  const https: Http[] = [];
  const providerId = job.provider ? opts.providers[job.provider].id : null;
  let runId: string | null = null;
  const ensureRun = async () => {
    if (runId) return runId;
    const [row] = await db.insert(runs).values({ job: name, provider: providerId, trigger: opts.trigger, startedAt: now }).returning({ id: runs.id });
    runId = row!.id;
    return runId;
  };

  const ctx: JobContext = {
    db, now, trigger: opts.trigger, providers: opts.providers, force: opts.force ?? false,
    get runId() { if (!runId) throw new Error('runId is created before the job runs'); return runId; },
    log(level, message, data) {
      lines.push({ level, message, data, at: new Date() });
      if (opts.echo) console.log(JSON.stringify({ job: name, runId, level, message, ...data }));
    },
    using(provider) {
      const http = createHttp({
        provider: provider.id,
        headers: provider.headers,
        onResponse: async (res) => {
          const usage = provider.usage?.(res);
          if (usage) {
            await db.insert(providerUsage).values({ provider: provider.id, ...usage, updatedAt: new Date() })
              .onConflictDoUpdate({ target: providerUsage.provider, set: { ...usage, updatedAt: new Date() } });
          }
        },
      });
      https.push(http);
      return { now, http, log: (level, message, data) => ctx.log(level, message, data) };
    },
  };

  try {
    await ensureRun();
    const outcome = await job.run(ctx);
    const requestCount = https.reduce((n, h) => n + h.requestCount, 0);
    if ('skipped' in outcome) {
      // Skips are not pull-log entries: a cadence check every 5 minutes would bury the real runs.
      await db.delete(runs).where(eq(runs.id, runId!));
      if (opts.echo) console.log(JSON.stringify({ job: name, status: 'skipped', reason: outcome.skipped }));
      return { job: name, runId: null, status: 'skipped', message: outcome.skipped, durationMs: Date.now() - started };
    }
    const status = outcome.warned || lines.some((l) => l.level === 'warn') ? 'warned' : 'succeeded';
    await finish(db, runId!, lines, { status, message: outcome.message, rowsWritten: outcome.rowsWritten ?? 0, requestCount, meta: outcome.meta ?? null, started });
    const result: RunResult = { job: name, runId, status, message: outcome.message, durationMs: Date.now() - started };
    await release(db, name, holder);
    if (job.then?.length) {
      result.followUps = [];
      for (const next of job.then) result.followUps.push(await runJob(next, { ...opts, now: new Date(now.getTime() + (Date.now() - started)), force: true }));
    }
    return result;
  } catch (err) {
    const e = toJobError(err);
    lines.push({ level: 'error', message: e.message, data: { code: e.code, owner: e.owner, ...e.detail }, at: new Date() });
    if (opts.echo) console.error(JSON.stringify({ job: name, runId, level: 'error', message: e.message, code: e.code, owner: e.owner }));
    const requestCount = https.reduce((n, h) => n + h.requestCount, 0);
    if (runId) {
      await finish(db, runId, lines, {
        status: 'failed', message: e.message, rowsWritten: 0, requestCount, started,
        failureOwner: e.owner, errorCode: e.code, meta: { ...e.detail },
      });
    }
    return { job: name, runId, status: 'failed', message: e.message, failureOwner: e.owner, durationMs: Date.now() - started };
  } finally {
    await release(db, name, holder);
  }
}

async function finish(db: Db, runId: string, lines: { level: Level; message: string; data?: Record<string, unknown>; at: Date }[], r: {
  status: string; message: string; rowsWritten: number; requestCount: number; started: number;
  meta: Record<string, unknown> | null; failureOwner?: FailureOwner; errorCode?: string;
}) {
  if (lines.length) await db.insert(runLogs).values(lines.map((l) => ({ runId, level: l.level, message: l.message, data: l.data ?? null, at: l.at })));
  await db.update(runs).set({
    status: r.status, message: r.message, rowsWritten: r.rowsWritten, requestCount: r.requestCount, meta: r.meta,
    failureOwner: r.failureOwner ?? null, errorCode: r.errorCode ?? null, finishedAt: new Date(), durationMs: Date.now() - r.started,
  }).where(eq(runs.id, runId));
}
