import './slips.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveWeek } from '@/lib/board';
import { weekSlip } from '@/lib/slips';
import { HistoryTab } from './history-tab';
import { SendToBook } from './send';
import { ThisWeek } from './this-week';

export const metadata: Metadata = { title: 'Slips' };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Slips: This week and History tabs (?tab=history); Send to DraftKings is ?view=send. The week rides along in ?week=. */
export default async function SlipsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { week } = await resolveWeek(sp.week);
  const weekParam = one(sp.week);
  const href = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ ...(weekParam ? { week: weekParam } : {}), ...extra });
    return q.size ? `/slips?${q}` : '/slips';
  };
  const history = one(sp.tab) === 'history';
  const summary = history ? null : await weekSlip(week);

  if (one(sp.view) === 'send') {
    if (!summary || !summary.slip.legs.length || summary.slip.state === 'placed') redirect(href());
    return <SendToBook summary={summary} back={href()} />;
  }

  return (
    <div className="hg-slips">
      <h1 className="fc-visually-hidden">Slips</h1>
      <nav className="fc-tabs" aria-label="Slips">
        <Link className="fc-tab" href={href()} aria-current={history ? undefined : 'page'}>This week</Link>
        <Link className="fc-tab" href={href({ tab: 'history' })} aria-current={history ? 'page' : undefined}>History</Link>
      </nav>
      {history
        ? <HistoryTab />
        : <ThisWeek summary={summary} sendHref={href({ view: 'send' })} jewelerReady={Boolean(process.env.ANTHROPIC_API_KEY)} />}
    </div>
  );
}
