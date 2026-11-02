// Hidden Gems, artifact host. Reads two documents from the artifact database, written by the
// ingestion pipeline (pnpm job snapshot): hg/slate and hg/health. Markup mirrors apps/web and
// packages/facet (patterns/hidden-gems.md); TEAM_NAMES is injected at build time.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ZONE = 'America/New_York';
  const state = { slate: null, health: null, status: 'loading' };

  // ---- formats (patterns/hidden-gems.md, "Number formats"; Facet time rules)
  const pct = (p) => `${Math.round(p * 100)}%`;
  const odds = (d) => d.toFixed(2);
  const points = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} pts`;
  const kickoff = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  const clock = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  function ago(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 45e3) return 'Just now';
    if (ms < 36e5) return `${Math.max(1, Math.round(ms / 6e4))}m ago`;
    if (ms < 864e5) return `${Math.floor(ms / 36e5)}h ago`;
    if (ms < 6048e5) return `${Math.floor(ms / 864e5)}d ago`;
    return clock(iso);
  }
  const duration = (ms) => (ms == null ? '–' : ms < 1e4 ? `${(ms / 1e3).toFixed(1)}s` : `${Math.round(ms / 1e3)}s`);

  // ---- marks
  const SIGNALS = ['setup', 'trackRecord', 'sample', 'priceGap', 'matchup', 'market'];
  const VERDICT = { go: 'Go', wait: 'Wait', stop: 'Stop', none: 'Unchecked' };
  function summary(signals) {
    const words = { go: 'go', wait: 'wait', stop: 'stop', none: 'unchecked' };
    return ['go', 'wait', 'stop', 'none'].map((s) => [s, SIGNALS.filter((k) => signals[k] === s).length]).filter(([, n]) => n).map(([s, n]) => `${n} ${words[s]}`).join(', ');
  }
  const strip = (signals) => `<span class="fc-signal-strip" role="img" aria-label="${esc(summary(signals))}">${SIGNALS.map((s) => `<i data-signal="${esc(signals[s] || 'none')}"></i>`).join('')}</span>`;
  const verdict = (v) => `<span class="fc-signal" data-signal="${esc(v)}">${VERDICT[v] || esc(v)}</span>`;
  const gem = (t) => (t ? `<span class="fc-gem" data-tier="${esc(t)}" data-motion="once"><span class="fc-gem-facets" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(t[0].toUpperCase() + t.slice(1))}</span>` : '–');
  const edge = (n) => `<span class="fc-delta" data-direction="${n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral'}">${points(n)}</span>`;
  function player(p) {
    const team = p.teamId && TEAM_NAMES[p.teamId];
    const tile = team
      ? `<span class="fc-player-avatar" data-team="${esc(p.teamId)}" data-size="sm" role="img" aria-label="${esc(team)}"></span>`
      : '<span class="fc-player-avatar" data-size="sm" aria-hidden="true"></span>';
    const num = p.number != null ? `<span class="fc-player-number"><span aria-hidden="true">#${esc(p.number)}</span><span class="fc-visually-hidden">, number ${esc(p.number)}</span></span>` : '';
    const side = p.side === 'yes' ? '' : `, ${p.side} ${p.line ?? ''}`.trimEnd();
    const detail = [p.position, `${p.market}${side}`].filter(Boolean).join(' · ');
    return `<span class="fc-player">${tile}<span class="fc-player-main"><span class="fc-player-line"><span class="fc-player-name">${esc(p.name)}</span>${num}</span><span class="fc-player-meta">${esc(detail)}</span></span></span>`;
  }
  function runStatus(status, owner) {
    if (status === 'failed' && owner === 'provider') return '<span class="fc-level" data-level="warning">Provider down</span>';
    const map = { succeeded: ['success', 'Succeeded'], warned: ['warning', 'Warned'], failed: ['error', 'Failed'], running: ['info', 'Running'] };
    const [level, word] = map[status] || ['info', status || 'Never run'];
    return `<span class="fc-level" data-level="${level}">${esc(word)}</span>`;
  }
  const timeCell = (iso) => (iso ? `<td data-align="numeric" class="fc-time-cell"><time datetime="${esc(iso)}">${clock(iso)}</time><time class="fc-time-cell-rel" datetime="${esc(iso)}" data-relative>${ago(iso)}</time></td>` : '<td data-align="numeric">–</td>');
  const note = (text, type) => `<div class="fc-note" data-size="small"${type ? ` data-type="${type}"` : ''}><span>${esc(text)}</span></div>`;

  // ---- views
  function emptyState(title, body) {
    return `<div class="fc-empty"><strong>${esc(title)}</strong><span class="text-copy-14">${esc(body)}</span></div>`;
  }
  function waiting() {
    if (state.status === 'unavailable') return emptyState('Open in claude.ai to load the slate', 'The slate lives in this page’s database, which loads only inside claude.ai.');
    if (state.status === 'error') return emptyState('The slate could not load', 'Reload the page. If it keeps failing, the database may be unavailable for a moment.');
    if (state.status === 'loading') return emptyState('Loading the slate', 'Reading the latest pull from this page’s database.');
    return emptyState('No picks yet', 'The slate fills in after the first pull is published here.');
  }

  function renderSlate() {
    const s = state.slate;
    const el = $('view-slate');
    if (!s || !s.picks || !s.picks.length) { el.innerHTML = `<h1 class="fc-visually-hidden">Slate</h1>${waiting()}`; return; }
    const fresh = s.oddsUpdatedAt && Date.now() - new Date(s.oddsUpdatedAt).getTime() < 15 * 6e4;
    const status = s.oddsUpdatedAt
      ? `<p class="fc-status"><span class="fc-status-dot" data-state="${fresh ? 'live' : 'stale'}" aria-hidden="true"></span><span>Odds updated <time datetime="${esc(s.oddsUpdatedAt)}" title="${esc(clock(s.oddsUpdatedAt))}" data-relative>${ago(s.oddsUpdatedAt)}</time></span></p>`
      : '';
    const notes = [
      s.dataMode === 'sample' ? note('Sample data. The pipeline switches to live odds once API keys are added.') : '',
      s.model === 'consensus-v0' ? note('Estimates compare each book with the others until the model lands, so every verdict reads Unchecked.') : '',
    ].join('');
    const rows = s.picks.map((p) => `<tr>
      <th scope="row">${player(p)}</th>
      <td><time datetime="${esc(p.kickoff)}">${kickoff(p.kickoff)}</time></td>
      <td>${esc(p.book)}</td>
      <td data-align="numeric">${odds(p.price)}</td>
      <td data-align="numeric">${pct(p.priced)}</td>
      <td data-align="numeric">${pct(p.estimate)}</td>
      <td data-align="numeric">${edge(p.gap)}</td>
      <td>${strip(p.signals || {})}</td>
      <td>${verdict(p.verdict)}</td>
      <td>${gem(p.tier)}</td>
    </tr>`).join('');
    el.innerHTML = `<h1 class="fc-visually-hidden">Slate</h1>
      <div class="hg-meta">${status}</div>
      ${notes}
      <div class="fc-table-wrap">
        <table class="fc-table" data-interactive data-sticky-column>
          <caption class="fc-visually-hidden">Picks sorted by gap, largest first</caption>
          <thead><tr>
            <th scope="col" data-grow>Pick<span class="fc-th-count">${s.picks.length}</span></th>
            <th scope="col">Kickoff</th>
            <th scope="col">Book</th>
            <th scope="col" data-align="numeric">Odds</th>
            <th scope="col" data-align="numeric">Priced</th>
            <th scope="col" data-align="numeric">Our est.</th>
            <th scope="col" data-align="numeric">Gap</th>
            <th scope="col">Signals</th>
            <th scope="col">Verdict</th>
            <th scope="col">Gem tier</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const PROVIDERS = { 'odds-api': 'The Odds API', sportsdataio: 'SportsDataIO', sample: 'Sample' };
  const LABELS = { 'pull-odds': 'Odds', 'pull-schedule': 'Schedule', 'pull-rosters': 'Rosters', 'pull-results': 'Results', 'build-picks': 'Picks' };
  function renderData() {
    const h = state.health;
    const el = $('view-data');
    if (!h) { el.innerHTML = `<h1 class="text-heading-32">Data</h1>${waiting()}`; return; }
    const sources = h.sources.map((s) => `<tr>
      <th scope="row">${esc(s.label)}</th>
      <td>${s.provider ? esc(PROVIDERS[s.provider] || s.provider) : '–'}</td>
      <td>${runStatus(s.status, s.owner)}</td>
      ${timeCell(s.startedAt)}
      <td>${esc(s.cadence)}</td>
    </tr>`).join('');
    const log = h.runs.length ? h.runs.map((r) => `<tr>
      <td>${runStatus(r.status, r.owner)}</td>
      <td>${esc(LABELS[r.job] || r.job)}</td>
      <td>${esc(r.message)}</td>
      ${timeCell(r.startedAt)}
      <td data-align="numeric">${duration(r.durationMs)}</td>
    </tr>`).join('') : '<tr><td colspan="5">No runs yet</td></tr>';
    const usage = h.usage.map((u) => `<p class="text-copy-14">${esc(PROVIDERS[u.provider] || u.provider)} quota: ${u.remaining != null ? u.remaining.toLocaleString('en-US') : '–'} requests left, ${u.used != null ? u.used.toLocaleString('en-US') : '–'} used</p>`).join('');
    el.innerHTML = `<div class="fc-page-header"><div class="fc-page-header-text"><h1 class="text-heading-32">Data</h1></div></div>
      <section class="hg-section" aria-labelledby="sources-h">
        <h2 id="sources-h" class="text-heading-20">Sources</h2>
        <div class="fc-table-wrap"><table class="fc-table">
          <thead><tr><th scope="col">Data</th><th scope="col">Provider</th><th scope="col">Last run</th><th scope="col" data-align="numeric">When</th><th scope="col" data-grow>Cadence</th></tr></thead>
          <tbody>${sources}</tbody>
        </table></div>
        ${usage}
      </section>
      <section class="hg-section" aria-labelledby="log-h">
        <h2 id="log-h" class="text-heading-20">Pull log</h2>
        <div class="fc-table-wrap"><table class="fc-table">
          <caption class="fc-visually-hidden">Newest first, ${h.runs.length} runs</caption>
          <thead><tr><th scope="col">Status</th><th scope="col">Job</th><th scope="col" data-grow>Message</th><th scope="col" data-align="numeric">Started</th><th scope="col" data-align="numeric">Ran</th></tr></thead>
          <tbody>${log}</tbody>
        </table></div>
      </section>`;
  }

  // ---- routing (#slate, #data)
  function route() {
    const view = location.hash === '#data' ? 'data' : 'slate';
    $('view-slate').hidden = view !== 'slate';
    $('view-data').hidden = view !== 'data';
    document.querySelectorAll('.fc-tab[data-view]').forEach((a) => {
      if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function render() { renderSlate(); renderData(); }
  addEventListener('hashchange', route);
  route();
  render();
  // Relative times stay honest while the page is open.
  setInterval(render, 60e3);

  // ---- data
  (async () => {
    const timer = setTimeout(() => { if (state.status === 'loading') { state.status = 'unavailable'; render(); } }, 10e3);
    const db = window.claude && (await window.claude.use('db'));
    if (!db) { clearTimeout(timer); state.status = 'unavailable'; render(); return; }
    const fail = () => { clearTimeout(timer); state.status = 'error'; render(); };
    db.doc('hg/slate').onSnapshot((snap) => {
      clearTimeout(timer);
      state.status = 'ready';
      state.slate = snap.exists ? snap.data() : null;
      render();
    }, fail);
    db.doc('hg/health').onSnapshot((snap) => {
      state.health = snap.exists ? snap.data() : null;
      render();
    }, fail);
  })();
})();
