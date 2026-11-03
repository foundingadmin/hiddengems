// Send to DraftKings (docs/build-brief.md; wireframes DesktopHandoff, Handoff): three steps with Facet steps. The
// slip link only adds the picks; Josh sets the stake and taps Place Bet in DraftKings, then marks it placed here,
// which writes the bets History grades. The safety note never leaves the screen (docs/prd.md section 13).
import Link from 'next/link';
import type { SlipSummary } from '@/lib/slips';
import { MarkPlaced, OpenBook } from './slip-controls';
import { BACK, Leg, SHIELD, money, stakeWords } from './slip-parts';

/** Where to add picks by hand when no leg has a slip link. */
const DRAFTKINGS_NFL = 'https://sportsbook.draftkings.com/leagues/football/nfl';

function openLine(s: SlipSummary): string {
  const n = s.slip.legs.length;
  const { url, missing } = s.link;
  if (!url) return n === 1 ? 'DraftKings sent no slip link for this pick, so add it there by hand.' : 'DraftKings sent no slip link for these picks, so add them there by hand.';
  if (missing.length) {
    const names = missing.map((i) => s.slip.legs[i]!.name).join(' and ');
    return `${n - missing.length} of ${n} legs land in your DraftKings bet slip. Add ${names} there by hand.`;
  }
  const who = n === 1 ? 'Your pick lands' : n === 2 ? 'Both legs land' : `All ${n} legs land`;
  return `${who} in your DraftKings bet slip. The link only adds the picks.`;
}

function stakeLine(s: SlipSummary): string {
  const on = s.slip.legs.length === 1 ? 'on it' : 'on the parlay';
  const put = s.slip.stake != null ? `put ${stakeWords(s.slip.stake)} ${on}` : `set the stake ${on}`;
  return `In DraftKings, ${put}, check it and tap Place Bet. You choose singles or a parlay, and the stake, there.`;
}

export function SendToBook({ summary, back }: { summary: SlipSummary; back: string }) {
  const { slip, pays } = summary;
  const name = `Slip ${slip.number}`;
  const suggested = slip.play === 'suggested';
  const parlay = slip.legs.length > 1 ? 'parlay' : 'single';
  const note = <div className="fc-note" data-type="info">{SHIELD}<span>Hidden Gems never places bets or touches your money.</span></div>;
  return (
    <div className="hg-send">
      <Link className="fc-button hg-back" data-variant="tertiary" data-size="small" href={back}>{BACK}{name}</Link>
      <div className="fc-page-header"><div className="fc-page-header-text"><h1 className="text-heading-32">Send to DraftKings</h1></div></div>
      <div className="hg-slip">
        <div className="fc-stack hg-gap-6">
          <ol className="fc-steps">
            <li>
              <div className="fc-step-body">
                <h2 className="text-heading-16">Open your slip in DraftKings</h2>
                <p className="text-copy-14">{openLine(summary)}</p>
                <OpenBook slipId={slip.id} href={summary.link.url ?? DRAFTKINGS_NFL} label="Open DraftKings" />
              </div>
            </li>
            <li>
              <div className="fc-step-body">
                <h2 className="text-heading-16">Set the {parlay} and stake</h2>
                <p className="text-copy-14">{stakeLine(summary)}</p>
              </div>
            </li>
            <li>
              <div className="fc-step-body">
                <h2 className="text-heading-16">Mark it placed</h2>
                <p className="text-copy-14">So History can grade it against the closing price.</p>
                <MarkPlaced slipId={slip.id} suggested={suggested} needsStake={slip.stake == null} back={back} />
              </div>
            </li>
          </ol>
          <div className="hg-phone-only">{note}</div>
        </div>
        <aside className="fc-card hg-send-summary" aria-labelledby="send-slip-h">
          <div className="hg-send-head">
            <h2 id="send-slip-h" className="text-heading-16">{name}</h2>
            <span className="text-label-13 hg-secondary">{suggested ? 'Suggested' : 'Your own'} {parlay}</span>
          </div>
          <ul className="fc-legs">
            {slip.legs.map((l, i) => <Leg key={l.selectionKey} leg={l} index={i} showRating={false} showMatchup={false} />)}
          </ul>
          <hr className="fc-separator" />
          {slip.stake != null && pays != null && (
            <div className="hg-send-head text-label-14"><span className="hg-secondary">{stakeWords(slip.stake)} pays</span><span className="fc-num">{money(pays)}</span></div>
          )}
          {note}
        </aside>
      </div>
    </div>
  );
}
