'use client';
// The slip's controls: change the suggested play (a confirmation modal), the stake, removing a leg, opening the
// sportsbook link and marking the slip placed. Every write is a server action in ./actions.
import { useRouter } from 'next/navigation';
import { type ReactNode, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { type ActionState, changeSlip, markPlaced, markSent, removeLeg, setStake } from './actions';

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const X = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const OUT = svg(<><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>);
const CHECK = svg(<path d="M20 6 9 17l-5-5" />);

function Problem({ state }: { state: ActionState }) {
  if (!state || state.ok || !state.error) return null;
  return <p className="fc-helper" data-type="error" role="alert">{state.error}</p>;
}

/** "Change this slip": a quiet text link that opens the confirmation. Keep suggested play is primary and focused. */
export function ChangeSlip({ slipId, slipName }: { slipId: string; slipName: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<ActionState>(null);
  return (
    <>
      <button type="button" className="fc-link-quiet text-label-13" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>Change this slip</button>
      <dialog ref={ref} className="fc-modal" aria-labelledby="change-h" onClose={() => setError(null)}>
        <div className="fc-modal-body">
          <h2 id="change-h" className="text-heading-20">Change the suggested play?</h2>
          <p className="text-copy-14">Hidden Gems built {slipName} as the best way to play this week&apos;s gems. If you change it</p>
          <ul className="text-copy-14">
            <li>The Jeweler&apos;s appraisal no longer covers what you place</li>
            <li>History tracks it as your own play, so you can see whether it beat the suggestion</li>
          </ul>
          <Problem state={error} />
        </div>
        <div className="fc-modal-actions">
          <button
            type="button" className="fc-button" data-variant="secondary" data-size="small" disabled={pending}
            onClick={() => start(async () => {
              const r = await changeSlip(slipId);
              if (r?.ok) ref.current?.close(); else setError(r);
            })}
          >Change slip</button>
          <button type="button" className="fc-button" data-size="small" autoFocus onClick={() => ref.current?.close()}>Keep suggested play</button>
        </div>
      </dialog>
    </>
  );
}

export function RemoveLeg({ slipId, selectionKey, name }: { slipId: string; selectionKey: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button" className="fc-button fc-leg-action" data-variant="tertiary" data-size="tiny" data-shape="square"
      aria-label={`Remove ${name}`} disabled={pending} onClick={() => start(async () => { await removeLeg(slipId, selectionKey); })}
    >{X}</button>
  );
}

/** The stake, for a slip you are building. */
export function StakeForm({ slipId, stake }: { slipId: string; stake: number | null }) {
  const [state, action, pending] = useActionState(setStake, null);
  return (
    <form action={action} className="hg-stake">
      <input type="hidden" name="slipId" value={slipId} />
      <label className="fc-label text-label-13" htmlFor="stake">Stake</label>
      <div className="fc-row">
        <div className="fc-input-group" data-width="short">
          <span className="fc-input-affix" aria-hidden="true">$</span>
          <input
            id="stake" name="stake" className="fc-input fc-num" inputMode="decimal" autoComplete="off" spellCheck={false}
            defaultValue={state?.ok === false ? state.value : stake == null ? '' : stake.toFixed(2)} placeholder="15.00" aria-invalid={state?.ok === false || undefined}
            aria-describedby={state?.ok === false ? 'stake-error' : undefined}
          />
        </div>
        <button type="submit" className="fc-button" data-variant="secondary" disabled={pending}>Save</button>
      </div>
      {state?.ok === false && <p id="stake-error" className="fc-helper" data-type="error" role="alert">{state.error}</p>}
    </form>
  );
}

/** Opens the book's slip in a new tab; the link only adds the picks. Marks the slip sent. */
export function OpenBook({ slipId, href, label }: { slipId: string; href: string; label: string }) {
  return (
    <a className="fc-button" data-variant="secondary" href={href} target="_blank" rel="noopener noreferrer" onClick={() => { void markSent(slipId); }}>
      {label}{OUT}
    </a>
  );
}

/**
 * Mark it placed: as suggested or as something else for a suggested play, or simply placed for your own play.
 * Asks for the stake here when the slip has none. Placing writes one bet per leg, which feeds History.
 */
export function MarkPlaced({ slipId, suggested, needsStake, back }: { slipId: string; suggested: boolean; needsStake: boolean; back: string }) {
  const [state, action, pending] = useActionState(markPlaced, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.push(back); }, [state, router, back]);
  return (
    <form action={action} className="fc-stack hg-gap-3">
      <input type="hidden" name="slipId" value={slipId} />
      {needsStake && (
        <div className="hg-stake">
          <label className="fc-label text-label-13" htmlFor="placed-stake">Stake you placed</label>
          <div className="fc-input-group" data-width="short">
            <span className="fc-input-affix" aria-hidden="true">$</span>
            <input
              id="placed-stake" name="stake" className="fc-input fc-num" inputMode="decimal" autoComplete="off" required placeholder="15.00"
              defaultValue={state?.ok === false ? state.value : undefined}
            />
          </div>
        </div>
      )}
      <div className="fc-row hg-wrap">
        <button type="submit" name="as" value="slip" className="fc-button" data-variant="secondary" disabled={pending}>
          {CHECK}{suggested ? 'Placed as suggested' : 'Placed this slip'}
        </button>
        {suggested && <button type="submit" name="as" value="other" className="fc-button" data-variant="tertiary" disabled={pending}>Placed something else</button>}
      </div>
      <Problem state={state} />
    </form>
  );
}
