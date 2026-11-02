// Vercel cron calls GET /api/cron/<job> with "Authorization: Bearer $CRON_SECRET" (apps/web/vercel.json).
// Jobs decide for themselves whether work is due, so a cron firing every 5 minutes is cheap.
import { jobs, providersFor, runJob } from '@hiddengems/ingest';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { job } = await params;
  if (!jobs[job]) return NextResponse.json({ error: `Unknown job ${job}` }, { status: 404 });
  const handle = await db();
  const result = await runJob(job, { db: handle.db, providers: providersFor(), trigger: 'cron', registry: jobs, echo: true });
  return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 });
}
