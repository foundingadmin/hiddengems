// Moves the bought history between the local cache and the private backup repository's capsule layout, so any later
// replay costs 0 credits.
//
//   tsx ops/backtest/capsule-io.ts export <backups clone>   cache to capsules/2026/wkNN/{sat,close}/odds/<gameId>.json.gz
//   tsx ops/backtest/capsule-io.ts import <backups clone>   capsules back to experiments/backtest/cache/odds
//
// Each capsule file holds the merged raw event (raw, the same shape the live capsule job writes) and the original
// responses (parts), which import writes back byte for byte. The board of a Thursday game (Wednesday 7:47 PM Mountain)
// sits under sat/ because it is that game's board.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { capsulePath, findTeam, gameId } from '../../packages/core/src/index';
import { HISTORY_PLAN_PATH, type HistoryBoard, type HistoryGame } from './history-plan';
import { ODDS_DIR } from './paths';

const plan: { games: HistoryGame[]; boards: HistoryBoard[] } = JSON.parse(readFileSync(HISTORY_PLAN_PATH, 'utf8'));
const [mode, target] = process.argv.slice(2);
if (!target || !['export', 'import'].includes(mode!)) { console.error('Usage: capsule-io.ts export|import <backups clone>'); process.exit(1); }
const gz = (o: unknown) => gzipSync(Buffer.from(JSON.stringify(o)), { level: 9, mtime: 0 } as never);
const team = (n: string) => findTeam(n)!.id;
const idOf = (e: { commence_time: string; away_team: string; home_team: string }) => gameId(new Date(e.commence_time), team(e.away_team), team(e.home_team));

interface Part { dir: string; file: string; body: { timestamp: string; data: { bookmakers: { key: string; markets: { key: string }[] }[] } } }

function merge(parts: Part[]) {
  const raw = structuredClone(parts[0]!.body.data) as Part['body']['data'];
  for (const p of parts.slice(1)) for (const b of p.body.data.bookmakers) {
    const mine = raw.bookmakers.find((x) => x.key === b.key);
    if (!mine) raw.bookmakers.push(structuredClone(b));
    else for (const m of b.markets) if (!mine.markets.some((x) => x.key === m.key)) mine.markets.push(structuredClone(m));
  }
  return raw;
}

if (mode === 'export') {
  let files = 0, bytes = 0;
  const put = (path: string, buf: Buffer) => { const f = `${target}/${path}`; mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, buf); files++; bytes += buf.length; };
  for (const week of [...new Set(plan.games.map((g) => g.week))]) {
    const groups = new Map<string, Part[]>();
    for (const dir of ['board', 'board2', 'close', 'close2']) {
      const path = `${ODDS_DIR}/wk${week}/${dir}`;
      if (!existsSync(path)) continue;
      for (const file of readdirSync(path).filter((f) => f.endsWith('.json'))) {
        const body = JSON.parse(readFileSync(`${path}/${file}`, 'utf8'));
        const k = `${dir.startsWith('board') ? 'sat' : 'close'}|${idOf(body.data)}`;
        groups.set(k, [...(groups.get(k) ?? []), { dir, file, body }]);
      }
    }
    for (const [k, parts] of groups) {
      const [kind, gid] = k.split('|') as ['sat' | 'close', string];
      const g = plan.games.find((x) => x.gameId === gid);
      const asked = kind === 'sat' ? g?.boardAt : g?.closeAt;
      put(capsulePath(2026, week, kind, `odds/${gid}.json.gz`), gz({
        capturedAt: parts.map((p) => p.body.timestamp).sort().at(-1), gameId: gid, kickoff: g?.kickoff ?? null, asked: asked ?? null,
        source: 'odds-api historical', board: kind === 'sat' ? (g?.day === 'thu' ? 'wednesday' : 'saturday') : null,
        raw: merge(parts), parts,
      }));
    }
    for (const f of readdirSync(`${ODDS_DIR}/wk${week}`).filter((x) => x.endsWith('.json'))) {
      put(capsulePath(2026, week, 'sat', `odds-lists/${f.replace('.json', '.json.gz')}`), gz({ file: f, body: JSON.parse(readFileSync(`${ODDS_DIR}/wk${week}/${f}`, 'utf8')) }));
    }
  }
  for (const f of ['spend.json', 'history-spend.json']) if (existsSync(`${ODDS_DIR}/${f}`)) put(`capsules/2026/backtest/${f}`, readFileSync(`${ODDS_DIR}/${f}`));
  console.log(`Exported ${files} files, ${(bytes / 1e6).toFixed(1)} MB gzipped, to ${target}/capsules/2026`);
}

if (mode === 'import') {
  let files = 0;
  const write = (path: string, text: string) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); files++; };
  for (const week of [...new Set(plan.games.map((g) => g.week))]) {
    for (const kind of ['sat', 'close'] as const) {
      const dir = `${target}/${capsulePath(2026, week, kind, 'odds')}`;
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json.gz'))) {
        const c = JSON.parse(gunzipSync(readFileSync(`${dir}/${f}`)).toString('utf8'));
        if (c.source !== 'odds-api historical') continue; // live capsules are not part of the backtest cache
        for (const p of c.parts as Part[]) write(`${ODDS_DIR}/wk${week}/${p.dir}/${p.file}`, JSON.stringify(p.body));
      }
    }
    const lists = `${target}/${capsulePath(2026, week, 'sat', 'odds-lists')}`;
    if (existsSync(lists)) for (const f of readdirSync(lists)) {
      const c = JSON.parse(gunzipSync(readFileSync(`${lists}/${f}`)).toString('utf8'));
      write(`${ODDS_DIR}/wk${week}/${c.file}`, JSON.stringify(c.body));
    }
  }
  console.log(`Imported ${files} files into ${ODDS_DIR}`);
}
