'use client';
// Add / On slip for a gem (the Gems table's last column, the phone row, the gem sheet's footer). The page wraps the
// board in SlipProvider with the slip in progress; every row, card and button reads it from useSlip(). Fool's Gold
// gets no button (docs/build-brief.md). The label says the state, so the button carries no aria-pressed. On a
// suggested play the change dialog comes first, then the add or remove runs.
// State first (packages/facet/patterns/moments.md): the gem shows on the slip at once, the action runs, and the
// Slips nav item glints (lib/moments/add.ts). A failed action puts the state back and says why in a toast, since a
// table cell has no room for a sentence. A read-only preview says it cannot save before anything moves.
import { type ReactNode, createContext, useContext, useOptimistic, useState, useTransition } from 'react';
import { addLeg, removeLeg } from '@/app/slips/actions';
import { ChangeSlipDialog } from '@/components/change-slip-dialog';
import { glintSlips } from '@/lib/moments/add';
import { useMoments } from '@/lib/moments/provider';

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CHECK = svg(<path d="M20 6 9 17l-5-5" />);
const PLUS = svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>);

/** The slip in progress as the board needs it: its id, name, whether it is the suggested play, and its gems. */
export interface SlipRef { id: string; name: string; suggested: boolean; keys: string[] }

interface SlipState {
  slip: SlipRef | null;
  /** Set on a preview that reads production: why it cannot save. */
  readOnly?: string;
  /** On the slip, including an add or remove still in flight. */
  has(key: string): boolean;
  /** Shows key on or off the slip until the action it is called in settles. Call inside a transition. */
  mark(key: string, on: boolean): void;
}

const SlipContext = createContext<SlipState>({ slip: null, has: () => false, mark: () => {} });

export function SlipProvider({ slip, readOnly, children }: { slip: SlipRef | null; readOnly?: string; children: ReactNode }) {
  const [keys, mark] = useOptimistic(slip?.keys ?? [], (now: string[], m: { key: string; on: boolean }) =>
    (m.on ? (now.includes(m.key) ? now : [...now, m.key]) : now.filter((k) => k !== m.key)));
  const state: SlipState = { slip, readOnly, has: (key) => keys.includes(key), mark: (key, on) => mark({ key, on }) };
  return <SlipContext.Provider value={state}>{children}</SlipContext.Provider>;
}

export function useSlip(): SlipState {
  return useContext(SlipContext);
}

/** row: the table's last column. icon: the phone row, a square button. sheet: the gem sheet's header, primary. */
export type AddToSlipPlace = 'row' | 'icon' | 'sheet';

export function AddToSlip({ selectionKey, name, place = 'row' }: { selectionKey: string; name: string; place?: AddToSlipPlace }) {
  const { slip, readOnly, has, mark } = useSlip();
  const moments = useMoments();
  const onSlip = has(selectionKey);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const toggle = (confirmed = false) => {
    if (readOnly) { moments.toast(readOnly); return; }
    if (slip?.suggested && !confirmed) { setConfirming(slip.id); return; }
    const adding = !onSlip;
    start(async () => {
      mark(selectionKey, adding);
      // Removing from the board plays no dots.
      const glint = new AbortController();
      if (adding) void glintSlips(moments.stage(), glint.signal);
      try {
        const r = adding ? await addLeg(selectionKey) : slip ? await removeLeg(slip.id, selectionKey) : null;
        if (r?.ok) {
          moments.announce(adding ? `${name} added to the slip` : `${name} removed from the slip`);
          return;
        }
        glint.abort();
        if (r?.confirm === 'change' && r.slipId) { setConfirming(r.slipId); return; }
        if (r?.error) moments.toast(r.error);
      } catch {
        glint.abort();
        moments.toast(adding ? 'Couldn’t add it. Try again.' : 'Couldn’t remove it. Try again.');
      }
    });
  };
  // In the sheet, adding is the primary action; once on the slip it steps back to secondary.
  const variant = place === 'sheet' ? (onSlip ? 'secondary' : undefined) : onSlip ? 'tertiary' : 'secondary';
  return (
    <span className={`fc-stack hg-gap-2 hg-end${place === 'row' ? ' fc-row-action' : ''}`}>
      {place === 'icon' ? (
        <button
          type="button" className="fc-button" data-variant={variant} data-size="small" data-shape="square"
          aria-label={onSlip ? `Remove ${name} from slip` : `Add ${name} to slip`} disabled={pending} onClick={() => toggle()}
        >
          {onSlip ? CHECK : PLUS}
        </button>
      ) : (
        <button type="button" className="fc-button" data-variant={variant} data-size="small" disabled={pending} onClick={() => toggle()}>
          {onSlip ? CHECK : PLUS}{onSlip ? 'On slip' : place === 'sheet' ? 'Add to slip' : 'Add'}
          <span className="fc-visually-hidden">{onSlip ? `. Remove ${name} from slip` : `, ${name}`}</span>
        </button>
      )}
      {confirming && (
        <ChangeSlipDialog
          slipId={confirming} slipName={slip?.name ?? 'this slip'}
          onClose={(changed) => { setConfirming(null); if (changed) toggle(true); }}
        />
      )}
    </span>
  );
}

/** The button for a board row or the gem sheet: none for Fool's Gold, nor once its game kicked off unless it is on the slip. */
export function SlipButton({ row, place }: { row: { key: string; name: string; kind: string; started: boolean }; place?: AddToSlipPlace }) {
  const { has } = useSlip();
  if (row.kind !== 'gem' || (row.started && !has(row.key))) return null;
  return <AddToSlip selectionKey={row.key} name={row.name} place={place} />;
}
