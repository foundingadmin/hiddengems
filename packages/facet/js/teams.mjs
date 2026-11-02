// Facet team marks. A sport kit (kits/nfl) supplies the teams; this finds and renders them.
// Team colors appear only inside the mark (hue rule, DESIGN.md), so these helpers never return a color.
//
//   import { teams, findTeam } from '@foundingcreative/facet/kits/nfl/teams.mjs';
//   import { teamHTML, matchupHTML, mountTeams } from '@foundingcreative/facet/js/teams.mjs';
//   findTeam('Kansas City Chiefs')   // also 'KC', 'kc', 'KAN', 'Chiefs'
//   teamHTML(findTeam('KC'), { name: 'name' })
//   mountTeams(document, findTeam)  // fills every empty .fc-team[data-team] and .fc-matchup[data-away][data-home]

const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Resolves ids, abbreviations, aliases, nicknames and full names. Cities alone are ambiguous (two LA teams), so they do not resolve.
export function createTeamIndex(teams) {
  const map = new Map();
  for (const t of teams) {
    for (const k of [t.id, t.abbr, t.name, `${t.city} ${t.name}`, ...(t.aliases || [])]) map.set(key(k), t);
  }
  return (q) => (q && typeof q === 'object' ? q : map.get(key(q ?? ''))) || null;
}

// name: 'name' (Chiefs), 'full' (Kansas City Chiefs), 'stack' (city over name), 'none' (mark only).
export function teamHTML(t, { name = 'name', size } = {}) {
  if (!t) return '';
  const full = `${t.city} ${t.name}`;
  const sz = size ? ` data-size="${size}"` : '';
  if (name === 'none') {
    return `<span class="fc-team" data-team="${t.id}"${sz}><span class="fc-team-mark" role="img" aria-label="${esc(full)}">${esc(t.abbr)}</span></span>`;
  }
  const label = name === 'full' ? esc(full)
    : name === 'stack' ? `<span class="fc-team-city">${esc(t.city)}</span>${esc(t.name)}`
    : esc(t.name);
  const a11y = name === 'name' ? `<span class="fc-visually-hidden">${esc(t.city)} </span>` : '';
  return `<span class="fc-team" data-team="${t.id}"${sz}><span class="fc-team-mark" aria-hidden="true">${esc(t.abbr)}</span><span class="fc-team-name">${a11y}${label}</span></span>`;
}

// Away first, home second. neutral: true reads "vs" for a neutral site.
export function matchupHTML(away, home, { name = 'none', size, neutral = false } = {}) {
  if (!away || !home) return '';
  const sep = neutral
    ? '<span class="fc-matchup-sep">vs</span>'
    : '<span class="fc-matchup-sep" aria-hidden="true">@</span><span class="fc-visually-hidden">at</span>';
  return `${teamHTML(away, { name, size })}${sep}${teamHTML(home, { name, size })}`;
}

export function mountTeams(root = document, find) {
  root.querySelectorAll('.fc-team[data-team]:empty').forEach((el) => {
    const t = find(el.dataset.team);
    if (!t) return;
    const tmp = document.createElement('span');
    tmp.innerHTML = teamHTML(t, { name: el.dataset.name || 'name' });
    el.innerHTML = tmp.firstElementChild.innerHTML;
    el.dataset.team = t.id;
  });
  root.querySelectorAll('.fc-matchup[data-away][data-home]:empty').forEach((el) => {
    el.innerHTML = matchupHTML(find(el.dataset.away), find(el.dataset.home), {
      name: el.dataset.name || 'none', size: el.dataset.size, neutral: 'neutral' in el.dataset,
    });
  });
}
