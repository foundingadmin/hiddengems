// Easy ways out of a modal .fc-sheet (components/sheet.md, "Leaving a sheet"). Escape, the close button and Back stay
// with the page; this adds the two a person reaches for first:
//   - desktop: a click on the dimmed page (the backdrop) closes the sheet;
//   - phone, data-phone="full": dragging the header or the handle down closes it; a short drag springs back.
// dismiss() is the page's own close (so a sheet with a close animation or URL state keeps them). Returns a cleanup.

const PHONE = '(max-width: 767px)';
/** A drag past this many pixels, or a quick flick, closes the sheet. */
const DISMISS_AT = 96;
const FLICK = 0.6; // px per ms

/**
 * @param {HTMLDialogElement} sheet
 * @param {{ dismiss: () => void }} options
 * @returns {() => void}
 */
export function dismissible(sheet, { dismiss }) {
  // Backdrop: a press that starts and ends outside the panel. Clicks on ::backdrop target the dialog itself, so
  // compare the point with the panel's box; a text selection dragged out of the panel does not count.
  let downOutside = false;
  const outside = (e) => {
    const r = sheet.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  const onDown = (e) => { downOutside = e.target === sheet && outside(e); };
  const onClick = (e) => {
    if (downOutside && e.target === sheet && outside(e)) dismiss();
    downOutside = false;
  };

  // Phone: drag the header (or .fc-sheet-handle) down. The body keeps its own scroll.
  let start = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grabbable = (e) => matchMedia(PHONE).matches && sheet.dataset.phone === 'full'
    && e.target instanceof Element && e.target.closest('.fc-sheet-header, .fc-sheet-handle')
    && !e.target.closest('button, a, input, select, textarea, [role="tab"]');
  const onTouchDown = (e) => {
    if (e.pointerType === 'mouse' || !grabbable(e)) return;
    start = { y: e.clientY, t: performance.now(), id: e.pointerId, dy: 0 };
  };
  const onTouchMove = (e) => {
    if (!start || e.pointerId !== start.id) return;
    start.dy = Math.max(0, e.clientY - start.y);
    if (start.dy > 4 && !reduced()) {
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${start.dy}px)`;
    }
  };
  const onTouchUp = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const { dy, t } = start;
    start = null;
    const fast = dy / Math.max(1, performance.now() - t) > FLICK && dy > 24;
    if (dy > DISMISS_AT || fast) {
      dismiss();
      // The close animation starts from where the finger left the sheet; clear it once the sheet has gone.
      sheet.addEventListener('close', () => { sheet.style.transform = ''; sheet.style.transition = ''; }, { once: true });
    } else {
      sheet.style.transition = '';
      sheet.style.transform = '';
    }
  };

  sheet.addEventListener('pointerdown', onDown);
  sheet.addEventListener('click', onClick);
  sheet.addEventListener('pointerdown', onTouchDown);
  sheet.addEventListener('pointermove', onTouchMove);
  sheet.addEventListener('pointerup', onTouchUp);
  sheet.addEventListener('pointercancel', onTouchUp);
  return () => {
    sheet.removeEventListener('pointerdown', onDown);
    sheet.removeEventListener('click', onClick);
    sheet.removeEventListener('pointerdown', onTouchDown);
    sheet.removeEventListener('pointermove', onTouchMove);
    sheet.removeEventListener('pointerup', onTouchUp);
    sheet.removeEventListener('pointercancel', onTouchUp);
  };
}

/**
 * Scrolls a sheet's body so `target` sits at its top, without scrolling the sheet or the page (scrollIntoView
 * would scroll every ancestor, and can push the header and its close button out of view).
 * @param {HTMLElement} body the .fc-sheet-body
 * @param {HTMLElement} target
 * @param {ScrollBehavior} [behavior]
 */
export function scrollBodyTo(body, target, behavior = 'auto') {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const top = target.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - margin;
  body.scrollTo({ top: Math.max(0, top), behavior });
}
