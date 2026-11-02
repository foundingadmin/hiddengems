'use server';
import { BOOTSTRAP, jobs, providersFor, runJob } from '@hiddengems/ingest';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

/** "Pull now": runs one job (or the whole bootstrap) immediately, ignoring cadence. */
export async function pullNow(form: FormData): Promise<void> {
  const name = String(form.get('job') ?? '');
  const list = name === 'all' ? [...BOOTSTRAP] : jobs[name] ? [name] : [];
  const handle = await db();
  for (const job of list) {
    await runJob(job, { db: handle.db, providers: providersFor(), trigger: 'manual', force: true, registry: jobs, echo: true });
  }
  revalidatePath('/');
  revalidatePath('/data');
}
