// Graded slip (docs/build-brief.md; wireframes DesktopResult, Result): the result, profit, how the prices taken
// compare with the close, the play, and every leg. A win at a worse price is luck, so the note says so.
import './history.css';
import Link from 'next/link';
import type { HistoryLeg } from '@hiddengems/db';
import { Player } from '@/components/marks';
import { Tips } from '@/components/tips';
import { odds } from '@/lib/format';
import type { GradedSlip as Graded } from './history-data';
import { ClvDelta, Money, SlipResult, betWords, clvText, playWords, shortDate } from './history-parts';
import { BACK, Unknown, money } from './slip-parts';

const INFO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);

function scoredWords(scored: number, legs: number): string {
  if (legs === 1) return scored ? 'Scored' : 'No touchdown';
  if (scored === legs) return legs === 2 ? 'Both legs scored' : `All ${legs} legs scored`;
  if (!scored) return legs === 2 ? 'Neither leg scored' : 'No leg scored';
  return `${scored} of ${legs} legs scored`;
}

function LegResult({ leg }: { leg: HistoryLeg }) {
  if (leg.status === 'won') return <span className="fc-signal" data-signal="go">Scored</span>;
  if (leg.status === 'lost') return <span className="fc-signal" data-signal="stop">No TD</span>;
  if (leg.status === 'void' || leg.status === 'push') return <span className="fc-signal" data-signal="none">Void</span>;
  return <span className="fc-signal" data-signal="none">Pending</span>;
}

const price = (p: number | null) => (p != null ? odds(p) : <Unknown />);
const matchup = (l: HistoryLeg) => `${l.awayTeamId.toUpperCase()} @ ${l.homeTeamId.toUpperCase()}`;

export function GradedSlip({ graded, back }: { graded: Graded; back: string }) {
  const { slip, outcome, gradedAt } = graded;
  const title = slip.ofWeek > 1 ? `Week ${slip.week} slip ${slip.number}` : `Week ${slip.week} slip`;
  const bet = betWords(slip.stake, slip.legs.length);
  const settled = outcome.result !== 'pending';
  return (
    <div className="hg-history">
      <Tips />
      <div className="hg-history-head">
        <Link className="fc-button" data-variant="tertiary" data-size="small" href={back}>{BACK}History</Link>
        <div className="fc-page-header">
          <div className="fc-page-header-text">
            <h1 className="text-heading-32">{title}</h1>
            <p className="fc-page-header-description text-copy-16">
              {settled && gradedAt
                ? <>Graded <time className="fc-time" dateTime={gradedAt.toISOString()}>{shortDate(gradedAt)}</time> against the closing prices.</>
                : 'Graded against the closing prices once its games are final.'}
            </p>
          </div>
        </div>
      </div>

      <div className="fc-stat-strip" data-variant="cells" role="group" aria-label="Result">
        <div className="fc-stat">
          <p className="fc-stat-label">Result</p>
          <p className="fc-stat-value"><SlipResult result={outcome.result} /></p>
          {settled && <p className="fc-stat-basis">{scoredWords(outcome.scored, outcome.legs)}</p>}
        </div>
        <div className="fc-stat">
          <p className="fc-stat-label">Profit</p>
          <p className="fc-stat-value">{outcome.profit != null ? <Money value={outcome.profit} /> : <Unknown />}</p>
          <p className="fc-stat-basis">{outcome.returned != null ? `${bet} returned ${money(outcome.returned)}` : bet}</p>
        </div>
        <div className="fc-stat">
          <p className="fc-stat-label"><span className="fc-has-tip" tabIndex={0} data-tip="Your price against the fair closing price">Beat the close</span></p>
          <p className="fc-stat-value">{outcome.clv != null ? clvText(outcome.clv) : <Unknown />}</p>
          {outcome.legs > 1 && outcome.graded > 0 && (
            <p className="fc-stat-basis">{outcome.graded === outcome.legs ? `Average of ${outcome.legs} legs` : `Average of ${outcome.graded} of ${outcome.legs} legs`}</p>
          )}
        </div>
        <div className="fc-stat">
          <p className="fc-stat-label">Play</p>
          <p className="fc-stat-value">{playWords(slip.play)}</p>
          {slip.play === 'suggested' && <p className="fc-stat-basis">Placed as appraised</p>}
        </div>
      </div>

      <section className="hg-history-part" aria-labelledby="legs-h">
        <h2 id="legs-h" className="text-heading-20">Legs</h2>
        <div className="fc-table-wrap hg-desktop-only">
          <table className="fc-table">
            <caption className="fc-visually-hidden">Legs with the price taken, the closing price and the result</caption>
            <thead>
              <tr>
                <th scope="col" data-grow="">Pick</th>
                <th scope="col" data-align="numeric">Took</th>
                <th scope="col" data-align="numeric">Closed</th>
                <th scope="col" data-align="numeric"><span className="fc-has-tip" tabIndex={0} data-tip="Your price against the fair closing price">Beat close</span></th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {slip.legs.map((l) => (
                <tr key={l.selectionKey}>
                  <th scope="row">
                    <Player name={l.name} teamId={l.teamId} number={l.number} detail={l.position ? `${l.position} · ${matchup(l)}` : matchup(l)} />
                  </th>
                  <td data-align="numeric">{odds(l.price)}</td>
                  <td data-align="numeric">{price(l.closePrice)}</td>
                  <td data-align="numeric">{l.clv != null ? <ClvDelta clv={l.clv} /> : <Unknown />}</td>
                  <td className="hg-nowrap"><LegResult leg={l} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="fc-list hg-phone-only hg-history-list" role="list" aria-labelledby="legs-h">
          {slip.legs.map((l) => (
            <li key={l.selectionKey} className="fc-list-row">
              <div className="fc-list-row-main">
                <Player name={l.name} teamId={l.teamId} number={l.number} detail={<>Took {odds(l.price)} · closed {price(l.closePrice)}</>} />
              </div>
              <div className="fc-list-row-aside hg-history-aside">
                <LegResult leg={l} />
                {l.clv != null && <ClvDelta clv={l.clv} />}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="fc-note" role="note">{INFO}<span>A win at a worse price than the close is luck, and a loss at a better price is still a good read. History grades both.</span></div>
    </div>
  );
}

export function SlipNotFound({ back }: { back: string }) {
  return (
    <div className="fc-empty">
      <strong>No graded slip here</strong>
      <span className="text-copy-14">Only placed slips are graded.</span>
      <Link className="fc-link-action text-label-14" href={back}>Open history</Link>
    </div>
  );
}
