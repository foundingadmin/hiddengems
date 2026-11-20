// Facet specimen chrome, shared by the Design, Screens and Content pages. Page-owned, not part of Facet.
// ---- theme control ----
{
const root = document.documentElement;
const saved = (() => { try { return localStorage.getItem('facet-theme'); } catch { return null; } })();
function applyTheme(v) {
  root.removeAttribute('data-theme');
  if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v);
  document.querySelectorAll('[data-theme-choice]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themeChoice === v)));
  try { localStorage.setItem('facet-theme', v); } catch {}
}
applyTheme(saved || 'system');
document.getElementById('theme').addEventListener('click', e => { const b = e.target.closest('[data-theme-choice]'); if (b) applyTheme(b.dataset.themeChoice); });
document.querySelectorAll('.fc-segmented:not(#theme)').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); }));
}

// ---- score mark helper (one 0 to 100 score; null draws the void mark, a record that fails a hard gate) ----
const SCORE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fc-score-fill" d="M12 2 22 12 12 22 2 12Z"/></svg>';
const VOID_LABEL = 'Not eligible';
const score = (value, { size, delay, still } = {}) => value == null
  ? `<span class="fc-score" data-void aria-label="${VOID_LABEL}">${SCORE_SVG}</span><span class="fc-score-void text-label-12">${VOID_LABEL}</span>`
  : `<span class="fc-score" style="--rating: ${value}${delay != null ? `; --fc-score-delay: ${delay}ms` : ''}"${still ? '' : ' data-live'}${size ? ` data-size="${size}"` : ''} aria-label="Score ${value}">${SCORE_SVG}<span>${value}</span></span>`;

// ---- section tabs follow the scroll position ----
// The active tab is the last section whose top has passed the sticky nav. One rule, so a short section can
// never hand the highlight to the next one, and a clicked tab is selected at once.
{
const tabs = [...document.querySelectorAll('nav.fc-tabs .fc-tab')];
const secs = tabs.map(t => document.querySelector(t.getAttribute('href'))).filter(Boolean);
const mark = id => tabs.forEach(t => t.setAttribute('aria-selected', String(t.getAttribute('href') === '#' + id)));
const line = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fc-scroll-offset')) || 136) + 24;
let lock = 0, raf = 0;
const update = () => {
  raf = 0;
  if (Date.now() < lock || !secs.length) return;
  const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  let cur = secs[0];
  for (const sec of secs) if (sec.getBoundingClientRect().top <= line()) cur = sec;
  mark((atEnd ? secs[secs.length - 1] : cur).id);
};
addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
tabs.forEach(t => t.addEventListener('click', () => { mark(t.getAttribute('href').slice(1)); lock = Date.now() + 900; }));
update();
}

// ---- hero fields and tips ----
if (window.FacetField) window.FacetField.autoMount();
if (window.FacetTips) window.FacetTips.mountTips();
if (window.FacetForms) { window.FacetForms.bindOptionHelpers(); window.FacetForms.bindSliders(); }
// Countdowns print once at load. The sample data is frozen at 6:00 PM ET on Nov 2, so the specimen counts from there.
if (window.FacetTime) window.FacetTime.stampTimes(document, Date.parse('2026-11-02T18:00:00-05:00'));
