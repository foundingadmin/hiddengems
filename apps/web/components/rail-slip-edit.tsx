'use client';
// Changing the slip from the rail (packages/facet/components/rail-slip.md, Editing): each leg opens its gem, the ×
// removes it with the remove moment and Undo (the same as on Slips), and the stake field shows what it pays as you
// type and saves on Enter or when focus leaves. A refused or failed change says why in a toast.
import { parseStake, slipPayout } from '@hiddengems/core';
import Link from 'next/link';
import { startTransition, useActionState, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ActionState, removeLeg, setStake } from '@/app/slips/actions';
import { offerUndo } from '@/app/slips/remove-leg';
import { money, stakeWords } from '@/app/slips/slip-parts';
import { useMoments } from '@/lib/moments/provider';
import { returnRow, sweepRow, takeReturn, unsweepRow } from '@/lib/moments/remove';

const X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

export interface RailLeg { selectionKey: string; name: string; price: number }

const gemHref = (key: string) => `/?gem=${encodeURIComponent(key)}`;

/** One leg you can change: its name opens the gem, the × removes it. */
export function RailLegRow({ slipId, leg, readOnly }: { slipId: string; leg: RailLeg; readOnly?: string }) {
  const moments = useMoments();
  const x = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  // A leg that Undo brought back opens behind the returning cloud, before it first paints.
  useLayoutEffect(() => {
    const row = x.current?.closest('li');
    if (row && x.current && takeReturn(slipId, leg.selectionKey)) void returnRow(moments.stage(), row, x.current);
  }, [moments, slipId, leg.selectionKey]);

  const remove = () => {
    if (readOnly) { moments.toast(readOnly); return; }
    const button = x.current, row = button?.closest('li');
    if (!button || !row || busy.current) return;
    busy.current = true;
    const stage = moments.stage();
    const motion = sweepRow(stage, row, button);
    startTransition(async () => {
      let r: Awaited<ReturnType<typeof removeLeg>>;
      try {
        [r] = await Promise.all([removeLeg(slipId, leg.selectionKey), motion]);
      } catch {
        await motion;
        r = { ok: false };
      }
      if (!r.ok) {
        busy.current = false;
        void unsweepRow(stage, row, button);
        moments.toast(`Couldn’t remove ${leg.name}. ${r.error ? `${r.error}.` : 'Try again.'}`);
        return;
      }
      if (r.removed) void offerUndo(moments, slipId, r.removed, leg.name, (t) => moments.toast(t), false);
    });
  };

  return (
    <li className="fc-railslip-row" data-editable>
      <Link className="fc-railslip-name" href={gemHref(leg.selectionKey)} scroll={false}>{leg.name}</Link>
      <span className="fc-railslip-end">
        <span>{leg.price.toFixed(2)}</span>
        <button ref={x} type="button" className="fc-button fc-railslip-x" data-variant="tertiary" data-size="tiny" data-shape="square"
          aria-label={`Remove ${leg.name}`} onClick={remove}>{X}</button>
      </span>
    </li>
  );
}

/** A leg on a suggested play: it opens its gem; changing the play comes first. */
export function RailLegLink({ leg }: { leg: RailLeg }) {
  return (
    <li className="fc-railslip-row">
      <Link className="fc-railslip-name" href={gemHref(leg.selectionKey)} scroll={false}>{leg.name}</Link>
      <span>{leg.price.toFixed(2)}</span>
    </li>
  );
}

/** The stake field and what it pays. The pays line follows the field; Enter or leaving the field saves it. */
export function RailStake({ slipId, stake, prices, readOnly }: { slipId: string; stake: number | null; prices: number[]; readOnly?: string }) {
  const moments = useMoments();
  const saved = stake == null ? '' : stake.toFixed(2);
  const [typed, setTyped] = useState(saved);
  const [state, action, pending] = useActionState<ActionState, FormData>(setStake, null);
  const form = useRef<HTMLFormElement>(null);
  // A new stake from the server (saved here or on Slips) replaces what is in the field.
  useEffect(() => setTyped(saved), [saved]);
  useEffect(() => {
    if (state && !state.ok && state.error) moments.toast(`${state.error}.`);
  }, [state, moments]);

  const value = parseStake(typed);
  const pays = slipPayout(value, prices);
  const save = () => {
    if (typed.trim() === saved || pending) return;
    if (readOnly) { moments.toast(readOnly); setTyped(saved); return; }
    form.current?.requestSubmit();
  };
  return (
    <>
      <div className="fc-railslip-row fc-railslip-stake">
        <dt><label htmlFor="rail-stake">Stake</label></dt>
        <dd>
          <form ref={form} action={action} onSubmit={(e) => { if (readOnly) { e.preventDefault(); save(); } }}>
            <input type="hidden" name="slipId" value={slipId} />
            <span className="fc-input-group" data-size="small">
              <span className="fc-input-affix" aria-hidden="true">$</span>
              <input id="rail-stake" name="stake" className="fc-input fc-num" inputMode="decimal" autoComplete="off"
                spellCheck={false} placeholder="15.00" value={typed} aria-invalid={typed.trim() !== '' && value == null ? true : undefined}
                onChange={(e) => setTyped(e.target.value)} onBlur={save}
                onKeyDown={(e) => { if (e.key === 'Escape') setTyped(saved); }} />
            </span>
          </form>
        </dd>
      </div>
      {value != null && pays != null && (
        <div className="fc-railslip-row"><dt>{stakeWords(value)} pays</dt><dd>{money(pays)}</dd></div>
      )}
    </>
  );
}
