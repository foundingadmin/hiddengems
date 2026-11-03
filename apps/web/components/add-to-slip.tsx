'use client';
// Add / On slip for a gem (the Gems table's last column, the gem sheet's footer). Pair it with getCurrentSlip()
// from lib/slips: pass the slip's id and whether this gem is on it. Fool's Gold gets no button (docs/build-brief.md).
import { useState, useTransition } from 'react';
import { addLeg, removeLeg } from '@/app/slips/actions';

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

export function AddToSlip({ selectionKey, name, slipId, onSlip, size = 'small' }: {
  selectionKey: string; name: string; slipId: string | null; onSlip: boolean; size?: 'small' | 'medium';
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toggle = () => start(async () => {
    const r = onSlip && slipId ? await removeLeg(slipId, selectionKey) : await addLeg(selectionKey);
    setError(r?.ok ? null : (r?.error ?? null));
  });
  return (
    <span className="fc-stack hg-gap-2">
      <button
        type="button" className="fc-button" data-variant={onSlip ? 'secondary' : 'tertiary'} data-size={size} aria-pressed={onSlip}
        disabled={pending} onClick={toggle}
      >
        {onSlip && CHECK}{onSlip ? 'On slip' : 'Add'}<span className="fc-visually-hidden">, {name}</span>
      </button>
      {error && <span className="fc-helper" data-type="error" role="alert">{error}</span>}
    </span>
  );
}
