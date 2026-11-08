// Moves the season buy (fetch-seasons.ts) between the local cache and the private backup repository, and writes the
// catalog for every week it touches.
//
//   tsx ops/backtest/season-capsules.ts export <backups clone>    cache to capsules/<season>/wkNN/{early,sat,close}/odds
//   tsx ops/backtest/season-capsules.ts import <backups clone>    capsules back to experiments/backtest/cache/odds/s<season>
//   tsx ops/backtest/season-capsules.ts catalog <backups clone>   capsules/<season>/wkNN/catalog.json and CATALOG.md
//
// Same capsule format as the 2026 history (capsule-io.ts): the raw event plus the original response, which import
// writes back byte for byte. A board of a game not played Sunday or Monday (7:47 PM Mountain the night before) sits
// under sat as that game's board. The catalog reads every capsule in the week, the 2026 history buy's included.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { findTeam, gameId } from '../../packages/core/src/index';
import { ODDS_DIR } from './paths';
import { SEASON_PLAN_PATH, type SeasonGame, YARD_KEYS } from './season-plan';

const SOURCE = 'odds-api historical seasons';
const KIND = { board: 'sat', close: 'close', early: 'early' } as const;
const plan: { games: SeasonGame[] } = JSON.parse(readFileSync(SEASON_PLAN_PATH, 'utf8'));
const byGame = new Map(plan.games.map((g) => [`${g.season}|${g.gameId}`, g]));
const pad = (n: number) => String(n).padStart(2, '0');
const gz = (o: unknown) => gzipSync(Buffer.from(JSON.stringify(o)), { level: 9 });
const unzip = (f: string) => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const idOf = (e: { commence_time: string; away_team: string; home_team: string }) => gameId(new Date(e.commence_time), findTeam(e.away_team)!.id, findTeam(e.home_team)!.id);
const seasonsIn = () => (existsSync(ODDS_DIR) ? readdirSync(ODDS_DIR).filter((d) => /^s\d{4}$/.test(d)) : []);

function exportTo(target: string) {
  let files = 0, bytes = 0;
  const put = (path: string, buf: Buffer) => { const f = `${target}/${path}`; mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, buf); files++; bytes += buf.length; };
  for (const sd of seasonsIn()) {
    const season = Number(sd.slice(1));
    for (const wd of readdirSync(`${ODDS_DIR}/${sd}`)) {
      const week = Number(wd.slice(2));
      const base = `${ODDS_DIR}/${sd}/${wd}`;
      for (const kind of Object.keys(KIND) as (keyof typeof KIND)[]) {
        if (!existsSync(`${base}/${kind}`)) continue;
        for (const file of readdirSync(`${base}/${kind}`).filter((f) => f.endsWith('.json'))) {
          const body = JSON.parse(readFileSync(`${base}/${kind}/${file}`, 'utf8'));
          const gid = idOf(body.data);
          const g = byGame.get(`${season}|${gid}`);
          put(`capsules/${season}/wk${pad(week)}/${KIND[kind]}/odds/${gid}.json.gz`, gz({
            capturedAt: body.timestamp, gameId: gid, kickoff: g?.kickoff ?? body.data.commence_time,
            asked: kind === 'board' ? g?.boardAt : kind === 'close' ? g?.closeAt : g?.earlyAt, source: SOURCE,
            board: kind === 'board' ? (g && !['Sun', 'Mon'].includes(g.weekday) ? 'night before game day' : 'saturday') : null,
            raw: body.data, parts: [{ dir: `${sd}/${wd}/${kind}`, file, body }],
          }));
        }
      }
      for (const f of readdirSync(base).filter((x) => x.endsWith('.json'))) {
        put(`capsules/${season}/wk${pad(week)}/sat/odds-lists/${f}.gz`, gz({ dir: `${sd}/${wd}`, file: f, body: JSON.parse(readFileSync(`${base}/${f}`, 'utf8')) }));
      }
    }
    if (existsSync(`${ODDS_DIR}/seasons-spend.json`)) put('capsules/backtest/seasons-spend.json', readFileSync(`${ODDS_DIR}/seasons-spend.json`));
  }
  console.log(`Exported ${files} files, ${(bytes / 1e6).toFixed(1)} MB gzipped`);
}

function importFrom(target: string) {
  let files = 0;
  const write = (path: string, text: string) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); files++; };
  for (const season of readdirSync(`${target}/capsules`).filter((d) => /^\d{4}$/.test(d))) {
    for (const wk of readdirSync(`${target}/capsules/${season}`).filter((d) => /^wk\d\d$/.test(d))) {
      for (const kind of ['sat', 'close', 'early']) {
        const dir = `${target}/capsules/${season}/${wk}/${kind}/odds`;
        if (!existsSync(dir)) continue;
        for (const f of readdirSync(dir).filter((x) => x.endsWith('.json.gz'))) {
          const c = unzip(`${dir}/${f}`);
          if (c.source !== SOURCE) continue;
          for (const p of c.parts) write(`${ODDS_DIR}/${p.dir}/${p.file}`, JSON.stringify(p.body));
        }
      }
      const lists = `${target}/capsules/${season}/${wk}/sat/odds-lists`;
      if (existsSync(lists)) for (const f of readdirSync(lists)) {
        const c = unzip(`${lists}/${f}`);
        if (c.dir) write(`${ODDS_DIR}/${c.dir}/${c.file}`, JSON.stringify(c.body));
      }
    }
  }
  console.log(`Imported ${files} files into ${ODDS_DIR}`);
}

interface Snap { asked: string | null; at: string; books: string[]; dk: Record<string, { lines: number; players: number }> }

/** Per week: every game, its snapshots, what DraftKings posted per key (player and line pairs), and the gaps. */
function catalog(target: string) {
  const season: Record<string, { week: number; games: number; snaps: Record<string, number>; missing: string[]; thin: string[] }[]> = {};
  const weeks: [number, number][] = [...plan.games.map((g) => [g.season, g.week] as [number, number])];
  const seen = new Set<string>();
  const perKey: Record<string, number[]> = {};
  interface GameRow { gameId: string; weekday: string; kickoff: string; snaps: Record<string, Snap | null>; gaps: string[] }
  const rows: { season: number; week: number; out: { season: number; week: number; games: GameRow[] } }[] = [];
  for (const [s, w] of weeks) {
    if (seen.has(`${s}|${w}`)) continue;
    seen.add(`${s}|${w}`);
    const games = plan.games.filter((g) => g.season === s && g.week === w);
    const out = { season: s, week: w, games: [] as GameRow[] };
    for (const g of games) {
      const snaps: Record<string, Snap | null> = {};
      const gaps: string[] = [];
      for (const kind of ['early', 'sat', 'close']) {
        const f = `${target}/capsules/${s}/wk${pad(w)}/${kind}/odds/${g.gameId}.json.gz`;
        if (!existsSync(f)) { snaps[kind] = null; continue; }
        const c = unzip(f);
        const dk: Snap['dk'] = {};
        for (const b of c.raw.bookmakers) if (b.key === 'draftkings') for (const m of b.markets) {
          const pairs = new Set(m.outcomes.map((o: { description: string; point: number }) => `${o.description}|${o.point}`));
          dk[m.key] = { lines: pairs.size, players: new Set(m.outcomes.map((o: { description: string }) => o.description)).size };
        }
        snaps[kind] = { asked: c.asked ?? null, at: c.capturedAt, books: c.raw.bookmakers.map((b: { key: string }) => b.key), dk };
        const want = kind === 'early' ? YARD_KEYS.filter((k) => !k.endsWith('_alternate')) : YARD_KEYS;
        for (const k of want) if (!dk[k]) gaps.push(`${kind} DraftKings ${k} not posted`);
        if (kind === 'sat') for (const k of YARD_KEYS.filter((x) => x.endsWith('_alternate'))) if (dk[k]) (perKey[`${s}|${k}`] ??= []).push(dk[k]!.lines);
      }
      out.games.push({ gameId: g.gameId, weekday: g.weekday, kickoff: g.kickoff, snaps, gaps });
    }
    rows.push({ season: s, week: w, out });
  }
  // Thin alt ladder: a game's board ladder under 40% of that key's season median.
  const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[a.length >> 1]! : 0; };
  for (const { season: s, week: w, out } of rows) {
    const thin: string[] = [];
    for (const g of out.games) {
      for (const k of YARD_KEYS.filter((x) => x.endsWith('_alternate'))) {
        const n = g.snaps.sat?.dk[k]?.lines;
        const m = med(perKey[`${s}|${k}`] ?? []);
        if (n !== undefined && m && n < 0.4 * m) thin.push(`${g.gameId} ${k} ${n} lines (season median ${m})`);
      }
    }
    const file = `${target}/capsules/${s}/wk${pad(w)}/catalog.json`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify({ ...out, thin, writtenAt: new Date().toISOString() }, null, 1)}\n`);
    const gs = out.games;
    (season[s] ??= []).push({
      week: w, games: gs.length,
      snaps: Object.fromEntries(['early', 'sat', 'close'].map((k) => [k, gs.filter((g) => g.snaps[k]).length])),
      missing: gs.flatMap((g) => g.gaps), thin,
    });
  }
  for (const [s, ws] of Object.entries(season)) {
    const L = [`# ${s} odds catalog`, '', 'Per week, games with each snapshot (early, board, close), DraftKings keys not posted, and thin alt ladders (a board ladder under 40% of that key\'s season median). Detail per game in each week\'s catalog.json.', '',
      '| Week | Games | Early | Board | Close | Not posted | Thin alt ladders |', '|---|---|---|---|---|---|---|'];
    for (const w of ws.sort((a, b) => a.week - b.week)) L.push(`| ${w.week} | ${w.games} | ${w.snaps.early} | ${w.snaps.sat} | ${w.snaps.close} | ${w.missing.length ? w.missing.length : 0} | ${w.thin.length} |`);
    const allMissing = ws.flatMap((w) => w.missing.map((m) => `Week ${w.week} ${m}`));
    const allThin = ws.flatMap((w) => w.thin.map((m) => `Week ${w.week} ${m}`));
    L.push('', '## Not posted', '', ...(allMissing.length ? allMissing.map((m) => `- ${m}`) : ['- Nothing']), '', '## Thin alt ladders', '', ...(allThin.length ? allThin.map((m) => `- ${m}`) : ['- None']), '');
    writeFileSync(`${target}/capsules/${s}/CATALOG.md`, L.join('\n'));
    console.log(`${s}: ${ws.length} weeks, ${ws.reduce((a, w) => a + w.games, 0)} games, ${allMissing.length} not posted, ${allThin.length} thin`);
  }
}

const [mode, target] = process.argv.slice(2);
if (!target) { console.error('Usage: season-capsules.ts export|import|catalog <backups clone>'); process.exit(1); }
if (mode === 'export') exportTo(target);
else if (mode === 'import') importFrom(target);
else if (mode === 'catalog') catalog(target);
else { console.error('Mode is export, import or catalog'); process.exit(1); }
