// Facet team marks, matchups and player rows. A sport kit (kits/nfl) supplies the teams; this finds and renders them.
// Team colors and logos appear only inside team marks and player avatars (hue rule, DESIGN.md), so these helpers never return a color.
//
//   import { teams, findTeam } from '@foundingcreative/facet/kits/nfl/teams.mjs';
//   import { teamHTML, matchupHTML, playerHTML, mountTeams } from '@foundingcreative/facet/js/teams.mjs';
//   findTeam('Kansas City Chiefs')   // also 'KC', 'kc', 'KAN', 'Chiefs'
//   teamHTML(findTeam('KC'), { name: 'name' })
//   playerHTML(findTeam('SEA'), { name: 'Jaxon Smith-Njigba', number: 11, detail: 'WR' })
//   mountTeams(document, findTeam)  // fills every empty .fc-team[data-team], .fc-matchup[data-away][data-home] and .fc-player-avatar[data-team]

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

// mark: 'logo' (full-color tile, default), 'mono' (silhouette in the text color), 'abbr' (abbreviation chip, no assets needed).
// name: 'name' (Chiefs), 'full' (Kansas City Chiefs), 'abbr' (KC), 'stack' (city over name), 'none' (mark only).
export function teamHTML(t, { name = 'name', size, mark = 'logo' } = {}) {
  if (!t) return '';
  const full = `${t.city} ${t.name}`;
  const attrs = `data-team="${t.id}"${size ? ` data-size="${size}"` : ''}${mark !== 'logo' ? ` data-mark="${mark}"` : ''}`;
  const glyph = mark === 'abbr' ? esc(t.abbr) : '';
  if (name === 'none') {
    return `<span class="fc-team" ${attrs}><span class="fc-team-mark" role="img" aria-label="${esc(full)}">${glyph}</span></span>`;
  }
  const label = name === 'full' ? esc(full)
    : name === 'stack' ? `<span class="fc-team-city">${esc(t.city)}</span>${esc(t.name)}`
    : name === 'abbr' ? `<span aria-hidden="true">${esc(t.abbr)}</span><span class="fc-visually-hidden">${esc(full)}</span>`
    : `<span class="fc-visually-hidden">${esc(t.city)} </span>${esc(t.name)}`;
  return `<span class="fc-team" ${attrs}><span class="fc-team-mark" aria-hidden="true">${glyph}</span><span class="fc-team-name">${label}</span></span>`;
}

// Away first, home second. neutral: true reads "vs" for a neutral site.
export function matchupHTML(away, home, { name = 'abbr', size, mark, neutral = false } = {}) {
  if (!away || !home) return '';
  const sep = neutral
    ? '<span class="fc-matchup-sep">vs</span>'
    : '<span class="fc-matchup-sep" aria-hidden="true">@</span><span class="fc-visually-hidden">at</span>';
  return `${teamHTML(away, { name, size, mark })}${sep}${teamHTML(home, { name, size, mark })}`;
}

// A player: the team logo tile once, then the name with the jersey number trailing it, then a detail line.
export function playerAvatarHTML(t, { size } = {}) {
  if (!t) return '';
  return `<span class="fc-player-avatar" data-team="${t.id}"${size ? ` data-size="${size}"` : ''} role="img" aria-label="${esc(`${t.city} ${t.name}`)}"></span>`;
}

export function playerNumberHTML(number) {
  if (number == null || number === '') return '';
  const n = esc(String(number));
  return `<span class="fc-player-number"><span aria-hidden="true">#${n}</span><span class="fc-visually-hidden">, number ${n}</span></span>`;
}

export function playerHTML(t, { name, number, detail = '', size } = {}) {
  if (!t) return '';
  return `<span class="fc-player"${size ? ` data-size="${size}"` : ''}>${playerAvatarHTML(t, { size })}`
    + `<span class="fc-player-main"><span class="fc-player-line"><span class="fc-player-name">${esc(name)}</span>${playerNumberHTML(number)}</span>`
    + `${detail ? `<span class="fc-player-meta">${esc(detail)}</span>` : ''}</span></span>`;
}

export function mountTeams(root = document, find) {
  const fill = (el, html) => {
    const tmp = document.createElement('span');
    tmp.innerHTML = html;
    const made = tmp.firstElementChild;
    if (!made) return;
    for (const { name, value } of made.attributes) if (name === 'data-team' || !el.hasAttribute(name)) el.setAttribute(name, value);
    el.innerHTML = made.innerHTML;
  };
  root.querySelectorAll('.fc-team[data-team]:empty').forEach((el) => {
    const t = find(el.dataset.team);
    if (t) fill(el, teamHTML(t, { name: el.dataset.name || 'name', mark: el.dataset.mark || 'logo', size: el.dataset.size }));
  });
  root.querySelectorAll('.fc-player-avatar[data-team]:empty').forEach((el) => {
    const t = find(el.dataset.team);
    if (t) fill(el, playerAvatarHTML(t, { size: el.dataset.size }));
  });
  root.querySelectorAll('.fc-player-number[data-number]:empty').forEach((el) => {
    const tmp = document.createElement('span');
    tmp.innerHTML = playerNumberHTML(el.dataset.number);
    el.innerHTML = tmp.firstElementChild ? tmp.firstElementChild.innerHTML : '';
  });
  root.querySelectorAll('.fc-matchup[data-away][data-home]:empty').forEach((el) => {
    el.innerHTML = matchupHTML(find(el.dataset.away), find(el.dataset.home), {
      name: el.dataset.name || 'abbr', size: el.dataset.size, mark: el.dataset.mark, neutral: 'neutral' in el.dataset,
    });
  });
}
