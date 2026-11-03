// The slip in progress in the desktop rail, above Ask the Jeweler (packages/facet/components/rail-slip.md). Same
// numbers as the certificate on Slips. Renders nothing without a slip, which includes a database that has not
// run the slips update yet. The shell leaves it out on the Slips pages.
import Link from 'next/link';
import { Unknown, money, stakeWords } from '@/app/slips/slip-parts';
import { pct } from '@/lib/format';
import { getCurrentSlip } from '@/lib/slips';

export async function RailSlip() {
  const summary = await getCurrentSlip();
  if (!summary) return null;
  const { slip, pays, loseItAll } = summary;
  const n = slip.legs.length;
  // As the certificate names it: "Suggested parlay", or for your own play "Single", "3 leg parlay".
  const kind = slip.play === 'suggested' ? `Suggested ${n === 1 ? 'single' : 'parlay'}` : n === 1 ? 'Single' : `${n} leg parlay`;
  return (
    <section className="fc-railslip fc-card" aria-labelledby="rail-slip-h">
      <header className="fc-railslip-head">
        <h2 id="rail-slip-h" className="text-heading-14">Slip {slip.number}</h2>
        <span className="text-label-12">{kind}</span>
      </header>
      <ul className="fc-railslip-list text-label-13">
        {slip.legs.map((l) => <li key={l.selectionKey} className="fc-railslip-row"><span>{l.name}</span><span>{l.price.toFixed(2)}</span></li>)}
      </ul>
      <hr className="fc-separator" />
      <dl className="fc-railslip-list text-label-13">
        {slip.stake != null && pays != null && (
          <div className="fc-railslip-row"><dt>{stakeWords(slip.stake)} pays</dt><dd>{money(pays)}</dd></div>
        )}
        <div className="fc-railslip-row">
          <dt>Lose it all</dt>
          <dd>{loseItAll.correlated ? 'Correlated' : loseItAll.value != null ? pct(loseItAll.value) : <Unknown />}</dd>
        </div>
      </dl>
      <Link className="fc-button" data-size="small" href="/slips">Review slip</Link>
    </section>
  );
}
