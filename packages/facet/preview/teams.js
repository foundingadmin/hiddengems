// GENERATED from js/teams.mjs and kits/nfl/teams.json by scripts/build.mjs. Do not edit by hand.
(function () {
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
function createTeamIndex(teams) {
  const map = new Map();
  for (const t of teams) {
    for (const k of [t.id, t.abbr, t.name, `${t.city} ${t.name}`, ...(t.aliases || [])]) map.set(key(k), t);
  }
  return (q) => (q && typeof q === 'object' ? q : map.get(key(q ?? ''))) || null;
}

// name: 'name' (Chiefs), 'full' (Kansas City Chiefs), 'stack' (city over name), 'none' (mark only).
function teamHTML(t, { name = 'name', size } = {}) {
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
function matchupHTML(away, home, { name = 'none', size, neutral = false } = {}) {
  if (!away || !home) return '';
  const sep = neutral
    ? '<span class="fc-matchup-sep">vs</span>'
    : '<span class="fc-matchup-sep" aria-hidden="true">@</span><span class="fc-visually-hidden">at</span>';
  return `${teamHTML(away, { name, size })}${sep}${teamHTML(home, { name, size })}`;
}

function mountTeams(root = document, find) {
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

const teams = [{"id":"ari","abbr":"ARI","city":"Arizona","name":"Cardinals","conference":"NFC","division":"West","colors":["#97233F","#FFB612","#000000"],"aliases":["ARZ"],"ink":"#fff"},{"id":"atl","abbr":"ATL","city":"Atlanta","name":"Falcons","conference":"NFC","division":"South","colors":["#A71930","#000000","#A5ACAF"],"aliases":[],"ink":"#fff"},{"id":"bal","abbr":"BAL","city":"Baltimore","name":"Ravens","conference":"AFC","division":"North","colors":["#241773","#AD8900","#000000","#C60C30"],"aliases":[],"ink":"#fff"},{"id":"buf","abbr":"BUF","city":"Buffalo","name":"Bills","conference":"AFC","division":"East","colors":["#00338D","#C60C30"],"aliases":[],"ink":"#fff"},{"id":"car","abbr":"CAR","city":"Carolina","name":"Panthers","conference":"NFC","division":"South","colors":["#0085CA","#101820","#BFC0BF"],"aliases":[],"ink":"#000"},{"id":"chi","abbr":"CHI","city":"Chicago","name":"Bears","conference":"NFC","division":"North","colors":["#0B162A","#E64100"],"aliases":[],"ink":"#fff"},{"id":"cin","abbr":"CIN","city":"Cincinnati","name":"Bengals","conference":"AFC","division":"North","colors":["#FB4F14","#000000"],"aliases":[],"ink":"#000"},{"id":"cle","abbr":"CLE","city":"Cleveland","name":"Browns","conference":"AFC","division":"North","colors":["#311D00","#FF3C00"],"aliases":[],"ink":"#fff"},{"id":"dal","abbr":"DAL","city":"Dallas","name":"Cowboys","conference":"NFC","division":"East","colors":["#003594","#869397","#041E42"],"aliases":[],"ink":"#fff"},{"id":"den","abbr":"DEN","city":"Denver","name":"Broncos","conference":"AFC","division":"West","colors":["#FB4F14","#002244"],"aliases":[],"ink":"#000"},{"id":"det","abbr":"DET","city":"Detroit","name":"Lions","conference":"NFC","division":"North","colors":["#0076B6","#B0B7BC"],"aliases":[],"ink":"#fff"},{"id":"gb","abbr":"GB","city":"Green Bay","name":"Packers","conference":"NFC","division":"North","colors":["#203731","#FFB612"],"aliases":["GNB"],"ink":"#fff"},{"id":"hou","abbr":"HOU","city":"Houston","name":"Texans","conference":"AFC","division":"South","colors":["#03202F","#A71930"],"aliases":[],"ink":"#fff"},{"id":"ind","abbr":"IND","city":"Indianapolis","name":"Colts","conference":"AFC","division":"South","colors":["#002C5F","#FFFFFF"],"aliases":[],"ink":"#fff"},{"id":"jax","abbr":"JAX","city":"Jacksonville","name":"Jaguars","conference":"AFC","division":"South","colors":["#006778","#D7A22A","#101820","#9F792C"],"aliases":["JAC"],"ink":"#fff"},{"id":"kc","abbr":"KC","city":"Kansas City","name":"Chiefs","conference":"AFC","division":"West","colors":["#E31837","#FFB81C"],"aliases":["KAN"],"ink":"#fff"},{"id":"lac","abbr":"LAC","city":"Los Angeles","name":"Chargers","conference":"AFC","division":"West","colors":["#0080C6","#FFC20E"],"aliases":["SD","SDG"],"ink":"#000"},{"id":"lar","abbr":"LAR","city":"Los Angeles","name":"Rams","conference":"NFC","division":"West","colors":["#003594","#FFD100","#D8D3CC"],"aliases":["LA","STL"],"ink":"#fff"},{"id":"lv","abbr":"LV","city":"Las Vegas","name":"Raiders","conference":"AFC","division":"West","colors":["#000000","#A5ACAF"],"aliases":["LVR","OAK"],"ink":"#fff"},{"id":"mia","abbr":"MIA","city":"Miami","name":"Dolphins","conference":"AFC","division":"East","colors":["#008E97","#FC4C02","#005778"],"aliases":[],"ink":"#000"},{"id":"min","abbr":"MIN","city":"Minnesota","name":"Vikings","conference":"NFC","division":"North","colors":["#4F2683","#FFC62F"],"aliases":[],"ink":"#fff"},{"id":"ne","abbr":"NE","city":"New England","name":"Patriots","conference":"AFC","division":"East","colors":["#002244","#C60C30","#B0B7BC"],"aliases":["NWE"],"ink":"#fff"},{"id":"no","abbr":"NO","city":"New Orleans","name":"Saints","conference":"NFC","division":"South","colors":["#D3BC8D","#101820"],"aliases":["NOR"],"ink":"#000"},{"id":"nyg","abbr":"NYG","city":"New York","name":"Giants","conference":"NFC","division":"East","colors":["#0B2265","#A71930","#A5ACAF"],"aliases":[],"ink":"#fff"},{"id":"nyj","abbr":"NYJ","city":"New York","name":"Jets","conference":"AFC","division":"East","colors":["#125740","#FFFFFF","#000000"],"aliases":[],"ink":"#fff"},{"id":"phi","abbr":"PHI","city":"Philadelphia","name":"Eagles","conference":"NFC","division":"East","colors":["#004C54","#A5ACAF","#000000"],"aliases":[],"ink":"#fff"},{"id":"pit","abbr":"PIT","city":"Pittsburgh","name":"Steelers","conference":"AFC","division":"North","colors":["#101820","#FFB612","#C60C30","#003087","#A5ACAF"],"aliases":[],"ink":"#fff"},{"id":"sea","abbr":"SEA","city":"Seattle","name":"Seahawks","conference":"NFC","division":"West","colors":["#002244","#69BE28","#A5ACAF"],"aliases":[],"ink":"#fff"},{"id":"sf","abbr":"SF","city":"San Francisco","name":"49ers","conference":"NFC","division":"West","colors":["#AA0000","#B3995D"],"aliases":["SFO"],"ink":"#fff"},{"id":"tb","abbr":"TB","city":"Tampa Bay","name":"Buccaneers","conference":"NFC","division":"South","colors":["#A71930","#322F2B","#DC4405"],"aliases":["TAM"],"ink":"#fff"},{"id":"ten","abbr":"TEN","city":"Tennessee","name":"Titans","conference":"AFC","division":"South","colors":["#0C2340","#4B92DB","#C8102E","#8A8D8F"],"aliases":[],"ink":"#fff"},{"id":"was","abbr":"WAS","city":"Washington","name":"Commanders","conference":"NFC","division":"East","colors":["#5A1414","#FFB612"],"aliases":["WSH"],"ink":"#fff"}];
const conferences = ["AFC","NFC"];
const divisions = ["East","North","South","West"];
window.FacetTeams = { teams, conferences, divisions, findTeam: createTeamIndex(teams), teamHTML, matchupHTML, mountTeams };
})();
