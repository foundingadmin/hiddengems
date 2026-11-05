// The slip in progress in the desktop rail (packages/facet/components/rail-slip.md). Same numbers as the
// certificate on Slips. Your own play changes here too: each leg opens its gem, the × removes it, and the stake
// field saves (./rail-slip-edit). A suggested play changes only through Change this slip. Renders nothing without
// a slip, which includes a database that has not run the slips update yet. The shell leaves it out on Slips.
import Link from 'next/link';
import { Unknown, money, stakeWords } from '@/app/slips/slip-parts';
import { ChangeSlip } from '@/app/slips/slip-controls';
import { RailLegLink, RailLegRow, RailStake } from '@/components/rail-slip-edit';
import { SlipKind } from '@/components/slip-kind';
import { READ_ONLY, READ_ONLY_REFUSAL } from '@/lib/db';
import { pct } from '@/lib/format';
import { getCurrentSlip } from '@/lib/slips';

export async function RailSlip() {
  const summary = await getCurrentSlip();
  if (!summary) return null;
  const { slip, pays, loseItAll } = summary;
  const n = slip.legs.length;
  const suggested = slip.play === 'suggested';
  const readOnly = READ_ONLY ? READ_ONLY_REFUSAL : undefined;
  const legs = slip.legs.map((l) => ({ selectionKey: l.selectionKey, name: l.name, price: l.price }));
  return (
    <section className="fc-railslip fc-card" aria-labelledby="rail-slip-h">
      <header className="fc-railslip-head">
        <h2 id="rail-slip-h" className="text-heading-14">Slip {slip.number}</h2>
        <span className="text-label-12"><SlipKind n={n} suggested={suggested} /></span>
      </header>
      <ul className="fc-railslip-list text-label-13">
        {legs.map((l) => suggested
          ? <RailLegLink key={l.selectionKey} leg={l} />
          : <RailLegRow key={l.selectionKey} slipId={slip.id} leg={l} readOnly={readOnly} />)}
      </ul>
      {suggested && <ChangeSlip slipId={slip.id} slipName={`Slip ${slip.number}`} />}
      <hr className="fc-separator" />
      <dl className="fc-railslip-list text-label-13">
        {suggested ? (
          slip.stake != null && pays != null && (
            <div className="fc-railslip-row"><dt>{stakeWords(slip.stake)} pays</dt><dd>{money(pays)}</dd></div>
          )
        ) : (
          <RailStake slipId={slip.id} stake={slip.stake} prices={legs.map((l) => l.price)} readOnly={readOnly} />
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
