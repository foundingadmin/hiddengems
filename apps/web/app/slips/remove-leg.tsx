'use client';
// Removing a leg from a slip that is already your own play (packages/facet/patterns/moments.md, rule 3): instant,
// no confirm, a 5 second Undo. The × (keyboard and desktop) or a swipe on a phone removes it in the database at
// once; the row is swept away (lib/moments/remove.ts) and the server's answer, with the new totals, lands as it
// closes. Undo puts the same leg back at the price it was added at and plays the sweep backward. A suggested play
// shows no ×: Change this slip confirms first.
import { type ReactNode, createContext, startTransition, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Moments, useMoments } from '@/lib/moments/provider';
import { forgetReturn, returnRow, sweepRow, takeReturn, unsweepRow, willReturn } from '@/lib/moments/remove';
import { bindSwipe, shutSwipe } from '@/lib/moments/swipe';
import { type ActionState, type RemovedLeg, removeLeg, restoreLeg } from './actions';

const X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

interface Legs {
  /** Shows a problem under the legs; false once the list is gone (the last leg was removed). */
  show(text: string | null): boolean;
  /** Where focus goes once a removed leg's row has left, when it held focus. */
  focusAfter(el: HTMLElement | null): void;
}
const LegsContext = createContext<Legs | null>(null);

/** The legs of a slip you can still change, with the line that says when a remove or an Undo failed. */
export function EditableLegs({ children }: { children: ReactNode }) {
  const [problem, setProblem] = useState<string | null>(null);
  const mounted = useRef(false);
  const focus = useRef<HTMLElement | null>(null);
  const legs = useRef<Legs>({
    show: (text) => { if (mounted.current) setProblem(text); return mounted.current; },
    focusAfter: (el) => { focus.current = el; },
  });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Once the removed row has left, focus moves to its neighbor's ×, not the page.
  useEffect(() => {
    const el = focus.current;
    if (!el) return;
    if (!el.isConnected) { focus.current = null; return; }
    if (document.activeElement && document.activeElement !== document.body) return;
    focus.current = null;
    el.focus();
  });
  return (
    <LegsContext.Provider value={legs.current}>
      <ul className="fc-legs" data-editable>{children}</ul>
      {problem && <p className="fc-helper" data-type="error" role="alert">{problem}</p>}
    </LegsContext.Provider>
  );
}

/** Undo for one removed leg. It outlives the row, so it uses nothing of the component. */
/** Focus goes to the Undo button once its toast shows and the removed row has let go of focus. */
function focusUndo() {
  const until = performance.now() + 1500;
  const look = () => {
    const button = document.querySelector<HTMLElement>('.fc-toast-region .fc-toast button');
    const free = !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;
    if (button && free) button.focus();
    else if (performance.now() < until) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
}

async function offerUndo(moments: Moments, slipId: string, removed: RemovedLeg, name: string, say: (t: string) => void, focus: boolean) {
  const answer = moments.undo('Leg removed');
  if (focus) focusUndo();
  if ((await answer) !== 'undone') return;
  willReturn(slipId, removed.selectionKey);
  startTransition(async () => {
    let r: ActionState = null;
    try { r = await restoreLeg(slipId, removed); } catch { r = null; }
    if (r?.ok) { moments.announce('Leg restored'); return; }
    forgetReturn(slipId, removed.selectionKey);
    say(`Couldn’t put ${name} back. ${r?.error ? `${r.error}.` : 'Add it again from the board.'}`);
  });
}

/** The × on a leg, and the Remove action a swipe reveals on a phone (Facet .fc-leg-action, .fc-leg-swipe). */
export function RemoveLeg({ slipId, selectionKey, name }: { slipId: string; selectionKey: string; name: string }) {
  const moments = useMoments();
  const legs = useContext(LegsContext);
  const x = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  const say = (text: string) => { if (!legs?.show(text)) moments.announce(text); };
  const remove = (from: HTMLElement) => {
    const row = x.current?.closest('li');
    if (!row || busy.current) return;
    busy.current = true;
    legs?.show(null);
    // A leg removed from the keyboard hands focus to its neighbor's ×, or to Undo when it was the last leg.
    const held = row.contains(document.activeElement);
    const next = held ? (row.nextElementSibling ?? row.previousElementSibling)?.querySelector<HTMLElement>('.fc-leg-action') ?? null : null;
    const stage = moments.stage();
    const motion = sweepRow(stage, row, from);
    // The removal is sent now; the transition holds its answer (the row gone, the new totals) until the row has
    // closed. Under reduced motion that is at once.
    startTransition(async () => {
      let r: Awaited<ReturnType<typeof removeLeg>>;
      try {
        [r] = await Promise.all([removeLeg(slipId, selectionKey), motion]);
      } catch {
        await motion;
        r = { ok: false };
      }
      if (!r.ok) {
        busy.current = false;
        shutSwipe(row);
        void unsweepRow(stage, row, x.current ?? from);
        say(`Couldn’t remove ${name}. ${r.confirm ? 'Change this slip first.' : r.error ? `${r.error}.` : 'Try again.'}`);
        return;
      }
      legs?.focusAfter(next);
      if (r.removed) void offerUndo(moments, slipId, r.removed, name, say, held && !next);
    });
  };
  const removeRef = useRef(remove);
  removeRef.current = remove;

  // A row that Undo brought back opens and shows behind the returning cloud, before it first paints.
  useLayoutEffect(() => {
    const row = x.current?.closest('li');
    if (!row || !x.current || !takeReturn(slipId, selectionKey)) return;
    void returnRow(moments.stage(), row, x.current);
    if (!document.activeElement || document.activeElement === document.body) x.current.focus({ preventScroll: true });
  }, [moments, slipId, selectionKey]);
  useEffect(() => {
    const row = x.current?.closest('li'), revealed = action.current;
    if (!row || !revealed) return;
    return bindSwipe(row, revealed, () => removeRef.current(revealed));
  }, []);

  return (
    <>
      <button
        ref={x} type="button" className="fc-button fc-leg-action" data-variant="tertiary" data-size="tiny" data-shape="square"
        aria-label={`Remove ${name}`} onClick={() => remove(x.current!)}
      >{X}</button>
      <button ref={action} type="button" className="fc-leg-swipe text-label-13" onClick={() => remove(action.current!)}>
        {X}Remove<span className="fc-visually-hidden"> {name}</span>
      </button>
    </>
  );
}
