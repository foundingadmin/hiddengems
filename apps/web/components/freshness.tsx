// Freshness: when odds were last pulled, a status dot plus relative time with the exact time on hover,
// linking to data health. Live within 6 hours, stale after (core freshnessState()).
import { freshnessState } from '@hiddengems/core';
import { runs } from '@hiddengems/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ago, clock } from '@/lib/format';

export async function Freshness({ label, short }: { label: string; short?: boolean }) {
  const { db: d } = await db();
  const [last] = await d.select({ at: runs.finishedAt }).from(runs)
    .where(and(eq(runs.job, 'pull-odds'), inArray(runs.status, ['succeeded', 'warned']))).orderBy(desc(runs.startedAt)).limit(1);
  const now = new Date();
  const state = freshnessState(last?.at, now);
  const when = last?.at ? ago(last.at, now) : null;
  return (
    <Link className="fc-status hg-foot-link" href="/data">
      <span className="fc-status-dot" data-state={state} aria-hidden="true" />
      {last?.at && when
        ? <span><span className={short ? 'hg-desktop-only' : undefined}>{label} </span><time dateTime={last.at.toISOString()} title={clock(last.at)} data-relative><span className={short ? 'hg-desktop-only' : undefined}>{when.replace(/^Just now$/, 'just now')}</span>{short && <span className="hg-phone-only">{when}</span>}</time></span>
        : <span>No odds pulled yet</span>}
    </Link>
  );
}
