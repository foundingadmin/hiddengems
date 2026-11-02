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

// ---- gem helper ----
const tierOf = gap => gap >= 12 ? 'flawless' : gap >= 9 ? 'polished' : gap >= 6 ? 'cut' : 'rough';
const cap = s => s[0].toUpperCase() + s.slice(1);
const gem = (t, attrs = '') => `<span class="fc-gem" data-tier="${t}"${attrs}><span class="fc-gem-facets" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${cap(t)}</span>`;

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
if (window.FacetForms) window.FacetForms.bindOptionHelpers();
// Countdowns print once at load. The sample data is frozen at 6:00 PM ET on Nov 2, so the specimen counts from there.
if (window.FacetTime) window.FacetTime.stampTimes(document, Date.parse('2026-11-02T18:00:00-05:00'));
