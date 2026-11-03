// Remove a leg (docs/animation/micro-moments/moments.md, "Remove a leg"): a brand cloud leaves the control with
// large dots and sweeps the row into dust, the row closes, and Undo shows. Undo plays it backward: the row opens,
// then the cloud gathers at its far end and returns to the control as the row shows again.
// The leg leaves the slip in the database at once (state first); the surface holds the server's answer until the
// row has closed (under a second), so the totals change as the row goes and no cloud draws over moved content.
import { type Stage, reducedMotion } from '@foundingcreative/facet/js/dots.mjs';

/** moments.md: sweep 660ms, close 220ms, Undo 5s (--fc-duration-undo, held by the toast). */
export const SWEEP_MS = 660;
export const CLOSE_MS = 220;

/** Facet's standard easing for the close and the open. */
const ease = () => getComputedStyle(document.documentElement).getPropertyValue('--fc-ease-standard').trim() || 'ease';

/** The row's height and block padding now, to close from or open to. */
function box(row: HTMLElement): Keyframe {
  const cs = getComputedStyle(row);
  return { height: `${row.getBoundingClientRect().height}px`, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
}
const SHUT: Keyframe = { height: '0px', paddingTop: '0px', paddingBottom: '0px' };

const closes = new WeakMap<HTMLElement, Animation>();

/** Sweeps the row away from the control (the × or the swipe's Remove), then closes it. Resolves once it is shut. */
export async function sweepRow(stage: Stage, row: HTMLElement, from: Element): Promise<void> {
  row.setAttribute('data-leaving', '');
  await stage.sweep(row, { from, wipe: true, duration: SWEEP_MS });
  if (!row.isConnected) return;
  const close = row.animate([box(row), SHUT], { duration: reducedMotion() ? 0 : CLOSE_MS, easing: ease(), fill: 'forwards' });
  closes.set(row, close);
  await close.finished.catch(() => {});
}

/** A failed remove: the row opens again and the cloud returns to the control. */
export function unsweepRow(stage: Stage, row: HTMLElement, to: Element): Promise<void> {
  row.removeAttribute('data-leaving');
  const close = closes.get(row);
  closes.delete(row);
  if (close) {
    const open = box(row);
    close.cancel();
    row.animate([SHUT, open], { duration: reducedMotion() ? 0 : CLOSE_MS, easing: ease() });
  }
  return stage.unsweep(row, { to, delay: close && !reducedMotion() ? CLOSE_MS : 0 });
}

/** Undo: the restored row (rendered again by the server's answer) opens from nothing, then shows behind the cloud
 *  as it returns to the control. Call before the row paints (a layout effect). */
export function returnRow(stage: Stage, row: HTMLElement, to: Element): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  row.animate([SHUT, box(row)], { duration: CLOSE_MS, easing: ease() });
  return stage.unsweep(row, { to, reveal: true, delay: CLOSE_MS });
}

// Rows on their way back from Undo, by slip and selection, so the row that renders again plays its return.
const returning = new Set<string>();
const keyOf = (slipId: string, selectionKey: string) => `${slipId}\n${selectionKey}`;
export const willReturn = (slipId: string, selectionKey: string) => { returning.add(keyOf(slipId, selectionKey)); };
export const forgetReturn = (slipId: string, selectionKey: string) => { returning.delete(keyOf(slipId, selectionKey)); };
/** True once for a row that Undo is bringing back. */
export const takeReturn = (slipId: string, selectionKey: string) => returning.delete(keyOf(slipId, selectionKey));
