'use client';
// The Change slip confirmation: a suggested play becomes your own play only once this is confirmed. Opens when
// mounted; onClose(changed) runs once it closes, with changed true after Change slip went through. Used by Change
// this slip on Slips and by Add / On slip when the slip is a suggested play.
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { type ActionState, changeSlip } from '@/app/slips/actions';
import { JEWELER } from '@/lib/features';

export function ChangeSlipDialog({ slipId, slipName, onClose }: { slipId: string; slipName: string; onClose: (changed: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const changed = useRef(false);
  const heading = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<ActionState>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="fc-modal" aria-labelledby={heading} onClose={() => onClose(changed.current)}>
      <div className="fc-modal-body">
        <h2 id={heading} className="text-heading-20">Change the suggested play?</h2>
        <p className="text-copy-14">Hidden Gems built {slipName} as the best way to play this week&apos;s gems. If you change it</p>
        <ul className="text-copy-14">
          {JEWELER && <li>The Jeweler&apos;s appraisal no longer covers what you place</li>}
          <li>History tracks it as your own play, so you can see whether it beat the suggestion</li>
        </ul>
        {error && !error.ok && error.error && <p className="fc-helper" data-type="error" role="alert">{error.error}</p>}
      </div>
      <div className="fc-modal-actions">
        <button
          type="button" className="fc-button" data-variant="secondary" data-size="small" disabled={pending}
          onClick={() => start(async () => {
            const r = await changeSlip(slipId);
            if (r?.ok) { changed.current = true; ref.current?.close(); } else setError(r);
          })}
        >Change slip</button>
        <button type="button" className="fc-button" data-size="small" autoFocus onClick={() => ref.current?.close()}>Keep suggested play</button>
      </div>
    </dialog>
  );
}
