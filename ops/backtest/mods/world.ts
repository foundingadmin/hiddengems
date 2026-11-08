// What MOD4, MOD5 and MOD6 may know at a game's board, and how their picks are graded. One World per week, built from
// the history buy (experiments/backtest/history-plan.json) and nflverse 2026. Every input carries the moment it was
// knowable and the capsule guard (data.ts) refuses anything from on or after the board it is read at.
//
// The six stats new to the history buy are not in packages/core yet (core grades anytime TD, receptions, receiving and
// rushing yards). They are graded here by the same rule as core propHit: an over hits when the stat beats the line.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { findTeam, gameId, nameKey, propHit, zonedTimeToUtc } from '../../../packages/core/src/index';
import { parseCsv } from '../../../packages/ingest/src/csv';
import { type Season, type Stamp, capsule, loadSeason, nameMatcher } from '../data';
import { HISTORY_PLAN_PATH, type HistoryBoard, type HistoryGame } from '../history-plan';
import { NFLVERSE_DIR, ODDS_DIR } from '../paths';

export const STATS = ['anytime_td', 'receptions', 'reception_yds', 'rush_yds', 'pass_yds', 'rush_reception_yds', 'pass_rush_yds', 'rush_attempts', 'pass_completions', 'pass_attempts'] as const;
export type Stat = (typeof STATS)[number];
/** nflverse stats_player_week columns that sum to each stat. Anytime TD uses core's box (rushing plus receiving TDs). */
const COLUMNS: Record<Exclude<Stat, 'anytime_td'>, string[]> = {
  receptions: ['receptions'], reception_yds: ['receiving_yards'], rush_yds: ['rushing_yards'], pass_yds: ['passing_yards'],
  rush_reception_yds: ['rushing_yards', 'receiving_yards'], pass_rush_yds: ['passing_yards', 'rushing_yards'],
  rush_attempts: ['carries'], pass_completions: ['completions'], pass_attempts: ['attempts'],
};
/** Core market ids for the four stats core grades. */
const CORE: Partial<Record<Stat, string>> = { anytime_td: 'anytime_td', receptions: 'receptions', reception_yds: 'receiving_yds', rush_yds: 'rushing_yds' };

export const BOOK = 'draftkings';
export interface Quote { book: string; stat: Stat; alt: boolean; player: string; side: 'over' | 'under' | 'yes' | 'no'; line: number; price: number }
export interface Snapshot { gameId: string; timestamp: Date; quotes: Quote[] }

/** Raw Odds API event odds to quotes. Markets outside STATS are dropped. */
export function parseEvent(data: { bookmakers: { key: string; markets: { key: string; outcomes: { name: string; description?: string; price: number; point?: number }[] }[] }[] }): Quote[] {
  const out: Quote[] = [];
  for (const b of data.bookmakers) for (const m of b.markets) {
    const alt = m.key.endsWith('_alternate');
    const stat = m.key.replace(/^player_/, '').replace(/_alternate$/, '') as Stat;
    if (!STATS.includes(stat)) continue;
    for (const o of m.outcomes) {
      const side = o.name.toLowerCase() as Quote['side'];
      if (!['over', 'under', 'yes', 'no'].includes(side) || !(o.price > 1) || !o.description) continue;
      const line = stat === 'anytime_td' ? 0.5 : o.point;
      if (line == null) continue;
      out.push({ book: b.key, stat, alt: stat === 'anytime_td' ? false : alt, player: o.description, side, line, price: o.price });
    }
  }
  return out;
}

const teamOf = (name: string) => { const t = findTeam(name); if (!t) throw new Error(`Unknown team ${name}`); return t.id; };
const eventId = (e: { commence_time: string; away_team: string; home_team: string }) => gameId(new Date(e.commence_time), teamOf(e.away_team), teamOf(e.home_team));

/** Every cached snapshot of one kind for a week, merged per game (the first buy plus the history buy). */
export function loadSnapshots(week: number, kind: 'board' | 'close'): Map<string, Snapshot> {
  const out = new Map<string, Snapshot>();
  for (const dir of [kind, `${kind}2`]) {
    const path = `${ODDS_DIR}/wk${week}/${dir}`;
    if (!existsSync(path)) continue;
    for (const f of readdirSync(path).filter((x) => x.endsWith('.json'))) {
      const body = JSON.parse(readFileSync(`${path}/${f}`, 'utf8'));
      const id = eventId(body.data);
      const prev = out.get(id);
      const ts = new Date(body.timestamp);
      out.set(id, { gameId: id, timestamp: prev && prev.timestamp > ts ? prev.timestamp : ts, quotes: [...(prev?.quotes ?? []), ...parseEvent(body.data)] });
    }
  }
  return out;
}

/** Consensus spread (home) and total at a board, median across books, and each team's implied points. */
export interface Script { homeSpread: number; total: number; implied: Record<string, number> }
export function loadScripts(b: HistoryBoard): { timestamp: Date; byGame: Map<string, Script> } {
  const body = JSON.parse(readFileSync(`${ODDS_DIR}/wk${b.week}/lines-${b.day}.json`, 'utf8'));
  const med = (xs: number[]) => { const s = [...xs].sort((a, c) => a - c); return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : NaN; };
  const byGame = new Map<string, Script>();
  for (const e of body.data) {
    const spreads: number[] = [], totals: number[] = [];
    for (const bk of e.bookmakers) for (const m of bk.markets) {
      if (m.key === 'spreads') { const h = m.outcomes.find((o: { name: string }) => o.name === e.home_team); if (h?.point != null) spreads.push(h.point); }
      if (m.key === 'totals') { const o = m.outcomes.find((x: { name: string }) => x.name === 'Over'); if (o?.point != null) totals.push(o.point); }
    }
    if (!spreads.length || !totals.length) continue;
    const homeSpread = med(spreads), total = med(totals);
    const home = teamOf(e.home_team), away = teamOf(e.away_team);
    byGame.set(eventId(e), { homeSpread, total, implied: { [home]: total / 2 - homeSpread / 2, [away]: total / 2 + homeSpread / 2 } });
  }
  return { timestamp: new Date(body.timestamp), byGame };
}

/** One player's line in one game, every stat the MODs read. */
export interface Log {
  playerId: string; name: string; gameId: string; week: number; kickoff: Date; team: string; opponent: string; position: string;
  stats: Record<Stat, number>; targets: number; carries: number; snapPct: number | null;
}

export interface Depth { team: string; player: string; gsis: string; pos: string; rank: number }

const easternDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** When a game's final injury report was out, 4 PM Eastern: Wednesday for Thursday games, Friday for Sunday, Saturday for Monday. */
export function injuryFinalAt(g: HistoryGame): Date {
  const d = new Date(`${easternDate(new Date(g.kickoff))}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (g.day === 'thu' ? 1 : 2));
  return zonedTimeToUtc(d.toISOString().slice(0, 10), '16:00', 'America/New_York');
}

export interface World {
  week: number;
  games: HistoryGame[];
  board: Map<string, Snapshot>;
  close: Map<string, Snapshot>;
  scripts: Map<string, Script>;
  /** Logs from games before this week's first board. */
  logs: Log[];
  injuries: Map<string, { status: string | null; practice: string | null; team: string; position: string; name: string }>;
  /** Last depth chart snapshot before the board, and the one before the previous week's board. */
  depth: Depth[];
  depthPrev: Depth[];
  roof: Map<string, string>;
  /** 2025 regular season per game averages (a finished season, known before 2026 began). */
  lastSeason: Map<string, { games: number; position: string; perGame: Record<Stat, number> }>;
  /** Each team's home roof type across the season schedule (a stadium fact, known in advance). */
  homeRoof: Map<string, string>;
  matchPlayer: (gameId: string, name: string) => string | null;
  /** Grading: the stat a player put up, or null when he did not play (void). */
  outcome: (gameId: string, playerId: string, stat: Stat, line: number) => { value: number; hit: boolean } | null;
  inputs: number;
}

let SEASON: Season | null = null;
let STAT_ROWS: Record<string, string>[] | null = null;
let DEPTH_ROWS: Record<string, string>[] | null = null;
let LAST: World['lastSeason'] | null = null;
function lastSeason(): World['lastSeason'] {
  if (LAST) return LAST;
  const sums = new Map<string, { games: number; position: string; total: Record<Stat, number> }>();
  for (const r of parseCsv(readFileSync(`${NFLVERSE_DIR}/stats_player_week_2025.csv`, 'utf8'))) {
    if (r.season_type !== 'REG' || r.season !== '2025') continue;
    const cur = sums.get(r.player_id!) ?? { games: 0, position: r.position!, total: Object.fromEntries(STATS.map((x) => [x, 0])) as Record<Stat, number> };
    cur.games++;
    for (const [k, cols] of Object.entries(COLUMNS)) cur.total[k as Stat] += cols.reduce((a, c) => a + num(r[c]), 0);
    cur.total.anytime_td += num(r.rushing_tds) + num(r.receiving_tds);
    sums.set(r.player_id!, cur);
  }
  LAST = new Map([...sums].map(([id, x]) => [id, { games: x.games, position: x.position, perGame: Object.fromEntries(STATS.map((k) => [k, x.total[k] / x.games])) as Record<Stat, number> }]));
  return LAST;
}
let PLAN: { games: HistoryGame[]; boards: HistoryBoard[] } | null = null;

export const historyPlan = () => (PLAN ??= JSON.parse(readFileSync(HISTORY_PLAN_PATH, 'utf8')));
const season = () => (SEASON ??= loadSeason());
const statRows = () => (STAT_ROWS ??= parseCsv(readFileSync(`${NFLVERSE_DIR}/stats_player_week_2026.csv`, 'utf8')).filter((r) => r.season_type === 'REG'));
const depthRows = () => (DEPTH_ROWS ??= parseCsv(readFileSync(`${NFLVERSE_DIR}/depth_charts_2026.csv`, 'utf8')));
const num = (s: string | undefined) => (s && s !== 'NA' ? Number(s) : 0);

function depthAt(before: Date): Depth[] {
  const rows = depthRows();
  const dt = rows.map((r) => r.dt!).filter((d) => new Date(d) < before).sort().at(-1);
  if (!dt) return [];
  // Snapshots are per team per day: take each team's latest row set before the moment.
  const latest = new Map<string, string>();
  for (const r of rows) if (new Date(r.dt!) < before && (latest.get(r.team!) ?? '') < r.dt!) latest.set(r.team!, r.dt!);
  return rows.filter((r) => latest.get(r.team!) === r.dt && r.gsis_id).map((r) => ({ team: teamOf(r.team!), player: r.player_name!, gsis: r.gsis_id!, pos: r.pos_abb!, rank: Number(r.pos_rank) }));
}

/** Builds the week's world. Weeks 7 and 8 come only through the harness seal (harness.ts). */
export function buildWorld(week: number): World {
  const s = season();
  const plan = historyPlan();
  const games = plan.games.filter((g: HistoryGame) => g.week === week);
  const boards = plan.boards.filter((b: HistoryBoard) => b.week === week);
  const firstBoard = new Date(Math.min(...games.map((g: HistoryGame) => +new Date(g.boardAt))));
  const stamps: Stamp[] = [];
  const kick = new Map(s.games.map((g) => [g.nflverseId, g]));
  const snap = new Map(s.usage.map((u) => [`${u.gameId}:${u.playerId}`, u.snapPct]));

  const logs: Log[] = [];
  for (const r of statRows()) {
    const g = kick.get(r.game_id!);
    if (!g || !(g.kickoff < firstBoard)) continue;
    stamps.push({ source: `stats ${r.game_id} ${r.player_id}`, at: g.kickoff });
    const box = s.box.get(`${g.gameId}:${r.player_id}`);
    const stats = Object.fromEntries(Object.entries(COLUMNS).map(([k, cols]) => [k, cols.reduce((a, c) => a + num(r[c]), 0)])) as Record<Stat, number>;
    stats.anytime_td = box?.touchdowns ?? num(r.rushing_tds) + num(r.receiving_tds);
    logs.push({ playerId: r.player_id!, name: r.player_display_name!, gameId: g.gameId, week: g.week, kickoff: g.kickoff, team: teamOf(r.team!), opponent: teamOf(r.opponent_team!),
      position: r.position!, stats, targets: num(r.targets), carries: num(r.carries), snapPct: snap.get(`${g.gameId}:${r.player_id}`) ?? null });
  }

  // Games a player took snaps in but put up no stat row: zeros, not missing. Leaving them out inflates averages.
  const seen = new Set(logs.map((l) => `${l.gameId}:${l.playerId}`));
  const byId = new Map(s.games.map((g) => [g.gameId, g]));
  for (const u of s.usage) {
    const g = byId.get(u.gameId);
    if (!g || !(g.kickoff < firstBoard) || seen.has(`${u.gameId}:${u.playerId}`) || !(u.snapPct == null || u.snapPct > 0)) continue;
    stamps.push({ source: `usage ${u.gameId} ${u.playerId}`, at: g.kickoff });
    const zero = Object.fromEntries(STATS.map((st) => [st, 0])) as Record<Stat, number>;
    logs.push({ playerId: u.playerId, name: '', gameId: u.gameId, week: g.week, kickoff: g.kickoff, team: u.team, opponent: u.team === g.home ? g.away : g.home,
      position: u.position, stats: zero, targets: 0, carries: 0, snapPct: u.snapPct });
  }

  const board = loadSnapshots(week, 'board');
  const close = loadSnapshots(week, 'close');
  for (const g of games) {
    const b = board.get(g.gameId);
    if (b && b.timestamp > new Date(g.boardAt)) throw new Error(`Time capsule broken: ${g.gameId} board stamped ${b.timestamp.toISOString()}, after ${g.boardAt}`);
    const c = close.get(g.gameId);
    if (c && !(c.timestamp > new Date(g.boardAt) && c.timestamp <= new Date(g.closeAt))) throw new Error(`${g.gameId} close stamped ${c.timestamp.toISOString()}, outside its board to close`);
  }
  const scripts = new Map<string, Script>();
  for (const b of boards) {
    const l = loadScripts(b);
    if (l.timestamp > new Date(b.boardAt)) throw new Error(`Time capsule broken: week ${week} ${b.day} lines stamped ${l.timestamp.toISOString()}`);
    for (const gid of b.games) { const sc = l.byGame.get(gid); if (sc) scripts.set(gid, sc); }
  }

  // Injury report: nflverse keeps one final row per player per week; it is stamped at each game's final report.
  const injuries: World['injuries'] = new Map();
  for (const r of parseCsv(readFileSync(`${NFLVERSE_DIR}/injuries_2026.csv`, 'utf8'))) {
    if (r.game_type !== 'REG' || Number(r.week) !== week || !r.gsis_id) continue;
    const team = teamOf(r.team!);
    const g = games.find((x: HistoryGame) => x.away === team || x.home === team);
    if (!g) continue;
    // Checked per game: a Sunday team's Friday report is after the week's Thursday board but before its own.
    if (!(injuryFinalAt(g) < new Date(g.boardAt))) throw new Error(`Time capsule broken: ${g.gameId} injury report is not before its board`);
    injuries.set(r.gsis_id, { status: r.report_status && r.report_status !== 'NA' ? r.report_status : null, practice: r.practice_status && r.practice_status !== 'NA' ? r.practice_status : null, team, position: r.position!, name: r.full_name! });
  }
  const depth = depthAt(firstBoard);
  const prevBoard = new Date(firstBoard.getTime() - 7 * 86_400_000);
  const depthPrev = depthAt(prevBoard);

  // Roof type from the schedule (never temp or wind, which are game time readings).
  const roof = new Map<string, string>();
  const homeRoof = new Map<string, string>();
  for (const r of parseCsv(readFileSync(`${NFLVERSE_DIR}/games.csv`, 'utf8'))) {
    const g = kick.get(r.game_id!);
    if (g && g.week === week) roof.set(g.gameId, r.roof!);
    if (g && r.location === 'Home' && !homeRoof.has(g.home)) homeRoof.set(g.home, r.roof === 'open' || r.roof === 'closed' ? 'retractable' : r.roof!);
  }

  const inputs = capsule(firstBoard, stamps);
  const roster = s.rosters.get(week) ?? new Map();
  const matchers = new Map<string, (name: string | null) => string | null>(games.map((g: HistoryGame) => [g.gameId, nameMatcher(roster, [g.away, g.home])] as const));

  // Grading reads this week's rows only, and only through outcome().
  const weekRows = new Map<string, Record<string, string>>();
  for (const r of statRows()) { const g = kick.get(r.game_id!); if (g && g.week === week) weekRows.set(`${g.gameId}:${r.player_id}`, r); }
  // A player with snaps but no stat row played and put up zeros; one with neither is void.
  const snapped = new Set(s.usage.filter((u) => u.week === week).map((u) => `${u.gameId}:${u.playerId}`));
  const outcome = (gid: string, pid: string, stat: Stat, line: number) => {
    const r = weekRows.get(`${gid}:${pid}`);
    const box = s.box.get(`${gid}:${pid}`);
    if (!r && !box && !snapped.has(`${gid}:${pid}`)) return null;
    const core = CORE[stat];
    if (core && box) {
      const hit = propHit({ marketId: core, side: stat === 'anytime_td' ? 'yes' : 'over', line: stat === 'anytime_td' ? null : line }, box);
      const value = stat === 'anytime_td' ? box.touchdowns : Number(stat === 'receptions' ? box.receptions : stat === 'reception_yds' ? box.receivingYards : box.rushingYards) || 0;
      if (hit !== null) return { value, hit };
    }
    const value = stat === 'anytime_td' ? num(r?.rushing_tds) + num(r?.receiving_tds) : COLUMNS[stat].reduce((a, c) => a + num(r?.[c]), 0);
    return { value, hit: stat === 'anytime_td' ? value >= 1 : value > line };
  };

  return {
    week, games, board, close, scripts, logs, injuries, depth, depthPrev, roof, homeRoof, lastSeason: lastSeason(),
    matchPlayer: (gid, name) => matchers.get(gid)?.(name) ?? null,
    outcome, inputs: inputs + [...board.values()].reduce((n, b) => n + b.quotes.length, 0),
  };
}

export const playerKey = (q: { player: string }) => nameKey(q.player);
export { gunzipSync };
