'use client';
// Add / On slip for a gem (the Gems table's last column, the phone row, the gem sheet's footer). Pair it with
// getCurrentSlip() from lib/slips: pass the slip's id and name and whether this gem is on it. Fool's Gold gets no
// button (docs/build-brief.md). The label says the state, so the button carries no aria-pressed. On a suggested
// play the change dialog comes first, then the add or remove runs again.
import { useState, useTransition } from 'react';
import { addLeg, removeLeg } from '@/app/slips/actions';
import { ChangeSlipDialog } from '@/components/change-slip-dialog';

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CHECK = svg(<path d="M20 6 9 17l-5-5" />);
const PLUS = svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>);

/** row: the table's last column. icon: the phone row, a square button. footer: the gem sheet, primary. */
export type AddToSlipPlace = 'row' | 'icon' | 'footer';

export function AddToSlip({ selectionKey, name, slipId, slipName, onSlip, place = 'row' }: {
  selectionKey: string; name: string; slipId: string | null; slipName?: string; onSlip: boolean; place?: AddToSlipPlace;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const toggle = () => start(async () => {
    const r = onSlip && slipId ? await removeLeg(slipId, selectionKey) : await addLeg(selectionKey);
    if (r?.confirm === 'change' && r.slipId) { setError(null); setConfirming(r.slipId); return; }
    setError(r?.ok ? null : (r?.error ?? null));
  });
  const variant = place === 'footer' ? undefined : onSlip ? 'tertiary' : 'secondary';
  return (
    <span className={`fc-stack hg-gap-2 hg-end${place === 'row' ? ' fc-row-action' : ''}`}>
      {place === 'icon' ? (
        <button
          type="button" className="fc-button" data-variant={variant} data-size="small" data-shape="square"
          aria-label={onSlip ? `Remove ${name} from slip` : `Add ${name} to slip`} disabled={pending} onClick={toggle}
        >
          {onSlip ? CHECK : PLUS}
        </button>
      ) : (
        <button type="button" className="fc-button" data-variant={variant} data-size="small" disabled={pending} onClick={toggle}>
          {onSlip ? CHECK : PLUS}{onSlip ? 'On slip' : place === 'footer' ? 'Add to slip' : 'Add'}
          <span className="fc-visually-hidden">{onSlip ? `. Remove ${name} from slip` : `, ${name}`}</span>
        </button>
      )}
      {error && <span className="fc-helper" data-type="error" role="alert">{error}</span>}
      {confirming && (
        <ChangeSlipDialog
          slipId={confirming} slipName={slipName ?? 'this slip'}
          onClose={(changed) => { setConfirming(null); if (changed) toggle(); }}
        />
      )}
    </span>
  );
}

/** The slip in progress as the board needs it: its id and the gems on it. */
export interface SlipRef { id: string; name: string; keys: string[] }

/** The button for a board row or the gem sheet: none for Fool's Gold, nor once its game kicked off unless it is on the slip. */
export function SlipButton({ row, slip, place }: {
  row: { key: string; name: string; kind: string; started: boolean }; slip: SlipRef | null; place?: AddToSlipPlace;
}) {
  const onSlip = !!slip?.keys.includes(row.key);
  if (row.kind !== 'gem' || (row.started && !onSlip)) return null;
  return <AddToSlip selectionKey={row.key} name={row.name} slipId={slip?.id ?? null} slipName={slip?.name} onSlip={onSlip} place={place} />;
}
