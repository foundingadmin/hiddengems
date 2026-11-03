// Drawer (docs/animation/micro-moments/moments.md, "Drawer, phone" and "Drawer, desktop"): the gem sheet springs in
// from its side (Facet's .fc-sheet[data-motion="spring"]: open 460ms on --fc-ease-emphasized, close 300ms on
// --fc-ease-exit) while dots ripple along its leading edge outward from the level of the row that opened it. The
// row keeps its open state under the tint (motion rule 7). The sheet is a modal dialog in the top layer, above
// the shared stage, so the ripple draws on a stage hosted in the sheet itself.
import { createStage, reducedMotion } from '@foundingcreative/facet/js/dots.mjs';

/** moments.md, Drawer: ripple 760ms. */
export const RIPPLE_MS = 760;

/** The visible row that opens the gem key (the table row or the phone row), if it is on screen. */
export function openerOf(key: string): Element | null {
  const links = [...document.querySelectorAll<HTMLElement>(`[data-gem-link="${CSS.escape(key)}"]`)];
  const link = links.find((a) => a.offsetParent !== null);
  return link?.closest('tr, li') ?? link ?? null;
}

/**
 * Ripples the sheet's leading edge from the opener's level (the sheet's middle without one). The stage lives in the
 * sheet, so dots still playing when it closes leave with it; it removes itself when the ripple ends.
 */
export function rippleOpen(sheet: HTMLElement, opener: Element | null): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  const at = (opener ?? sheet).getBoundingClientRect();
  const stage = createStage(sheet, { outset: 'var(--fc-space-3)' });
  return stage.ripple(sheet, { from: { x: at.left + at.width / 2, y: at.top + at.height / 2 }, duration: RIPPLE_MS })
    .then(() => stage.destroy());
}

const closing = new WeakMap<HTMLDialogElement, () => void>();

/** Plays the sheet's close (data-closing), then closes the dialog. At once under reduced motion. */
export function closeSheet(sheet: HTMLDialogElement): void {
  if (!sheet.open || closing.has(sheet)) return;
  if (reducedMotion() || sheet.dataset.motion !== 'spring') { sheet.close(); return; }
  const done = () => { settle(); sheet.close(); };
  const onEnd = (e: AnimationEvent) => { if (e.target === sheet && !e.pseudoElement) done(); };
  // The token's time plus a frame, in case the animation never ends (a hidden tab).
  const time = getComputedStyle(sheet).getPropertyValue('--fc-duration-overlay').trim();
  const ms = (parseFloat(time) || 0.3) * (time.endsWith('ms') ? 1 : 1000);
  const timer = setTimeout(done, ms + 50);
  const settle = () => {
    clearTimeout(timer);
    sheet.removeEventListener('animationend', onEnd);
    sheet.removeAttribute('data-closing');
    closing.delete(sheet);
  };
  closing.set(sheet, settle);
  sheet.addEventListener('animationend', onEnd);
  sheet.setAttribute('data-closing', '');
}

/** Stops a close in progress, so a gem opened again mid-close stays open. */
export function keepOpen(sheet: HTMLDialogElement): void {
  closing.get(sheet)?.();
}
