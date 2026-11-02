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
{
const tabs = [...document.querySelectorAll('nav.fc-tabs .fc-tab')];
const secs = tabs.map(t => document.querySelector(t.getAttribute('href'))).filter(Boolean);
const mark = id => tabs.forEach(t => t.setAttribute('aria-selected', String(t.getAttribute('href') === '#' + id)));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => { es.filter(e => e.isIntersecting).forEach(e => mark(e.target.id)); }, { rootMargin: '-140px 0px -60% 0px' });
  secs.forEach(sec => io.observe(sec));
}
}

// ---- hero fields and tips ----
if (window.FacetField) window.FacetField.autoMount();
if (window.FacetTips) window.FacetTips.mountTips();
// Countdowns print once at load. The sample data is frozen at 6:00 PM ET on Nov 2, so the specimen counts from there.
if (window.FacetTime) window.FacetTime.stampUntil(document, Date.parse('2026-11-02T18:00:00-05:00'));
