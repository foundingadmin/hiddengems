// Slips, History (docs/build-brief.md; wireframes DesktopSlipHistory, SlipHistory): the season so far for placed
// slips, past slips (each opens its graded slip), what's working, and the results line over every graded gem
// (ROADMAP.md M1). Nothing here counts or rewards how much is bet (docs/prd.md section 13).
import './history.css';
import Link from 'next/link';
import { GRADE_BOX_LABELS, type GradeBox, GRADE_BOXES } from '@hiddengems/core';
import { Tips } from '@/components/tips';
import type { GradedSlip, History } from './history-data';
import { Money, SlipResult, betWords, clvText, playWords, slipName } from './history-parts';
import { Unknown, stakeWords } from './slip-parts';

const BOX_TIPS: Record<GradeBox, string> = {
  earned: 'Beat the close and scored',
  unlucky: 'Beat the close, no touchdown',
  lucky: 'Lost to the close, still scored',
  'wrong-read': 'Lost to the close, no touchdown',
};

const tip = (text: string, help: string) => <span className="fc-has-tip" tabIndex={0} data-tip={help}>{text}</span>;
const weeksText = (w: { first: number; last: number }) => (w.first === w.last ? `Week ${w.first}` : `Weeks ${w.first} to ${w.last}`);
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

function SeasonStats({ history }: { history: History }) {
  const s = history.season;
  return (
    <div className="fc-stat-strip" data-variant="cells" role="group" aria-label="Season so far">
      <div className="fc-stat">
        <p className="fc-stat-label">{tip('Beat the close', 'Your price against the fair closing price, on average')}</p>
        <p className="fc-stat-value">{s.averageClv != null ? clvText(s.averageClv) : <Unknown />}</p>
        {s.weeks && <p className="fc-stat-basis">{plural(s.legs, 'leg')}, {weeksText(s.weeks)}</p>}
      </div>
      <div className="fc-stat">
        <p className="fc-stat-label">Profit</p>
        <p className="fc-stat-value">{s.settled ? <Money value={s.profit} /> : <Unknown />}</p>
        {s.settled > 0 && <p className="fc-stat-basis">On {stakeWords(s.staked)} placed</p>}
      </div>
      <div className="fc-stat">
        <p className="fc-stat-label">Suggested plays</p>
        <p className="fc-stat-value">{s.suggested != null ? <Money value={s.suggested} /> : <Unknown />}</p>
        {s.own != null && <p className="fc-stat-basis">Your own plays <Money value={s.own} /></p>}
      </div>
      <div className="fc-stat">
        <p className="fc-stat-label">{tip('Wrong reads', 'Legs that lost to the close and did not score')}</p>
        <p className="fc-stat-value">{s.legs ? s.wrongReads : <Unknown />}</p>
        {s.legs > 0 && <p className="fc-stat-basis">Of {plural(s.legs, 'leg')}</p>}
      </div>
    </div>
  );
}

function PastSlips({ slips, slipHref }: { slips: GradedSlip[]; slipHref: (id: string) => string }) {
  const name = (g: GradedSlip) => slipName(g.slip.legs.map((l) => l.name));
  const profit = (g: GradedSlip) => (g.outcome.profit != null ? <Money value={g.outcome.profit} /> : <Unknown />);
  return (
    <section className="hg-history-part" aria-labelledby="past-h">
      <h2 id="past-h" className="text-heading-20">Past slips</h2>
      <div className="fc-table-wrap hg-desktop-only">
        <table className="fc-table">
          <caption className="fc-visually-hidden">Placed slips, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col" data-grow="">Slip</th>
              <th scope="col">Play</th>
              <th scope="col">Bet</th>
              <th scope="col">Result</th>
              <th scope="col" data-align="numeric">{tip('Beat close', 'Your price against the fair closing price')}</th>
              <th scope="col" data-align="numeric">Profit</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((g) => (
              <tr key={g.slip.id}>
                <td className="hg-nowrap">Week {g.slip.week}</td>
                <th scope="row"><Link className="fc-row-link" href={slipHref(g.slip.id)}>{name(g)}</Link></th>
                <td>{playWords(g.slip.play)}</td>
                <td className="hg-nowrap">{betWords(g.slip.stake, g.slip.legs.length)}</td>
                <td className="hg-nowrap"><SlipResult result={g.outcome.result} /></td>
                <td data-align="numeric">{g.outcome.clv != null ? clvText(g.outcome.clv) : <Unknown />}</td>
                <td data-align="numeric">{profit(g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="fc-list hg-phone-only hg-history-list" data-interactive="" data-aside="beside" role="list" aria-labelledby="past-h">
        {slips.map((g) => (
          <li key={g.slip.id} className="fc-list-row">
            <div className="fc-list-row-main">
              <p className="fc-list-row-title"><Link className="fc-row-link" href={slipHref(g.slip.id)}>{name(g)}</Link></p>
              <p className="fc-meta"><span>Week {g.slip.week}</span><span>{betWords(g.slip.stake, g.slip.legs.length)}</span></p>
            </div>
            <div className="fc-list-row-aside hg-history-aside">
              <span className="text-label-14">{profit(g)}</span>
              <SlipResult result={g.outcome.result} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GemResults({ history }: { history: History }) {
  const g = history.gems;
  return (
    <section className="hg-history-part" aria-labelledby="gems-h">
      <h2 id="gems-h" className="text-heading-20">Gem results</h2>
      {g.graded ? (
        <div className="fc-stat-strip hg-results" data-variant="cells" role="group" aria-labelledby="gems-h">
          <div className="fc-stat">
            <p className="fc-stat-label">Graded</p>
            <p className="fc-stat-value">{g.graded}</p>
            {g.weeks && <p className="fc-stat-basis">{weeksText(g.weeks)}</p>}
          </div>
          <div className="fc-stat">
            <p className="fc-stat-label">{tip('Beat the close', 'The price at the decision against the fair closing price, on average')}</p>
            <p className="fc-stat-value">{g.averageClv != null ? clvText(g.averageClv) : <Unknown />}</p>
          </div>
          {GRADE_BOXES.map((box) => (
            <div className="fc-stat" key={box}>
              <p className="fc-stat-label">{tip(GRADE_BOX_LABELS[box], BOX_TIPS[box])}</p>
              <p className="fc-stat-value">{g.boxes[box]}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="fc-empty">
          <strong>No graded gems yet</strong>
          <span className="text-copy-14">Every gem is graded against the close once its game is final.</span>
        </div>
      )}
    </section>
  );
}

export function HistoryTab({ history, slipHref }: { history: History; slipHref: (id: string) => string }) {
  if (!history.ready) {
    return (
      <div className="fc-empty">
        <strong>No history yet</strong>
        <span className="text-copy-14">Grading starts once the database update runs.</span>
      </div>
    );
  }
  return (
    <div className="hg-history">
      <Tips />
      {history.slips.length ? (
        <>
          <SeasonStats history={history} />
          <div className="hg-history-two">
            <PastSlips slips={history.slips} slipHref={slipHref} />
            <section className="hg-history-part" aria-labelledby="work-h">
              <h2 id="work-h" className="text-heading-20">What&apos;s working</h2>
              <div className="fc-empty">
                <span className="text-copy-14">Legs that scored, grouped by the note behind them, once gems carry notes.</span>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="fc-empty">
          <strong>No graded slips yet</strong>
          <span className="text-copy-14">Placed slips show here with their results once their games are final.</span>
        </div>
      )}
      <GemResults history={history} />
    </div>
  );
}
