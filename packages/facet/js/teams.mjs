// Facet team marks, jerseys and player rows. A sport kit (kits/nfl) supplies the teams; this finds and renders them.
// Team colors and logos appear only inside identity marks (hue rule, DESIGN.md), so these helpers never return a color.
//
//   import { teams, findTeam } from '@foundingcreative/facet/kits/nfl/teams.mjs';
//   import { teamHTML, matchupHTML, jerseyHTML, playerHTML, mountTeams } from '@foundingcreative/facet/js/teams.mjs';
//   findTeam('Kansas City Chiefs')   // also 'KC', 'kc', 'KAN', 'Chiefs'
//   teamHTML(findTeam('KC'), { name: 'name' })
//   jerseyHTML(findTeam('SEA'), 11)
//   mountTeams(document, findTeam)  // fills every empty .fc-team[data-team], .fc-matchup[data-away][data-home] and .fc-jersey[data-team]

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

// A jersey in the team's colors with the player's number. Drawn, so it needs no assets.
const JERSEY = {
  body: 'M14 5 9 7 3 12 6 19 10 17.5V35.5Q20 37.5 30 35.5V17.5L34 19 37 12 31 7 26 5Q20 10.5 14 5Z',
  stripes: 'M3.7 11.4 4.9 10.4 7.5 18.4 6.4 18.9ZM5.8 9.7 7 8.7 9 17.9 8 18.3ZM36.3 11.4 35.1 10.4 32.5 18.4 33.6 18.9ZM34.2 9.7 33 8.7 31 17.9 32 18.3Z',
  collar: 'M14 5Q20 10.5 26 5',
};
export function jerseyHTML(t, number, { size } = {}) {
  if (!t) return '';
  const n = number == null || number === '' ? '' : String(number);
  const label = `${t.city} ${t.name}${n ? `, number ${n}` : ''}`;
  return `<span class="fc-jersey" data-team="${t.id}"${size ? ` data-size="${size}"` : ''} role="img" aria-label="${esc(label)}">`
    + `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="fc-jersey-body" d="${JERSEY.body}"/><path class="fc-jersey-trim" d="${JERSEY.stripes}"/>`
    + `<path class="fc-jersey-collar" d="${JERSEY.collar}"/>${n ? `<text class="fc-jersey-number" x="20" y="27.5" text-anchor="middle">${esc(n)}</text>` : ''}</svg></span>`;
}

// A player row: jersey, name, then the team and whatever detail the caller passes (position, market).
export function playerHTML(t, { name, number, detail = '', size } = {}) {
  if (!t) return '';
  return `<span class="fc-player"${size ? ` data-size="${size}"` : ''}>${jerseyHTML(t, number, { size })}`
    + `<span class="fc-player-main"><span class="fc-player-name">${esc(name)}</span>`
    + `<span class="fc-player-meta">${teamHTML(t, { name: 'abbr', size: 'sm' })}${detail ? `<span>${esc(detail)}</span>` : ''}</span></span></span>`;
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
  root.querySelectorAll('.fc-jersey[data-team]:empty').forEach((el) => {
    const t = find(el.dataset.team);
    if (t) fill(el, jerseyHTML(t, el.dataset.number, { size: el.dataset.size }));
  });
  root.querySelectorAll('.fc-matchup[data-away][data-home]:empty').forEach((el) => {
    el.innerHTML = matchupHTML(find(el.dataset.away), find(el.dataset.home), {
      name: el.dataset.name || 'abbr', size: el.dataset.size, mark: el.dataset.mark, neutral: 'neutral' in el.dataset,
    });
  });
}
