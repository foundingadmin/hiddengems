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

// ---- gem rating helper (one 0 to 100 rating; null draws Fool's Gold) ----
const GEM_SVG = '<svg viewBox="0 0 24 22" aria-hidden="true"><path class="fc-gem-fill" d="M6 1h12l5 7-11 13L1 8Z"/><path class="fc-gem-cut" d="M1 8h22M8.5 1 6.5 8l5.5 13 5.5-13-2-7"/></svg>';
// Specimen data has no clarity, so it reads 80 against the PRD formula: round(100 * clamp(gap / 10, 0, 1) * 80 / 100).
const ratingOf = (gap) => (gap > 0 ? Math.round(100 * Math.min(1, gap / 10) * 0.8) : null);
const gem = (rating, { size, delay, still } = {}) => rating == null
  ? `<span class="fc-gem" data-fools aria-label="Fool's Gold">${GEM_SVG}</span><span class="fc-gem-fools text-label-12">Fool's Gold</span>`
  : `<span class="fc-gem" style="--rating: ${rating}${delay != null ? `; --fc-gem-delay: ${delay}ms` : ''}"${still ? '' : ' data-live'}${size ? ` data-size="${size}"` : ''} aria-label="Gem rating ${rating}">${GEM_SVG}<span>${rating}</span></span>`;

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
if (window.FacetTeams) {
  const T = window.FacetTeams, league = document.getElementById('tm-league');
  if (league) league.innerHTML = T.conferences.flatMap((c) => T.divisions.map((d) => {
    const id = `tm-${c}-${d}`.toLowerCase();
    const rows = T.teams.filter((t) => t.conference === c && t.division === d).map((t) => `<li>${T.teamHTML(t, { name: 'full' })}</li>`).join('');
    return `<div class="tm-div"><h4 class="text-label-14 tm-label" id="${id}">${c} ${d}</h4><ul role="list" aria-labelledby="${id}">${rows}</ul></div>`;
  })).join('');
  T.mountTeams(document, T.findTeam);
}
if (window.FacetTips) window.FacetTips.mountTips();
if (window.FacetForms) { window.FacetForms.bindOptionHelpers(); window.FacetForms.bindSliders(); }
// Countdowns print once at load. The sample data is frozen at 6:00 PM ET on Nov 2, so the specimen counts from there.
if (window.FacetTime) window.FacetTime.stampTimes(document, Date.parse('2026-11-02T18:00:00-05:00'));
