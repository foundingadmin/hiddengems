// Swipe to remove, phones (docs/animation/micro-moments/moments.md, "Swipe, soft pull" and "Swipe, hard pull"):
// a touch pull slides a leg left over its Remove action (Facet .fc-leg-swipe, stop tokens). A short pull opens it
// and it stays open; a second pull or a tap on Remove removes; a long pull goes straight through. Either way the
// remove moment (remove.ts) plays from the revealed action. Pointer events only: the leg's touch-action leaves
// vertical scrolling to the browser, and the × stays the keyboard and desktop path.

/** The open action's width, px. */
export const OPEN_PX = 88;
/** How far a touch moves before it picks an axis, px. */
const SLOP = 10;
/** How far past open a second pull has to go to remove, px. */
const SECOND_PULL = 40;
/** A pull this share of the leg's width goes straight through to remove. */
const HARD = 0.55;
/** Matches --fc-duration-overlay, the slide shut. */
const SETTLE_MS = 300;

type Mode = 'drag' | 'open' | 'settle';

/** Binds the gesture to row; onRemove runs once a pull or a tap on action asks to remove. Returns the cleanup. */
export function bindSwipe(row: HTMLElement, action: HTMLElement, onRemove: () => void): () => void {
  let touch: { id: number; x: number; y: number; base: number } | null = null;
  let axis: 'x' | 'y' | null = null, pull = 0, open = false, dragged = false, timer = 0;

  const set = (px: number, mode: Mode) => {
    row.style.setProperty('--fc-swipe', `${Math.round(px)}px`);
    row.setAttribute('data-swipe', mode);
  };
  const shut = () => {
    open = false;
    clearTimeout(timer);
    set(0, 'settle');
    timer = window.setTimeout(() => { row.removeAttribute('data-swipe'); row.style.removeProperty('--fc-swipe'); }, SETTLE_MS);
  };
  const leaving = () => row.hasAttribute('data-leaving');

  const down = (e: PointerEvent) => {
    dragged = false;
    if (e.pointerType !== 'touch' || !e.isPrimary || leaving() || action.contains(e.target as Node)) return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, base: open ? OPEN_PX : 0 };
    axis = null;
  };
  const move = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return;
    const dx = touch.x - e.clientX, dy = e.clientY - touch.y;
    if (!axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'y') { touch = null; return; }
      dragged = true;
      clearTimeout(timer);
      row.setPointerCapture(e.pointerId);
    }
    pull = Math.max(0, Math.min(row.clientWidth, touch.base + dx));
    set(pull, 'drag');
  };
  const up = (e: PointerEvent) => {
    if (!touch || e.pointerId !== touch.id) return;
    const base = touch.base;
    touch = null;
    if (axis !== 'x') {
      // A tap on an open leg shuts it.
      if (open && e.type === 'pointerup') shut();
      return;
    }
    if (e.type === 'pointerup' && (pull >= row.clientWidth * HARD || (base > 0 && pull >= OPEN_PX + SECOND_PULL))) {
      open = false;
      set(pull, 'open');
      onRemove();
      return;
    }
    if (pull >= OPEN_PX / 2) { open = true; set(OPEN_PX, 'open'); } else shut();
  };
  // A drag that started on the × must not also click it.
  const click = (e: MouseEvent) => {
    if (!dragged || action.contains(e.target as Node)) return;
    dragged = false;
    e.preventDefault();
    e.stopPropagation();
  };
  // A touch anywhere else shuts an open leg.
  const outside = (e: PointerEvent) => { if (open && !leaving() && !row.contains(e.target as Node)) shut(); };

  row.addEventListener('pointerdown', down);
  row.addEventListener('pointermove', move);
  row.addEventListener('pointerup', up);
  row.addEventListener('pointercancel', up);
  row.addEventListener('click', click, true);
  document.addEventListener('pointerdown', outside);
  return () => {
    clearTimeout(timer);
    row.removeEventListener('pointerdown', down);
    row.removeEventListener('pointermove', move);
    row.removeEventListener('pointerup', up);
    row.removeEventListener('pointercancel', up);
    row.removeEventListener('click', click, true);
    document.removeEventListener('pointerdown', outside);
  };
}

/** A failed remove from a swipe: the leg slides shut. */
export function shutSwipe(row: HTMLElement): void {
  if (!row.hasAttribute('data-swipe')) return;
  row.setAttribute('data-swipe', 'settle');
  row.style.setProperty('--fc-swipe', '0px');
  window.setTimeout(() => { row.removeAttribute('data-swipe'); row.style.removeProperty('--fc-swipe'); }, SETTLE_MS);
}
