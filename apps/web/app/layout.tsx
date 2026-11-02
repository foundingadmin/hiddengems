import '@foundingcreative/facet/css/facet.css';
import '@foundingcreative/facet/kits/nfl/teams.css';
import './app.css';
import { runs } from '@hiddengems/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Shell } from '@/components/shell';
import { db } from '@/lib/db';
import { ago, clock } from '@/lib/format';

export const metadata: Metadata = {
  title: { default: 'Hidden Gems', template: '%s · Hidden Gems' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/** Rail foot: when odds were last pulled, a status dot plus relative time, and the way into data health. */
async function Freshness() {
  const { db: d } = await db();
  const [last] = await d.select({ at: runs.finishedAt }).from(runs)
    .where(and(eq(runs.job, 'pull-odds'), inArray(runs.status, ['succeeded', 'warned']))).orderBy(desc(runs.startedAt)).limit(1);
  const now = new Date();
  const state = !last?.at ? 'queued' : now.getTime() - last.at.getTime() < 6 * 3_600_000 ? 'live' : 'stale';
  return (
    <Link className="fc-status hg-foot-link" href="/data">
      <span className="fc-status-dot" data-state={state} aria-hidden="true" />
      {last?.at
        ? <span>Odds pulled <time dateTime={last.at.toISOString()} title={clock(last.at)} data-relative>{ago(last.at, now).replace(/^Just now$/, 'just now')}</time></span>
        : <span>No odds pulled yet</span>}
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="fc-visually-hidden" href="#main">Skip to content</a>
        <Shell foot={<Freshness />}>{children}</Shell>
      </body>
    </html>
  );
}
