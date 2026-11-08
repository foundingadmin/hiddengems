// Buys the history in experiments/backtest/history-plan.json from The Odds API (paid key), once per file.
//
//   tsx ops/backtest/fetch-history.ts --dry               credit estimate from the plan and the cache, no calls
//   tsx ops/backtest/fetch-history.ts --max-credits N     buys what the cache lacks, stops before N credits
//
// Per board: the historical event list (1 credit, the Saturday ones are already cached) and one historical odds list
// with spreads and totals for every game (20 credits). Per game: its board and its close for the markets the plan names
// (10 credits per market returned). Raw responses are cached under experiments/backtest/cache/odds/wkN/, never
// committed. Every snapshot must be dated at or before the moment asked for, or the run stops.
// The key comes from ODDS_API_KEY_HISTORICAL only, never the production ODDS_API_KEY.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findTeam, gameId } from '../../packages/core/src/index';
import { GAME_MARKETS, HISTORY_PLAN_PATH, type HistoryBoard, type HistoryGame } from './history-plan';
import { ODDS_DIR, OUT_DIR } from './paths';

const BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl';
export const BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm', 'williamhill_us', 'fanatics'];
const iso = (s: string) => s.replace('.000Z', 'Z');

export const eventsFile = (b: HistoryBoard) => `${ODDS_DIR}/wk${b.week}/${b.day === 'sat' ? 'events' : 'events-wed'}.json`;
export const linesFile = (b: HistoryBoard) => `${ODDS_DIR}/wk${b.week}/lines-${b.day}.json`;
export const historyFile = (week: number, kind: 'board2' | 'close2', eventId: string) => `${ODDS_DIR}/wk${week}/${kind}/${eventId}.json`;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const maxCredits = Number(args[args.indexOf('--max-credits') + 1]) || 0;
const plan: { games: HistoryGame[]; boards: HistoryBoard[] } = JSON.parse(readFileSync(HISTORY_PLAN_PATH, 'utf8'));
const byId = new Map(plan.games.map((g) => [g.gameId, g]));

/** Our game id for an Odds API event, or null when a team is unknown. */
export function eventGameId(e: { commence_time: string; away_team: string; home_team: string }): string | null {
  const a = findTeam(e.away_team)?.id, h = findTeam(e.home_team)?.id;
  return a && h ? gameId(new Date(e.commence_time), a, h) : null;
}

function estimate() {
  let upper = 0, cachedCalls = 0, calls = 0;
  for (const b of plan.boards) {
    calls += 2;
    if (existsSync(eventsFile(b))) cachedCalls++; else upper += 1;
    if (existsSync(linesFile(b))) cachedCalls++; else upper += 10 * GAME_MARKETS.length;
  }
  upper += plan.games.reduce((n, g) => n + 2 * 10 * g.buy.length, 0);
  calls += plan.games.length * 2;
  return { upper, calls, cachedCalls };
}

async function main() {
  const e = estimate();
  const sun = plan.games.filter((g) => g.day === 'sun').length, night = plan.games.length - sun;
  console.log(`Plan: ${plan.games.length} games (${sun} Sunday, ${night} Thursday or Monday), ${plan.boards.length} boards`);
  console.log(`Upper bound: ${e.upper} credits (${sun} x 2 x ${10 * plan.games.find((g) => g.day === 'sun')!.buy.length} + ${night} x 2 x ${10 * plan.games.find((g) => g.day !== 'sun')!.buy.length} + boards), ${e.cachedCalls} of ${e.calls} board calls cached. Odds files already cached are skipped at run time.`);
  if (dry) return;
  if (!maxCredits) throw new Error('Pass --max-credits. Nothing bought.');
  const key = process.env.ODDS_API_KEY_HISTORICAL;
  if (!key) throw new Error('Set ODDS_API_KEY_HISTORICAL (the paid key). Nothing bought.');
  if (process.env.ODDS_API_KEY && process.env.ODDS_API_KEY === key) throw new Error('That is the production key. Nothing bought.');
  // The first buy's Saturday lists and boards must be here, or this run would leave Sunday games without their first markets.
  const missingFirst = plan.boards.filter((b) => b.day === 'sat' && !existsSync(eventsFile(b)));
  if (missingFirst.length) throw new Error(`The first buy's cache is missing (weeks ${missingFirst.map((b) => b.week).join(', ')}). Nothing bought.`);

  let spent = 0;
  let remaining: string | null = null;
  const buy = async (url: string, path: string, cost: number, note: string) => {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    if (spent + cost > maxCredits) throw new Error(`Stopping before ${note}: it could pass --max-credits ${maxCredits} (spent ${spent})`);
    const res = await fetch(`${url}&apiKey=${encodeURIComponent(key)}`);
    spent += Number(res.headers.get('x-requests-last') ?? cost);
    remaining = res.headers.get('x-requests-remaining') ?? remaining;
    if (!res.ok) throw new Error(`${note}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(body));
    return body;
  };
  const guard = (body: { timestamp?: string }, asked: string, note: string) => {
    if (!body?.timestamp || new Date(body.timestamp) > new Date(asked)) throw new Error(`Guard: ${note} snapshot ${body?.timestamp} is not at or before ${asked}`);
  };
  const q = (markets: string[], date: string) => `regions=us&oddsFormat=decimal&dateFormat=iso&markets=${markets.join(',')}&bookmakers=${BOOKMAKERS.join(',')}&date=${iso(date)}`;

  try {
    for (const b of plan.boards) {
      const list = await buy(`${BASE}/events?date=${iso(b.boardAt)}&dateFormat=iso`, eventsFile(b), 1, `week ${b.week} ${b.day} event list`);
      guard(list, b.boardAt, `week ${b.week} ${b.day} event list`);
      const lines = await buy(`${BASE}/odds?${q(GAME_MARKETS, b.boardAt)}`, linesFile(b), 10 * GAME_MARKETS.length, `week ${b.week} ${b.day} game lines`);
      guard(lines, b.boardAt, `week ${b.week} ${b.day} game lines`);
      const events = new Map<string, { id: string; commence_time: string; away_team: string; home_team: string }>();
      for (const ev of list.data) { const id = eventGameId(ev); if (id) events.set(id, ev); }
      for (const gid of b.games) {
        const g = byId.get(gid)!;
        const ev = events.get(gid);
        if (!ev) { console.warn(`Week ${b.week}: ${gid} is not in the ${b.day} event list, skipped`); continue; }
        const board = await buy(`${BASE}/events/${ev.id}/odds?${q(g.buy, g.boardAt)}`, historyFile(g.week, 'board2', ev.id), 10 * g.buy.length, `${gid} board`);
        guard(board, g.boardAt, `${gid} board`);
        const close = await buy(`${BASE}/events/${ev.id}/odds?${q(g.buy, g.closeAt)}`, historyFile(g.week, 'close2', ev.id), 10 * g.buy.length, `${gid} close`);
        guard(close, g.closeAt, `${gid} close`);
        if (new Date(close.timestamp) <= new Date(g.boardAt)) throw new Error(`Guard: ${gid} close ${close.timestamp} is not after its board`);
      }
      console.log(`Week ${b.week} ${b.day}: ${b.games.length} games cached, ${spent} credits spent so far`);
    }
  } finally {
    console.log(`Spent ${spent} credits this run, ${remaining ?? 'unknown'} left on the plan.`);
    const log = `${ODDS_DIR}/history-spend.json`;
    const runs = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
    mkdirSync(dirname(log), { recursive: true });
    writeFileSync(log, JSON.stringify([...runs, { at: new Date().toISOString(), spent, remaining }], null, 2));
    writeFileSync(`${OUT_DIR}/history-spend.json`, JSON.stringify([...runs, { at: new Date().toISOString(), spent, remaining }], null, 2));
  }
}

main().catch((err) => { console.error(String(err?.message ?? err)); process.exit(1); });
