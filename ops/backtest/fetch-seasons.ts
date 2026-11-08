// Buys experiments/backtest/season-plan.json from The Odds API (paid key), in priority order, once per file.
//
//   tsx ops/backtest/fetch-seasons.ts --dry                         credit estimate from the plan and the cache, no calls
//   tsx ops/backtest/fetch-seasons.ts --probe                       one 2025 game's board, every key (81 credits)
//   tsx ops/backtest/fetch-seasons.ts --max-credits N --floor F     buys until N credits or until F would be crossed
//
// The floor is the plan balance that is never touched (credits locked for live capsules): a call that could take
// x-requests-remaining below it is never made. Raw responses are cached under experiments/backtest/cache/odds/s{season}/,
// never committed. Every snapshot must be dated at or before the moment asked for, or the run stops.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findTeam, gameId } from '../../packages/core/src/index';
import { ODDS_DIR, OUT_DIR } from './paths';
import { type Job, SEASON_PLAN_PATH, type SeasonGame, YARD_KEYS } from './season-plan';

const BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl';
const BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm', 'williamhill_us', 'fanatics'];
const iso = (s: string) => s.replace('.000Z', 'Z');
const slug = (s: string) => iso(s).replace(/[-:]/g, '');

export const seasonDir = (season: number, week: number) => `${ODDS_DIR}/s${season}/wk${week}`;
export const jobFile = (j: Job, eventId?: string) => j.kind === 'events' || j.kind === 'lines'
  ? `${seasonDir(j.season, j.week)}/${j.kind}-${slug(j.at)}.json`
  : `${seasonDir(j.season, j.week)}/${j.kind}/${eventId}.json`;

const plan: { games: SeasonGame[]; jobs: Job[] } = JSON.parse(readFileSync(SEASON_PLAN_PATH, 'utf8'));
const games = new Map(plan.games.map((g) => [`${g.season}|${g.gameId}`, g]));
const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : NaN);
const q = (markets: string[], date: string) => `regions=us&oddsFormat=decimal&dateFormat=iso&markets=${markets.join(',')}&bookmakers=${BOOKMAKERS.join(',')}&date=${iso(date)}`;
const eventGameId = (e: { commence_time: string; away_team: string; home_team: string }) => {
  const a = findTeam(e.away_team)?.id, h = findTeam(e.home_team)?.id;
  return a && h ? gameId(new Date(e.commence_time), a, h) : null;
};
const head = (r: Response) => ({ status: r.status, used: r.headers.get('x-requests-used'), remaining: r.headers.get('x-requests-remaining'), last: r.headers.get('x-requests-last') });

async function main() {
  const key = process.env.ODDS_API_KEY_HISTORICAL;
  if (args.includes('--dry')) {
    for (const p of [1, 2, 3]) {
      const todo = plan.jobs.filter((j) => j.priority === p && !(j.kind === 'events' || j.kind === 'lines' ? existsSync(jobFile(j)) : false));
      console.log(`Priority ${p}: ${todo.length} calls left, upper bound ${todo.reduce((a, j) => a + j.cost, 0).toLocaleString('en-US')} credits (game files already cached are skipped at run time)`);
    }
    return;
  }
  if (!key) throw new Error('Set ODDS_API_KEY_HISTORICAL (the paid key). Nothing bought.');
  if (process.env.ODDS_API_KEY && process.env.ODDS_API_KEY === key) throw new Error('That is the production key. Nothing bought.');

  if (args.includes('--probe')) {
    // A 2025 midseason Sunday game, so alt ladders are posted if DraftKings posted them at all that year.
    const g = plan.games.find((x) => x.season === 2025 && x.week === 6 && x.weekday === 'Sun' && x.kickoff.endsWith('17:00:00.000Z'))!;
    const listRes = await fetch(`${BASE}/events?date=${iso(g.boardAt)}&dateFormat=iso&apiKey=${encodeURIComponent(key)}`);
    const list = await listRes.json();
    const e = list.data.find((x: { commence_time: string; away_team: string; home_team: string }) => eventGameId(x) === g.gameId);
    if (!e) throw new Error(`${g.gameId} not in the event list at ${g.boardAt}`);
    const res = await fetch(`${BASE}/events/${e.id}/odds?${q(YARD_KEYS, g.boardAt)}&apiKey=${encodeURIComponent(key)}`);
    const text = await res.text();
    const out: Record<string, unknown> = { at: new Date().toISOString(), game: g.gameId, board: g.boardAt, list: head(listRes), odds: head(res) };
    if (res.ok) {
      const body = JSON.parse(text);
      out.snapshot = body.timestamp;
      out.books = Object.fromEntries(body.data.bookmakers.map((b: { key: string; markets: { key: string; outcomes: unknown[] }[] }) => [b.key, Object.fromEntries(b.markets.map((m) => [m.key, m.outcomes.length]))]));
      const file = `${seasonDir(2025, g.week)}/board/${e.id}.json`;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
      writeFileSync(`${seasonDir(2025, g.week)}/events-${slug(g.boardAt)}.json`, JSON.stringify(list));
    } else out.error = text.slice(0, 200);
    writeFileSync(`${OUT_DIR}/season-probe.json`, `${JSON.stringify(out, null, 2)}\n`);
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const max = arg('--max-credits'), floor = arg('--floor');
  if (!(max > 0) || !(floor >= 0)) throw new Error('Pass --max-credits and --floor. Nothing bought.');
  let spent = 0;
  let remaining: number | null = null;
  let firstRemaining: number | null = null;
  const gaps: { job: string; status: number; note: string }[] = [];
  const reached: Record<number, { done: number; of: number; last?: string }> = { 1: { done: 0, of: 0 }, 2: { done: 0, of: 0 }, 3: { done: 0, of: 0 } };
  for (const j of plan.jobs) reached[j.priority]!.of++;
  const events = new Map<string, Map<string, string>>();
  const listFor = (season: number, week: number, boardAt: string) => events.get(`${season}|${boardAt}`) ?? (() => {
    const f = `${seasonDir(season, week)}/events-${slug(boardAt)}.json`;
    if (!existsSync(f)) return null;
    const m = new Map<string, string>();
    for (const e of JSON.parse(readFileSync(f, 'utf8')).data) { const id = eventGameId(e); if (id) m.set(id, e.id); }
    events.set(`${season}|${boardAt}`, m);
    return m;
  })();

  const call = async (url: string, cost: number, note: string): Promise<{ ok: true; body: { timestamp: string; data: unknown } } | { ok: false; status: number; text: string }> => {
    if (spent + cost > max) throw new Stop(`Stopping before ${note}: it could pass --max-credits ${max} (spent ${spent})`);
    if (remaining !== null && remaining - cost < floor) throw new Stop(`Stopping before ${note}: ${remaining} left, and ${cost} more could cross the ${floor} floor`);
    const res = await fetch(`${url}&apiKey=${encodeURIComponent(key)}`);
    const rem = Number(res.headers.get('x-requests-remaining'));
    if (Number.isFinite(rem) && res.headers.get('x-requests-remaining') !== null) { remaining = rem; firstRemaining ??= rem + Number(res.headers.get('x-requests-last') ?? 0); }
    spent += Number(res.headers.get('x-requests-last') ?? (res.ok ? cost : 0));
    if (res.ok) return { ok: true, body: await res.json() };
    return { ok: false, status: res.status, text: (await res.text()).slice(0, 200) };
  };

  try {
    for (const j of plan.jobs) {
      const note = `${j.season} week ${j.week} ${j.kind}${j.gameId ? ` ${j.gameId}` : ''}`;
      if (j.kind === 'events' || j.kind === 'lines') {
        const file = jobFile(j);
        if (!existsSync(file)) {
          const r = await call(j.kind === 'events' ? `${BASE}/events?date=${iso(j.at)}&dateFormat=iso` : `${BASE}/odds?${q(j.markets, j.at)}`, j.cost, note);
          if (!r.ok) throw new Error(`${note}: HTTP ${r.status} ${r.text}`);
          if (new Date(r.body.timestamp) > new Date(j.at)) throw new Error(`Guard: ${note} snapshot ${r.body.timestamp} is after ${j.at}`);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, JSON.stringify(r.body));
        }
      } else {
        const g = games.get(`${j.season}|${j.gameId}`)!;
        const ids = listFor(j.season, g.week, g.boardAt);
        const eventId = ids?.get(j.gameId!);
        if (!eventId) { gaps.push({ job: note, status: 0, note: 'not in the board event list' }); reached[j.priority]!.done++; continue; }
        const file = jobFile(j, eventId);
        if (!existsSync(file)) {
          const r = await call(`${BASE}/events/${eventId}/odds?${q(j.markets, j.at)}`, j.cost, note);
          if (!r.ok) {
            if (r.status === 404 || r.status === 422) { gaps.push({ job: note, status: r.status, note: r.text }); reached[j.priority]!.done++; continue; }
            throw new Error(`${note}: HTTP ${r.status} ${r.text}`);
          }
          if (new Date(r.body.timestamp) > new Date(j.at)) throw new Error(`Guard: ${note} snapshot ${r.body.timestamp} is after ${j.at}`);
          if (j.kind === 'close' && !(new Date(r.body.timestamp) > new Date(g.boardAt))) throw new Error(`Guard: ${note} close ${r.body.timestamp} is not after its board`);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, JSON.stringify(r.body));
        }
      }
      reached[j.priority]!.done++;
      reached[j.priority]!.last = note;
    }
    console.log('Every job in the plan is cached.');
  } catch (err) {
    if (!(err instanceof Stop)) throw err;
    console.log(err.message);
  } finally {
    const entry = { at: new Date().toISOString(), spent, firstRemaining, remaining, floor, max, reached, gaps };
    const log = `${ODDS_DIR}/seasons-spend.json`;
    const runs = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
    mkdirSync(dirname(log), { recursive: true });
    writeFileSync(log, JSON.stringify([...runs, entry], null, 2));
    writeFileSync(`${OUT_DIR}/seasons-spend.json`, `${JSON.stringify([...runs, entry], null, 2)}\n`);
    console.log(`Spent ${spent} credits this run. Remaining ${remaining ?? 'unknown'} (started at ${firstRemaining ?? 'unknown'}). Reached ${JSON.stringify(reached)}. ${gaps.length} gaps.`);
  }
}

class Stop extends Error {}

main().catch((err) => { console.error(String(err?.message ?? err)); process.exit(1); });
