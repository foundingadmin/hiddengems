import { dataMode } from '@hiddengems/ingest';
import { READ_ONLY, READ_ONLY_MESSAGE, READ_ONLY_REFUSAL } from '@/lib/db';
import { Freshness } from '@/components/freshness';
import { SlipProvider } from '@/components/add-to-slip';
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
  const slip = current ? {
    id: current.slip.id, name: `Slip ${current.slip.number}`, suggested: current.slip.play === 'suggested',
    keys: current.slip.legs.map((l) => l.selectionKey),
  } : null;
  return (
    <>
      <h1 className="fc-visually-hidden">Gems{week != null ? `, week ${week}` : ''}</h1>
      {READ_ONLY ? (
        <div className="fc-note" data-size="small"><span>{READ_ONLY_MESSAGE}.</span></div>
      ) : dataMode() === 'sample' && (
        <div className="fc-note" data-size="small">
          <span>{process.env.VERCEL_ENV === 'preview' ? 'Sample data.' : 'Sample data. Add ODDS_API_KEY to pull live odds.'}</span>
        </div>
      )}
      <SlipProvider slip={slip} readOnly={READ_ONLY ? READ_ONLY_REFUSAL : undefined}>
        <NewGems rows={fresh} since={lastRead ? clock(lastRead) : null} zone={ZONE} />
        <AllGems rows={rows} zone={ZONE} freshness={<Freshness label="Odds updated" short />} />
        <GemSheet rows={rows} detail={detail} asked={asked} zone={ZONE} />
      </SlipProvider>
      <Tips />
    </>
  );
}
