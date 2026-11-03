// GENERATED from js/undo.mjs by scripts/build.mjs. Do not edit by hand.
(function () {
// Facet undo: the countdown on an Undo toast (components/toast.md, "Undo toast").
//
//   import { mountUndo } from '@foundingcreative/facet/js/undo.mjs';
//   const undo = mountUndo(toast, { onExpire: () => toast.remove() });
//
// The toast's five dots (.fc-toast-dots > i) go out one per second, last first. Time holds while the pointer is
// over the toast or focus is inside it, so a keyboard user on Undo never loses it. The length comes from
// --fc-duration-undo (5s) unless { duration } is passed. Reduced motion keeps the countdown; only the dots'
// shrink is instant. Returns { pause(), resume(), destroy() }.

const ms = (v) => {
  const m = String(v).trim().match(/^([\d.]+)(ms|s)$/);
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : null;
};

function mountUndo(toast, opts = {}) {
  const dots = [...toast.querySelectorAll('.fc-toast-dots > *')];
  const total = opts.duration ?? ms(getComputedStyle(toast).getPropertyValue('--fc-duration-undo')) ?? 5000;
  const step = total / Math.max(1, dots.length);
  let left = total, startedAt = 0, timer = 0, done = false, held = 0;

  const render = () => {
    const lit = Math.ceil(left / step - 0.001);
    dots.forEach((d, i) => d.toggleAttribute('data-spent', i >= lit));
  };
  const run = () => {
    if (done || held) return;
    startedAt = performance.now();
    const wait = left - (Math.ceil(left / step - 0.001) - 1) * step;
    timer = setTimeout(tick, Math.max(0, wait));
  };
  const stopClock = () => {
    if (!startedAt) return;
    clearTimeout(timer);
    left -= performance.now() - startedAt;
    startedAt = 0;
  };
  function tick() {
    left -= performance.now() - startedAt;
    startedAt = 0;
    render();
    if (left <= 1) {
      done = true;
      detach();
      opts.onExpire?.();
    } else run();
  }
  const hold = () => { held++; stopClock(); };
  const release = () => { held = Math.max(0, held - 1); run(); };

  let over = false, inside = false;
  const enter = () => { if (!over) { over = true; hold(); } };
  const leave = () => { if (over) { over = false; release(); } };
  const focusIn = () => { if (!inside) { inside = true; hold(); } };
  const focusOut = (e) => { if (inside && !toast.contains(e.relatedTarget)) { inside = false; release(); } };
  toast.addEventListener('pointerenter', enter);
  toast.addEventListener('pointerleave', leave);
  toast.addEventListener('focusin', focusIn);
  toast.addEventListener('focusout', focusOut);
  function detach() {
    clearTimeout(timer);
    toast.removeEventListener('pointerenter', enter);
    toast.removeEventListener('pointerleave', leave);
    toast.removeEventListener('focusin', focusIn);
    toast.removeEventListener('focusout', focusOut);
  }

  render();
  if (toast.contains(document.activeElement)) focusIn();
  run();
  return {
    /** Holds the countdown, as hover and focus do. */
    pause: hold,
    /** Releases one pause. */
    resume: release,
    /** Stops the countdown without calling onExpire. */
    destroy() { done = true; detach(); },
  };
}

window.FacetUndo = { mountUndo };
})();
