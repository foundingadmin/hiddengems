import { dataMode } from '@hiddengems/ingest';
import { Freshness } from '@/components/freshness';
import { AllGems, NewGems } from '@/components/gems-board';
import { Tips } from '@/components/tips';
import { board, resolveWeek } from '@/lib/board';
import { ZONE, clock } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function GemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { week } = await resolveWeek((await searchParams).week);
  const { rows, lastRead } = await board(week);
  const fresh = rows.filter((r) => r.fresh);
  return (
    <>
      <h1 className="fc-visually-hidden">Gems{week != null ? `, week ${week}` : ''}</h1>
      {dataMode() === 'sample' && (
        <div className="fc-note" data-size="small">
          <span>{process.env.VERCEL_ENV === 'preview' ? 'Sample data.' : 'Sample data. Add ODDS_API_KEY to pull live odds.'}</span>
        </div>
      )}
      <NewGems rows={fresh} since={lastRead ? clock(lastRead) : null} zone={ZONE} />
      <AllGems rows={rows} zone={ZONE} freshness={<Freshness label="Odds updated" short />} />
      <Tips />
    </>
  );
}
