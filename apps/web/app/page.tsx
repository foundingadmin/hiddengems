import { dataMode } from '@hiddengems/ingest';
import { Freshness } from '@/components/freshness';
import { GemSheet } from '@/components/gem-sheet';
import { AllGems, NewGems } from '@/components/gems-board';
import { Tips } from '@/components/tips';
import { board, resolveWeek } from '@/lib/board';
import { ZONE, clock } from '@/lib/format';
import { gemDetail } from '@/lib/gem';
import { getCurrentSlip } from '@/lib/slips';

export const dynamic = 'force-dynamic';

export default async function GemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { week } = await resolveWeek(params.week);
  const asked = typeof params.gem === 'string' && params.gem ? params.gem : null;
  const [{ rows, lastRead }, detail, current] = await Promise.all([board(week), asked ? gemDetail(asked) : null, getCurrentSlip(week)]);
  const fresh = rows.filter((r) => r.fresh);
  const slip = current ? { id: current.slip.id, name: `Slip ${current.slip.number}`, keys: current.slip.legs.map((l) => l.selectionKey) } : null;
  return (
    <>
      <h1 className="fc-visually-hidden">Gems{week != null ? `, week ${week}` : ''}</h1>
      {dataMode() === 'sample' && (
        <div className="fc-note" data-size="small">
          <span>{process.env.VERCEL_ENV === 'preview' ? 'Sample data.' : 'Sample data. Add ODDS_API_KEY to pull live odds.'}</span>
        </div>
      )}
      <NewGems rows={fresh} since={lastRead ? clock(lastRead) : null} zone={ZONE} />
      <AllGems rows={rows} zone={ZONE} freshness={<Freshness label="Odds updated" short />} slip={slip} />
      <GemSheet rows={rows} detail={detail} asked={asked} zone={ZONE} slip={slip} />
      <Tips />
    </>
  );
}
