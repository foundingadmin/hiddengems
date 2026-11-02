// GENERATED from js/time.mjs by scripts/build.mjs. Do not edit by hand.
(function () {
// Facet time helpers. Countdowns are printed once when the page loads, never animated
// (owner decision, 2026-11-02): "in 5 min", "in 6 hr", "in 1 day 6 hr". At most two units, largest first.
//
//   <time datetime="2026-11-02T18:05-05:00" data-until>Today 6:05 PM</time>
//   <span class="fc-schedule-detail" data-until-for="..."></span>   or let stampUntil() add the detail line
//
//   import { stampUntil } from '@foundingcreative/facet/js/time.mjs';
//   stampUntil();                 // fills every [data-until-out] from the <time data-until> beside it

function formatUntil(ms) {
  if (!(ms > 0)) return 'Due now';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'in under 1 min';
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  const parts = [];
  if (d) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
  if (h && parts.length < 2) parts.push(`${h} hr`);
  if (m && !d && parts.length < 2) parts.push(`${m} min`);
  return 'in ' + parts.join(' ');
}

// Each [data-until-out] element takes its value from the nearest <time data-until> in the same parent.
function stampUntil(root = document, now = Date.now()) {
  root.querySelectorAll('[data-until-out]').forEach((out) => {
    const t = out.parentElement && out.parentElement.querySelector('time[data-until][datetime]');
    if (!t) return;
    out.textContent = formatUntil(new Date(t.getAttribute('datetime')).getTime() - now);
  });
}

window.FacetTime = { formatUntil, stampUntil };
})();
