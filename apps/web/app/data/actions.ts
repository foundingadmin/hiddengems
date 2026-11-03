'use server';
import { jobs, providersFor, runJob, type RunResult } from '@hiddengems/ingest';
import { jobSettings } from '@hiddengems/db';
import { revalidatePath } from 'next/cache';
import { db, READ_ONLY, READ_ONLY_MESSAGE } from '@/lib/db';

export interface PullOutcome {
  job: string;
  status: RunResult['status'];
  message: string;
}

/**
 * "Pull now": runs one job immediately, ignoring its cadence, and returns what happened (with the jobs
 * it set off). Data health calls it once per job, so each row can show its own progress and no single
 * request runs every pull. `spendCredits` lets a confirmed odds pull use paid credits off schedule.
 */
export async function pull(job: string, spendCredits = false): Promise<PullOutcome[]> {
  if (!jobs[job]) throw new Error(`Unknown job ${job}`);
  if (READ_ONLY) return [{ job, status: 'skipped', message: READ_ONLY_MESSAGE }];
  const handle = await db();
  const result = await runJob(job, {
    db: handle.db, providers: providersFor(), trigger: 'manual', force: true, registry: jobs, echo: true,
    spendCredits: job === 'pull-odds' && spendCredits === true,
  });
  revalidatePath('/');
  revalidatePath('/data');
  return [result, ...(result.followUps ?? [])].map(({ job: j, status, message }) => ({ job: j, status, message }));
}

/** Pause or resume a source's scheduled runs. Pull now keeps working either way. */
export async function setPaused(job: string, paused: boolean): Promise<void> {
  if (!jobs[job]) throw new Error(`Unknown job ${job}`);
  if (READ_ONLY) return;
  const handle = await db();
  await handle.db.insert(jobSettings).values({ job, paused, pausedAt: paused ? new Date() : null, updatedAt: new Date() })
    .onConflictDoUpdate({ target: jobSettings.job, set: { paused, pausedAt: paused ? new Date() : null, updatedAt: new Date() } });
  revalidatePath('/data');
}
