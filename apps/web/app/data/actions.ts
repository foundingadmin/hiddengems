'use server';
import { jobs, providersFor, runJob, type RunResult } from '@hiddengems/ingest';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

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
  const handle = await db();
  const result = await runJob(job, {
    db: handle.db, providers: providersFor(), trigger: 'manual', force: true, registry: jobs, echo: true,
    spendCredits: job === 'pull-odds' && spendCredits === true,
  });
  revalidatePath('/');
  revalidatePath('/data');
  return [result, ...(result.followUps ?? [])].map(({ job: j, status, message }) => ({ job: j, status, message }));
}
