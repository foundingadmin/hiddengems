// Slips, This week (docs/build-brief.md; wireframes DesktopSlip, Slip): the appraisal certificate with every leg,
// stake, pays, all hit and lose it all, and beside it the Jeweler's appraisal and one primary button, Send to
// DraftKings. A suggested play changes only through the confirmation dialog.
import Link from 'next/link';
import type { Reminder } from '@hiddengems/core';
import type { SlipSummary } from '@/lib/slips';
import { JEWELER } from '@/lib/features';
import { ago, dayTime, pct } from '@/lib/format';
import { EditableLegs, RemoveLeg } from './remove-leg';
import { ChangeSlip, StakeForm } from './slip-controls';
import { ALERT, ARROW, GEM, LINK, Leg, SHIELD, Unknown, money } from './slip-parts';

export const playName = (play: string) => (play === 'suggested' ? 'Suggested play' : 'Your own play');
export const legsName = (n: number) => (n === 1 ? 'Single' : `${n} leg parlay`);

function reminderText(r: Reminder, names: string[]): string {
  if (r.kind === 'short-price') return `${names[r.leg]} is priced under 2.50`;
  if (r.kind === 'multi-td') return `${names[r.leg]} needs 2 or more touchdowns`;
  return r.side === 'below' ? 'The stake is below your usual range' : 'The stake is above your usual range';
}

export function ThisWeek({ summary, sendHref, jewelerReady, now = new Date() }: {
  summary: SlipSummary | null; sendHref: string; jewelerReady: boolean; now?: Date;
}) {
  if (!summary || !summary.slip.legs.length) {
    return (
      <div className="fc-empty">
        <strong>No slip yet</strong>
        <span className="text-copy-14">Add gems from the board to start one. The slip shows what it pays and the chance of losing it all.</span>
        <Link className="fc-link-action text-label-14" href="/">Browse gems</Link>
      </div>
    );
  }
  const { slip, loseItAll, pays, reminders, sameGame } = summary;
  const name = `Slip ${slip.number}`;
  const placed = slip.state === 'placed';
  const suggested = slip.play === 'suggested';
  const editable = !placed && !suggested;
  const legs = slip.legs;
  const showBasis = legs.length > 1 && legs.length <= 4 && legs.every((l) => l.hitChance != null);

  return (
    <div className="hg-slip">
      <article className="fc-cert fc-card" aria-labelledby="cert-h">
        <header className="fc-cert-head">
          <p className="fc-cert-kicker text-label-12">Appraisal certificate</p>
          <h2 id="cert-h" className="text-heading-24">{name}</h2>
          <p className="fc-cert-meta text-copy-14">{playName(slip.play)} · {legsName(legs.length)}</p>
        </header>
        {editable ? (
          <EditableLegs>
            {legs.map((l, i) => (
              <Leg
                key={l.selectionKey} leg={l} index={i} sameGame={sameGame.has(l.gameId)}
                action={<RemoveLeg slipId={slip.id} selectionKey={l.selectionKey} name={l.name} />}
              />
            ))}
          </EditableLegs>
        ) : (
          <ul className="fc-legs">
            {legs.map((l, i) => <Leg key={l.selectionKey} leg={l} index={i} sameGame={sameGame.has(l.gameId)} />)}
          </ul>
        )}
        <div className="fc-stat-strip" role="group" aria-label="Stake and payout">
          <div className="fc-stat"><p className="fc-stat-label">Stake</p><p className="fc-stat-value">{slip.stake != null ? money(slip.stake) : <Unknown />}</p></div>
          <div className="fc-stat"><p className="fc-stat-label">Pays</p><p className="fc-stat-value">{pays != null ? money(pays) : <Unknown />}</p></div>
          <div className="fc-stat">
            <p className="fc-stat-label">All hit</p>
            <p className="fc-stat-value">{loseItAll.allHit != null ? pct(loseItAll.allHit) : <Unknown />}</p>
            {loseItAll.correlated
              ? <p className="fc-stat-basis">Correlated</p>
              : showBasis && <p className="fc-stat-basis">{legs.map((l) => pct(l.hitChance!)).join(' × ')}</p>}
          </div>
        </div>
        {loseItAll.correlated ? (
          <div className="fc-loseit" data-correlated>
            <span className="fc-loseit-label text-heading-16">Lose it all</span>
            <span className="fc-badge" data-variant="amber" data-size="lg" data-contrast="low">{LINK}Correlated</span>
            <p className="fc-loseit-note text-copy-13">Same game legs move together, so no chance is shown.</p>
          </div>
        ) : (
          <p className="fc-loseit">
            <span className="fc-loseit-label text-heading-16">Lose it all</span>
            <span className="fc-loseit-value text-heading-40">{loseItAll.value != null ? pct(loseItAll.value) : <Unknown />}</span>
          </p>
        )}
      </article>

      <div className="hg-slip-side">
        {!JEWELER ? null : slip.appraisal ? (
          <section className="fc-card hg-appraisal" aria-labelledby="appraisal-h">
            <h3 id="appraisal-h" className="text-heading-16 hg-appraisal-title">{GEM}The Jeweler&apos;s appraisal</h3>
            <p className="text-copy-14">{slip.appraisal}</p>
            <Link className="fc-link-action text-label-14" href="/jeweler">Ask a follow up</Link>
          </section>
        ) : !jewelerReady && !placed && (
          <p className="text-copy-14 hg-secondary">The Jeweler appraises slips once it is connected.</p>
        )}
        {editable && <StakeForm slipId={slip.id} stake={slip.stake} />}
        {!placed && reminders.length > 0 && (
          <div className="fc-note" data-type="warning" role="group" aria-label="Reminders">
            {ALERT}
            <ul className="hg-reminders">{reminders.map((r, i) => <li key={i}>{reminderText(r, legs.map((l) => l.name))}</li>)}</ul>
          </div>
        )}
        {placed ? (
          <p className="text-copy-14 hg-secondary">
            Placed <time className="fc-time" dateTime={slip.placedAt?.toISOString()}>{slip.placedAt ? dayTime(slip.placedAt, now) : ''}</time>. History grades it once its games are final.
          </p>
        ) : (
          <>
            {slip.state === 'sent' && slip.sentAt && (
              <p className="text-copy-14 hg-secondary">Sent <time dateTime={slip.sentAt.toISOString()} data-relative="">{ago(slip.sentAt, now)}</time>. Mark it placed once you tap Place Bet.</p>
            )}
            <Link className="fc-button" data-size="large" href={sendHref}>Send to DraftKings{ARROW}</Link>
            {suggested && <ChangeSlip slipId={slip.id} slipName={name} />}
          </>
        )}
        <div className="fc-note" data-type="info">{SHIELD}<span>Hidden Gems never places bets or touches your money. You place it in DraftKings.</span></div>
      </div>
    </div>
  );
}
