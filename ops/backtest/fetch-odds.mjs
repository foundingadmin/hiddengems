#!/usr/bin/env node
// Buys the backtest's historical odds from The Odds API (paid plan), once. No dependencies, Node 22+.
//
//   node ops/backtest/fetch-odds.mjs --dry            credit estimate, no key, no calls
//   node ops/backtest/fetch-odds.mjs --test           checks the key: plan credits (free) and historical access (1 credit)
//   node ops/backtest/fetch-odds.mjs --probe          one game's historical board, every market (about 41 credits)
//   node ops/backtest/fetch-odds.mjs [--max-credits N] buys what the cache lacks, stops before N credits
//
// Reads experiments/backtest/plan.json (ops/backtest/plan.ts). Per bought week: one historical event list at the
// Saturday 7:47 PM Mountain board, then each Sunday game's odds at the board and at its close (20 minutes before
// kickoff). Every raw response is cached under experiments/backtest/cache/odds, so nothing is bought twice.
// The key comes from ODDS_API_KEY_HISTORICAL only, never the production ODDS_API_KEY.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAN = join(ROOT, 'experiments/backtest/plan.json');
const CACHE = join(ROOT, 'experiments/backtest/cache/odds');
const BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl';
export const MARKETS = ['player_anytime_td', 'player_receptions_alternate', 'player_reception_yds_alternate', 'player_rush_yds_alternate'];
export const BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm', 'williamhill_us', 'fanatics'];
// Historical pricing: 1 credit per event list, 10 per market per region per event odds call (5 books is one region).
export const COST = { events: 1, eventOdds: 10 * MARKETS.length };

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const maxCredits = Number(args[args.indexOf('--max-credits') + 1]) || 8000;
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const weeks = plan.filter((w) => w.buy);

export const eventsPath = (week) => join(CACHE, `wk${week}`, 'events.json');
export const oddsPath = (week, kind, eventId) => join(CACHE, `wk${week}`, kind, `${eventId}.json`);

const sundayMt = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const minus20 = (iso) => new Date(new Date(iso).getTime() - 20 * 60_000).toISOString().replace('.000Z', 'Z');
const cached = (p) => existsSync(p);

// The estimate counts plan games; the buy uses the event list, which should match it.
const games = weeks.reduce((n, w) => n + w.games.length, 0);
const need = weeks.reduce((n, w) => n + (cached(eventsPath(w.week)) ? 0 : COST.events)
  + w.games.length * 2 * COST.eventOdds, 0);
console.log(`Plan: ${weeks.length} weeks (${weeks.map((w) => w.week).join(', ')}), ${games} Sunday games, ${MARKETS.length} markets`);
console.log(`Full price: ${weeks.length * COST.events} for event lists + ${games} x ${COST.eventOdds} board + ${games} x ${COST.eventOdds} close = ${weeks.length * COST.events + games * 2 * COST.eventOdds} credits`);
console.log(`Upper bound still to buy (ignores cached odds files): ${need} credits`);
if (dry) process.exit(0);

const key = process.env.ODDS_API_KEY_HISTORICAL;
if (!key) { console.error('Set ODDS_API_KEY_HISTORICAL (the paid key). Nothing bought.'); process.exit(1); }
if (process.env.ODDS_API_KEY && process.env.ODDS_API_KEY === key) { console.error('That is the production key. Use the paid historical key. Nothing bought.'); process.exit(1); }

// Key test: the sports list is free and shows the plan's credits; one historical event list (1 credit) shows
// whether the plan includes history. Writes experiments/backtest/key-test.json (status codes only, never the key).
if (args.includes('--test')) {
  const head = (r) => ({ status: r.status, used: r.headers.get('x-requests-used'), remaining: r.headers.get('x-requests-remaining'), last: r.headers.get('x-requests-last') });
  const sports = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(key)}`);
  const at = weeks[0].boardAt.replace('.000Z', 'Z');
  const hist = await fetch(`${BASE}/events?date=${at}&dateFormat=iso&apiKey=${encodeURIComponent(key)}`);
  const histBody = await hist.text();
  let events = null;
  if (hist.ok) {
    const body = JSON.parse(histBody);
    events = body.data.length;
    mkdirSync(dirname(eventsPath(weeks[0].week)), { recursive: true });
    writeFileSync(eventsPath(weeks[0].week), histBody);
  }
  const out = {
    at: new Date().toISOString(),
    key: sports.ok ? 'valid' : `rejected (HTTP ${sports.status})`,
    credits: head(sports),
    historical: hist.ok ? `available, week ${weeks[0].week} board lists ${events} events` : `not available (HTTP ${hist.status}): ${histBody.slice(0, 160).replace(/apiKey=[^&\s"]+/g, 'apiKey=***')}`,
    historicalHeaders: head(hist),
  };
  writeFileSync(join(ROOT, 'experiments/backtest/key-test.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// Probe: the last bought week's event list and its first Sunday game's board, to confirm historical player props
// come back with every book and market before paying for the full run. Cached, so the full run reuses it.
if (args.includes('--probe')) {
  const w = weeks.at(-1);
  const at = w.boardAt.replace('.000Z', 'Z');
  const head = (r) => ({ status: r.status, used: r.headers.get('x-requests-used'), remaining: r.headers.get('x-requests-remaining'), last: r.headers.get('x-requests-last') });
  const listRes = await fetch(`${BASE}/events?date=${at}&dateFormat=iso&apiKey=${encodeURIComponent(key)}`);
  const list = await listRes.json();
  mkdirSync(dirname(eventsPath(w.week)), { recursive: true });
  writeFileSync(eventsPath(w.week), JSON.stringify(list));
  const e = list.data.filter((x) => sundayMt(x.commence_time) === w.sunday).sort((a, b) => a.commence_time.localeCompare(b.commence_time))[0];
  const q = `regions=us&oddsFormat=decimal&dateFormat=iso&markets=${MARKETS.join(',')}&bookmakers=${BOOKMAKERS.join(',')}&date=${at}`;
  const res = await fetch(`${BASE}/events/${e.id}/odds?${q}&apiKey=${encodeURIComponent(key)}`);
  const text = await res.text();
  const out = { at: new Date().toISOString(), week: w.week, board: at, game: `${e.away_team} at ${e.home_team}, ${e.commence_time}`, list: head(listRes), odds: head(res) };
  if (res.ok) {
    const body = JSON.parse(text);
    mkdirSync(dirname(oddsPath(w.week, 'board', e.id)), { recursive: true });
    writeFileSync(oddsPath(w.week, 'board', e.id), text);
    out.snapshot = body.timestamp;
    out.books = Object.fromEntries(body.data.bookmakers.map((b) => [b.key, Object.fromEntries(b.markets.map((m) => [m.key, m.outcomes.length]))]));
    const dk = body.data.bookmakers.find((b) => b.key === 'draftkings');
    out.sampleDraftKings = dk ? dk.markets.map((m) => ({ market: m.key, outcomes: m.outcomes.slice(0, 3).map((o) => `${o.description} ${o.name}${o.point != null ? ` ${o.point}` : ''} @ ${o.price}`) })) : 'no DraftKings';
  } else out.error = text.slice(0, 200);
  const path = join(ROOT, 'experiments/backtest/key-test.json');
  const prev = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  writeFileSync(path, `${JSON.stringify({ ...prev, probe: out }, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

let spent = 0;
let remaining = null;
let checked = false;
async function buy(url, path, note) {
  if (cached(path)) return JSON.parse(readFileSync(path, 'utf8'));
  const cost = url.includes('/odds?') ? COST.eventOdds : COST.events;
  if (spent + cost > maxCredits) throw new Error(`Stopping before ${note}: it would pass --max-credits ${maxCredits} (spent ${spent})`);
  const res = await fetch(`${url}&apiKey=${encodeURIComponent(key)}`);
  const last = Number(res.headers.get('x-requests-last') ?? cost);
  remaining = res.headers.get('x-requests-remaining') ?? remaining;
  spent += last;
  if (!res.ok) throw new Error(`${note}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(body));
  return body;
}

// Guard: a snapshot dated after the moment asked for would be the future. Fail loudly.
function guard(body, asked, note) {
  if (!body?.timestamp || new Date(body.timestamp) > new Date(asked)) throw new Error(`Guard: ${note} snapshot ${body?.timestamp} is not before ${asked}`);
}

try {
  for (const w of weeks) {
    const at = w.boardAt.replace('.000Z', 'Z');
    const list = await buy(`${BASE}/events?date=${at}&dateFormat=iso`, eventsPath(w.week), `week ${w.week} event list`);
    guard(list, at, `week ${w.week} event list`);
    const events = list.data.filter((e) => sundayMt(e.commence_time) === w.sunday && new Date(e.commence_time) > new Date(at));
    if (events.length !== w.games.length) console.warn(`Week ${w.week}: ${events.length} Sunday events listed, plan has ${w.games.length}`);
    const q = (date) => `regions=us&oddsFormat=decimal&dateFormat=iso&markets=${MARKETS.join(',')}&bookmakers=${BOOKMAKERS.join(',')}&date=${date}`;
    for (const e of events) {
      const board = await buy(`${BASE}/events/${e.id}/odds?${q(at)}`, oddsPath(w.week, 'board', e.id), `week ${w.week} board ${e.away_team} at ${e.home_team}`);
      guard(board, at, `week ${w.week} board ${e.id}`);
      // First board bought: stop unless DraftKings hangs anytime TD and at least one ladder, so a thin feed costs one game.
      if (!checked) {
        const dk = board.data.bookmakers.find((b) => b.key === 'draftkings');
        const keys = new Set(dk?.markets.map((m) => m.key) ?? []);
        if (!keys.has(MARKETS[0]) || !MARKETS.slice(1).some((m) => keys.has(m))) throw new Error(`Thin board for ${e.away_team} at ${e.home_team}: DraftKings has ${[...keys].join(', ') || 'nothing'}. Stopping before the rest.`);
        console.log(`First board looks right: DraftKings has ${[...keys].join(', ')}`);
        checked = true;
      }
      const closeAt = minus20(e.commence_time);
      const close = await buy(`${BASE}/events/${e.id}/odds?${q(closeAt)}`, oddsPath(w.week, 'close', e.id), `week ${w.week} close ${e.away_team} at ${e.home_team}`);
      guard(close, closeAt, `week ${w.week} close ${e.id}`);
    }
    console.log(`Week ${w.week}: ${events.length} games cached, ${spent} credits spent so far`);
  }
  console.log(`Done. Spent ${spent} credits this run, ${remaining ?? 'unknown'} left on the plan.`);
  const log = join(CACHE, 'spend.json');
  const runs = cached(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
  writeFileSync(log, JSON.stringify([...runs, { at: new Date().toISOString(), spent, remaining }], null, 2));
} catch (err) {
  console.error(String(err.message ?? err));
  console.error(`Spent ${spent} credits before stopping; the cache keeps what was bought.`);
  process.exit(1);
}
