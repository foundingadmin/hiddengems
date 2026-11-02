// Facet tips. A dotted underline (.fc-has-tip) always means a helper sits behind it, and it opens
// on every input: hover (short delay), keyboard focus, or a tap on touch screens. This replaces
// info icons (owner decision, 2026-11-02).
//
//   <span class="fc-has-tip" aria-describedby="tip-gap">Gap</span>
//   <div class="fc-tooltip fc-float" popover="manual" role="tooltip" id="tip-gap">Our estimate minus the priced chance</div>
//
// Shorthand: give the trigger data-tip="..." (or title="...") instead, and the tooltip is created for you.
// A trigger that is not natively focusable gets tabindex="0". Rich helpers (the relative time card)
// work the same way: point aria-describedby at any .fc-float popover.
//
//   import { mountTips } from '@foundingcreative/facet/js/tips.mjs';
//   mountTips();   // returns { destroy() }

let uid = 0;
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

function place(trigger, pop) {
  const r = trigger.getBoundingClientRect(), p = pop.getBoundingClientRect(), g = 6;
  let top = r.top - p.height - g;
  if (top < 8) top = r.bottom + g;
  let left = r.left + r.width / 2 - p.width / 2;
  left = Math.max(8, Math.min(left, innerWidth - p.width - 8));
  pop.style.top = `${Math.round(top)}px`;
  pop.style.left = `${Math.round(left)}px`;
}
const isOpen = (pop) => { try { return pop.matches(':popover-open'); } catch { return false; } };
const open = (pop) => { try { if (!isOpen(pop)) pop.showPopover(); } catch {} };
const close = (pop) => { try { if (isOpen(pop)) pop.hidePopover(); } catch {} };

export function mountTips(root = document) {
  const pairs = [];
  let showT, hideT;
  const closeAll = (except) => pairs.forEach(([, p]) => p !== except && close(p));

  root.querySelectorAll('.fc-has-tip').forEach((trigger) => {
    if (trigger.dataset.fcTipBound) return;
    let pop = document.getElementById(trigger.getAttribute('aria-describedby') || '');
    const text = trigger.dataset.tip || trigger.getAttribute('title');
    if (!pop && text) {
      pop = document.createElement('div');
      pop.className = 'fc-tooltip fc-float';
      pop.setAttribute('popover', 'manual');
      pop.setAttribute('role', 'tooltip');
      pop.id = `fc-tip-${++uid}`;
      pop.textContent = text;
      document.body.appendChild(pop);
      trigger.setAttribute('aria-describedby', pop.id);
      trigger.removeAttribute('title');
    }
    if (!pop) return;
    trigger.dataset.fcTipBound = '1';
    if (!trigger.matches(FOCUSABLE)) trigger.tabIndex = 0;
    pairs.push([trigger, pop]);

    const show = () => { clearTimeout(hideT); closeAll(pop); open(pop); place(trigger, pop); };
    const hide = (delay = 120) => { clearTimeout(showT); hideT = setTimeout(() => close(pop), delay); };
    trigger.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { clearTimeout(showT); showT = setTimeout(show, 250); } });
    trigger.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hide(); });
    trigger.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') (isOpen(pop) ? close(pop) : show()); });
    trigger.addEventListener('focus', () => { if (trigger.matches(':focus-visible')) show(); });
    trigger.addEventListener('blur', () => hide());
    pop.addEventListener('pointerenter', () => clearTimeout(hideT));
    pop.addEventListener('pointerleave', () => hide());
  });

  const onKey = (e) => { if (e.key === 'Escape') closeAll(); };
  const onDown = (e) => { if (!pairs.some(([t, p]) => t.contains(e.target) || p.contains(e.target))) closeAll(); };
  const onScroll = () => closeAll();
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onDown);
  addEventListener('scroll', onScroll, { capture: true, passive: true });
  return {
    destroy() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      removeEventListener('scroll', onScroll, { capture: true });
    },
  };
}
