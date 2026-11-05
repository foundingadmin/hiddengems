'use client';
// The slip's controls: change the suggested play (components/change-slip-dialog.tsx), the stake, opening the
// sportsbook link and marking the slip placed. Removing a leg is ./remove-leg. Every write is a server action in
// ./actions.
import { useRouter } from 'next/navigation';
import { type ReactNode, useActionState, useEffect, useRef, useState } from 'react';
import { ChangeSlipDialog } from '@/components/change-slip-dialog';
import { useMoments } from '@/lib/moments/provider';
import { sendMoment } from '@/lib/moments/send';
import { type ActionState, markPlaced, markSent, setStake } from './actions';

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const OUT = svg(<><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>);
const CHECK = svg(<path d="M20 6 9 17l-5-5" />);

function Problem({ state }: { state: ActionState }) {
  if (!state || state.ok || !state.error) return null;
  return <p className="fc-helper" data-type="error" role="alert">{state.error}</p>;
}

/** "Change this slip": a quiet text link that opens the confirmation. Keep suggested play is primary and focused. */
export function ChangeSlip({ slipId, slipName }: { slipId: string; slipName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="fc-link-quiet text-label-13" aria-haspopup="dialog" onClick={() => setOpen(true)}>Change this slip</button>
      {open && <ChangeSlipDialog slipId={slipId} slipName={slipName} onClose={() => setOpen(false)} />}
    </>
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

/**
 * Opens the book's slip in a new tab; the link only adds the picks. This is the send: it marks the slip sent, and
 * the slip card dissolves into the Send moment (lib/moments/send.ts), which nothing waits on.
 */
export function OpenBook({ slipId, href, label }: { slipId: string; href: string; label: string }) {
  const moments = useMoments();
  const link = useRef<HTMLAnchorElement>(null);
  const playing = useRef<AbortController | null>(null);
  useEffect(() => () => playing.current?.abort(), []);
  const send = () => {
    void markSent(slipId);
    const self = link.current;
    if (!self || playing.current) return;
    // The slip card beside the steps; on a phone, where the card is not shown, the button itself.
    const card = self.closest('.hg-send')?.querySelector('.hg-send-summary');
    const from = card && card.getBoundingClientRect().width > 0 ? card : self;
    const stop = (playing.current = new AbortController());
    void sendMoment(moments.stage(), from, stop.signal).finally(() => { if (playing.current === stop) playing.current = null; });
  };
  return (
    <a ref={link} className="fc-button" data-variant="secondary" href={href} target="_blank" rel="noopener noreferrer" onClick={send}>
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
