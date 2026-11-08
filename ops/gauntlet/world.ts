// The gauntlet's loader. openWeek(ref) builds the WeekWorld for 2025 Weeks 1 to 18 and 2026 Weeks 1 to 8 from the
// owned data in the private backup repository, and reveal(ref, picks) answers Monday once that week's picks are on file.
//
//   capsules/<season>/wkNN/{sat,close,early}/odds/<gameId>.json.gz   bought odds (season-capsules.ts, capsule-io.ts)
//   capsules/<season>/wkNN/sat/odds-lists/*.json.gz                  spreads and totals at each board
//   nflverse/<season>/*.csv.gz                                       stamped nflverse files (archive-nflverse.ts)
//
// The clone's path comes from BACKUPS_DIR (default /tmp/backups, as in experiments/backtest/README.md). Reading costs
// 0 Odds API credits: nothing here calls a provider.
//
// The wall:
// - Sunday and Monday games use the Saturday 7:47 PM Mountain board. Every other game uses 7:47 PM Mountain the night
//   before its game day. Each game's board quotes must be stamped at or before its own board.
// - Football data (box scores, snaps, injury reports, depth charts) stops at the week's first board, for every game in
//   the week. A Sunday team in a week with a Thursday game therefore reads its previous week's final injury report.
// - Results and closing prices come only through reveal(), which refuses until experiments/gauntlet/ledger holds the
//   week's picks. Nothing here reads experiments/mods/sealed, experiments/mods/runs or any results.json.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { SNAPSHOT_ZONE, findTeam, gameId as coreGameId, impliedFromDecimal, nameKey, zonedTimeToUtc } from '../../packages/core/src/index';
import { parseCsv, readCsvColumns } from '../../packages/ingest/src/csv';
import { easternKickoff } from '../../packages/ingest/src/providers/nflverse';
import { ROOT } from '../backtest/paths';
import {
  BET_TYPES, type BetType, type DepthRow, type Game, type GameLog, type Injury, type Line, type Pick, type Quote,
  type Reveal, type Season, type WeekRef, type WeekWorld,
} from './contract';

export const BACKUPS_DIR = process.env.BACKUPS_DIR ?? '/tmp/backups';
/** Where picks are recorded before a reveal. GAUNTLET_LEDGER_DIR moves it for tests. */
export const ledgerDir = () => process.env.GAUNTLET_LEDGER_DIR ?? `${ROOT}/experiments/gauntlet/ledger`;
/** Every week the gauntlet walks, in order. */
export const WEEKS: WeekRef[] = [
  ...Array.from({ length: 18 }, (_, i) => ({ season: 2025 as Season, week: i + 1 })),
  ...Array.from({ length: 8 }, (_, i) => ({ season: 2026 as Season, week: i + 1 })),
];
/** Seasons whose box scores feed the logs: every season owned, 2024 on. */
const LOG_SEASONS = [2024, 2025, 2026];
const BOOK = 'draftkings';
const SKILL = new Set(['QB', 'RB', 'WR', 'TE', 'FB']);
/** Book nicknames nflverse never carries, to the roster's name. */
const ALIASES = new Map([['hollywoodbrown', 'marquisebrown']]);
const BOARD_TIME = '19:47';
const ODDS_SOURCES = new Set(['odds-api historical', 'odds-api historical seasons']);

const pad = (n: number) => String(n).padStart(2, '0');
export const weekLabel = (r: WeekRef) => `${r.season}-wk${pad(r.week)}`;
const num = (s: string | undefined) => (s && s !== 'NA' ? Number(s) : 0);
const numOrNull = (s: string | undefined) => (s && s !== 'NA' ? Number(s) : null);
const unzip = (f: string) => gunzipSync(readFileSync(f)).toString('utf8');
const teamOf = (name: string) => { const t = findTeam(name); if (!t) throw new Error(`Unknown team ${name}`); return t.id; };
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : NaN; };
const memo = <T>(f: (k: number) => T) => { const m = new Map<number, T>(); return (k: number) => { if (!m.has(k)) m.set(k, f(k)); return m.get(k)!; }; };

function assertRef(ref: WeekRef) {
  if (!WEEKS.some((w) => w.season === ref.season && w.week === ref.week)) throw new Error(`No gauntlet week ${ref.season} Week ${ref.week}: the gauntlet walks 2025 Weeks 1 to 18 and 2026 Weeks 1 to 8`);
}

// ---------- Odds math ----------

/** DraftKings' cut on a two-sided line: the two implied chances' excess over 1. */
export const holdOf = (overPrice: number, underPrice: number) => impliedFromDecimal(overPrice) + impliedFromDecimal(underPrice) - 1;
/** The over's chance with the cut removed in proportion (the two sides' implied chances scaled to add to 1). */
export const fairOver = (overPrice: number, hold: number) => impliedFromDecimal(overPrice) / (1 + hold);
/**
 * Lines carry the over's threshold. A main line keeps the book's point (59.5, hits above it). An alt rung is posted as
 * "60+" (the book's point 59.5 plus a half, hits at or above it), so a main and an alt rung at the same point stay two
 * lines with two keys.
 */
export const thresholdOf = (alt: boolean, point: number) => (alt ? point + 0.5 : point);
export const overHits = (alt: boolean, line: number, value: number) => (alt ? value >= line : value > line);

// ---------- Schedule and boards ----------

const mtParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: SNAPSHOT_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
}).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;

/** 7:47 PM Mountain on the Saturday before a Sunday or Monday game, else on the night before the game's day. */
export function boardFor(kickoff: Date): Date {
  const m = mtParts(kickoff);
  const back = m.weekday === 'Mon' ? 2 : 1;
  const day = new Date(Date.UTC(+m.year!, +m.month! - 1, +m.day! - back)).toISOString().slice(0, 10);
  const at = zonedTimeToUtc(day, BOARD_TIME, SNAPSHOT_ZONE);
  if (!(at < kickoff)) throw new Error(`Board ${at.toISOString()} is not before kickoff ${kickoff.toISOString()}`);
  return at;
}

interface SchedGame extends Game { season: number; week: number; nflverseId: string; weekday: string }

/** Every regular season game of a season, from that season's archived schedule. Schedule facts only. */
const schedule = memo((season: number): SchedGame[] => parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/games.csv.gz`))
  .filter((r) => Number(r.season) === season && r.game_type === 'REG')
  .map((r) => {
    const kickoff = easternKickoff(r.gameday!, r.gametime!);
    const away = teamOf(r.away_team!), home = teamOf(r.home_team!);
    return { season, week: Number(r.week), nflverseId: r.game_id!, weekday: mtParts(kickoff).weekday!, gameId: coreGameId(kickoff, away, home),
      kickoff, home, away, boardAt: boardFor(kickoff), roof: r.roof && r.roof !== 'NA' ? r.roof : null };
  }));
const byNflverseId = memo((season: number) => new Map(schedule(season).map((g) => [g.nflverseId, g])));

// ---------- nflverse files ----------

interface StatRow { playerId: string; name: string; position: string; nflverseGame: string; week: number; team: string; opponent: string;
  rushYds: number; recYds: number; passYds: number; carries: number; targets: number; receptions: number; fantasyPoints: number }
const statRows = memo((season: number): StatRow[] => parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/stats_player_week_${season}.csv.gz`))
  .filter((r) => r.season_type === 'REG' && Number(r.season) === season)
  .map((r) => ({ playerId: r.player_id!, name: r.player_display_name!, position: r.position!, nflverseGame: r.game_id!, week: Number(r.week),
    team: teamOf(r.team!), opponent: teamOf(r.opponent_team!), rushYds: num(r.rushing_yards), recYds: num(r.receiving_yards), passYds: num(r.passing_yards),
    carries: num(r.carries), targets: num(r.targets), receptions: num(r.receptions), fantasyPoints: num(r.fantasy_points_ppr) })));

interface RosterRow { gsis: string; team: string; position: string; names: string[]; pfr: string | null; week: number }
const rosterNames = (r: Record<string, string>) => [r.full_name, r.football_name && r.last_name ? `${r.football_name} ${r.last_name}` : null].filter((n): n is string => Boolean(n));
const weeklyRoster = memo((season: number): RosterRow[] => parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/roster_weekly_${season}.csv.gz`))
  .filter((r) => r.game_type === 'REG' && r.gsis_id && r.team)
  .map((r) => ({ gsis: r.gsis_id!, team: teamOf(r.team!), position: r.position!, names: rosterNames(r), pfr: r.pfr_id || null, week: Number(r.week) })));
/** pfr id to gsis id, from the season roster (ids and names only, never status). */
const pfrToGsis = memo((season: number) => {
  const m = new Map<string, string>();
  for (const r of parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/roster_${season}.csv.gz`))) if (r.pfr_id && r.gsis_id) m.set(r.pfr_id, r.gsis_id);
  for (const r of weeklyRoster(season)) if (r.pfr && !m.has(r.pfr)) m.set(r.pfr, r.gsis);
  return m;
});

interface SnapRow { gsis: string | null; name: string; position: string; nflverseGame: string; week: number; team: string; opponent: string; offPct: number | null; played: boolean }
const snapRows = memo((season: number): SnapRow[] => {
  const ids = pfrToGsis(season);
  return parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/snap_counts_${season}.csv.gz`)).filter((r) => r.game_type === 'REG').map((r) => ({
    gsis: ids.get(r.pfr_player_id!) ?? null, name: r.player!, position: r.position!, nflverseGame: r.game_id!, week: Number(r.week),
    team: teamOf(r.team!), opponent: teamOf(r.opponent!), offPct: numOrNull(r.offense_pct),
    played: num(r.offense_snaps) + num(r.defense_snaps) + num(r.st_snaps) > 0,
  }));
});

const injuryRows = memo((season: number) => parseCsv(unzip(`${BACKUPS_DIR}/nflverse/${season}/injuries_${season}.csv.gz`)).filter((r) => r.game_type === 'REG' && r.gsis_id));

/** Depth chart snapshots, per team and moment. 2025 on, the file holds daily snapshots stamped at their dt. */
const depthSnaps = memo((season: number) => {
  const cols = ['dt', 'team', 'player_name', 'gsis_id', 'pos_abb', 'pos_rank'] as const;
  const { rows, missing } = readCsvColumns(unzip(`${BACKUPS_DIR}/nflverse/${season}/depth_charts_${season}.csv.gz`), cols);
  if (missing.length) throw new Error(`depth_charts_${season} lacks ${missing.join(', ')}`);
  const byTeam = new Map<string, Map<string, DepthRow[]>>();
  for (const [dt, team, name, gsis, pos, rank] of rows) {
    if (!gsis || !dt) continue;
    const t = teamOf(team!);
    const snaps = byTeam.get(t) ?? new Map<string, DepthRow[]>();
    const list = snaps.get(dt) ?? [];
    list.push({ team: t, playerId: gsis, name: name!, position: pos!, rank: Number(rank) });
    snaps.set(dt, list);
    byTeam.set(t, snaps);
  }
  return new Map([...byTeam].map(([t, snaps]) => [t, [...snaps].map(([dt, list]) => ({ at: new Date(dt), list })).sort((a, b) => +a.at - +b.at)]));
});

// ---------- Odds capsules ----------

interface Outcome { name: string; description?: string; price: number; point?: number }
interface RawEvent { commence_time: string; away_team: string; home_team: string; bookmakers: { key: string; markets: { key: string; outcomes: Outcome[] }[] }[] }
interface Capsule { capturedAt: string; asked: string | null; source: string; gameId: string; raw: RawEvent }

function readCapsule(ref: WeekRef, kind: 'sat' | 'close' | 'early', gid: string): Capsule | null {
  const f = `${BACKUPS_DIR}/capsules/${ref.season}/wk${pad(ref.week)}/${kind}/odds/${gid}.json.gz`;
  if (!existsSync(f)) return null;
  const c = JSON.parse(unzip(f)) as Capsule;
  return ODDS_SOURCES.has(c.source) ? c : null;
}

const MARKETS = new Map<string, { betType: BetType; alt: boolean }>(BET_TYPES.flatMap((b) => [[`player_${b}`, { betType: b, alt: false }], [`player_${b}_alternate`, { betType: b, alt: true }]] as const));

interface RawQuote extends Quote { player: string; point: number }

/** A player name on the board to a gsis id, among the two teams that week; ambiguous or unknown names fall back to a name id. */
function playerMatcher(season: number, week: number, teams: string[]) {
  const by = new Map<string, string | null>();
  const add = (n: string, id: string) => { const k = nameKey(n); by.set(k, by.has(k) && by.get(k) !== id ? null : id); };
  const roster = weeklyRoster(season);
  for (const r of roster) if (r.week === week && teams.includes(r.team)) r.names.forEach((n) => add(n, r.gsis));
  // Players added to a roster after its weekly stamp: this season's earlier box scores for those two teams.
  const extra = new Map<string, string | null>();
  for (const s of statRows(season)) if (s.week < week && teams.includes(s.team)) { const k = nameKey(s.name); extra.set(k, extra.has(k) && extra.get(k) !== s.playerId ? null : s.playerId); }
  const info = new Map<string, { team: string; position: string }>();
  for (const r of roster) if (r.week <= week && teams.includes(r.team) && (r.week === week || !info.has(r.gsis))) info.set(r.gsis, { team: r.team, position: r.position });
  for (const s of statRows(season)) if (s.week < week && teams.includes(s.team) && !info.has(s.playerId)) info.set(s.playerId, { team: s.team, position: s.position });
  // Last resort, a nickname on one side ("Joshua" against "Josh"): first initial and last name, if unique on the two teams.
  const initial = new Map<string, string | null>();
  const short = (n: string) => { const w = n.replace(/\b(Jr|Sr|II|III|IV|V)\b\.?/g, '').trim().split(/\s+/); return w.length > 1 ? `${nameKey(w[0]!)[0]}|${nameKey(w.slice(1).join(''))}` : null; };
  for (const r of roster) if (r.week === week && teams.includes(r.team)) for (const n of r.names) { const k = short(n); if (k) initial.set(k, initial.has(k) && initial.get(k) !== r.gsis ? null : r.gsis); }
  // A nickname the roster does not carry at all ("Hollywood Brown", "Zonovan Knight"): the last name, if only one
  // skill player on the two teams carries it.
  const last = new Map<string, string | null>();
  const lastOf = (n: string) => { const w = n.replace(/\b(Jr|Sr|II|III|IV|V)\b\.?/g, '').trim().split(/\s+/); return w.length > 1 ? nameKey(w.at(-1)!) : null; };
  for (const r of roster) if (r.week === week && teams.includes(r.team) && SKILL.has(r.position)) { const k = lastOf(r.names[0] ?? ''); if (k) last.set(k, last.has(k) && last.get(k) !== r.gsis ? null : r.gsis); }
  return (name: string) => {
    const k = ALIASES.get(nameKey(name)) ?? nameKey(name);
    const s = short(name), l = lastOf(name);
    const id = by.get(k) ?? extra.get(k) ?? (s ? initial.get(s) : null) ?? (l ? last.get(l) : null) ?? null;
    return id ? { playerId: id, matched: true, ...(info.get(id) ?? { team: '', position: '' }) } : { playerId: `name:${k}`, matched: false, team: '', position: '' };
  };
}

function quotesOf(raw: RawEvent, gid: string, match: ReturnType<typeof playerMatcher>): RawQuote[] {
  const out: RawQuote[] = [];
  for (const b of raw.bookmakers) for (const m of b.markets) {
    const mk = MARKETS.get(m.key);
    if (!mk) continue;
    for (const o of m.outcomes) {
      const side = o.name.toLowerCase();
      if ((side !== 'over' && side !== 'under') || !(o.price > 1) || o.point == null || !o.description) continue;
      out.push({ book: b.key, gameId: gid, playerId: match(o.description).playerId, betType: mk.betType, alt: mk.alt, side, line: thresholdOf(mk.alt, o.point), price: o.price, player: o.description, point: o.point });
    }
  }
  return out;
}
const strip = ({ player: _p, point: _pt, ...q }: RawQuote): Quote => q;
const lineKey = (season: number, gid: string, playerId: string, betType: BetType, line: number) => `${season}|${gid}|${playerId}|${betType}|${line}`;

/** Spreads and totals: for each game, the latest board list stamped at or before its board, median across books. */
function loadScripts(ref: WeekRef, games: SchedGame[]) {
  const dir = `${BACKUPS_DIR}/capsules/${ref.season}/wk${pad(ref.week)}/sat/odds-lists`;
  const lists: { at: Date; data: RawEvent[] }[] = [];
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.startsWith('lines-'))) {
    const c = JSON.parse(unzip(`${dir}/${f}`));
    lists.push({ at: new Date(c.body.timestamp), data: c.body.data });
  }
  const scripts = new Map<string, { homeSpread: number; total: number }>();
  const stamps = new Map<string, Date>();
  for (const g of games) {
    for (const l of lists.filter((x) => x.at <= g.boardAt).sort((a, b) => +b.at - +a.at)) {
      const e = l.data.find((x) => coreGameId(new Date(x.commence_time), teamOf(x.away_team), teamOf(x.home_team)) === g.gameId);
      if (!e) continue;
      const spreads: number[] = [], totals: number[] = [];
      for (const bk of e.bookmakers) for (const m of bk.markets) {
        if (m.key === 'spreads') { const h = m.outcomes.find((o) => o.name === e.home_team); if (h?.point != null) spreads.push(h.point); }
        if (m.key === 'totals') { const o = m.outcomes.find((x) => x.name === 'Over'); if (o?.point != null) totals.push(o.point); }
      }
      if (!spreads.length || !totals.length) continue;
      scripts.set(g.gameId, { homeSpread: median(spreads), total: median(totals) });
      stamps.set(g.gameId, l.at);
      break;
    }
  }
  return { scripts, stamps };
}

// ---------- Football data ----------

/** 4 PM Eastern on a team's final report day: Friday for Sunday, Saturday for Monday, the day before any other day. */
export function injuryFinalAt(kickoff: Date): Date {
  const et = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
    .formatToParts(kickoff).map((p) => [p.type, p.value])) as Record<string, string>;
  const back = et.weekday === 'Sun' || et.weekday === 'Mon' ? 2 : 1;
  const day = new Date(Date.UTC(+et.year!, +et.month! - 1, +et.day! - back)).toISOString().slice(0, 10);
  return zonedTimeToUtc(day, '16:00', 'America/New_York');
}

function logsBefore(wall: Date, upTo: number) {
  const logs: GameLog[] = [];
  const kicks: Date[] = [];
  for (const season of LOG_SEASONS.filter((s) => s <= upTo)) {
    const games = byNflverseId(season);
    const snaps = snapRows(season);
    const pct = new Map(snaps.filter((s) => s.gsis).map((s) => [`${s.nflverseGame}:${s.gsis}`, s.offPct]));
    const seen = new Set<string>();
    for (const r of statRows(season)) {
      const g = games.get(r.nflverseGame);
      if (!g || !(g.kickoff < wall)) continue;
      seen.add(`${r.nflverseGame}:${r.playerId}`);
      kicks.push(g.kickoff);
      logs.push({ season: season as GameLog['season'], week: r.week, gameId: g.gameId, playerId: r.playerId, name: r.name, team: r.team, opponent: r.opponent, position: r.position,
        rushYds: r.rushYds, recYds: r.recYds, passYds: r.passYds, carries: r.carries, targets: r.targets, receptions: r.receptions, routes: null,
        snapPct: pct.get(`${r.nflverseGame}:${r.playerId}`) ?? null, fantasyPoints: r.fantasyPoints });
    }
    // A game with offensive snaps and no stat line is a zero, not a missing game.
    for (const s of snaps) {
      const g = games.get(s.nflverseGame);
      if (!s.gsis || !g || !(g.kickoff < wall) || !(s.offPct && s.offPct > 0) || seen.has(`${s.nflverseGame}:${s.gsis}`)) continue;
      seen.add(`${s.nflverseGame}:${s.gsis}`);
      kicks.push(g.kickoff);
      logs.push({ season: season as GameLog['season'], week: s.week, gameId: g.gameId, playerId: s.gsis, name: s.name, team: s.team, opponent: s.opponent, position: s.position,
        rushYds: 0, recYds: 0, passYds: 0, carries: 0, targets: 0, receptions: 0, routes: null, snapPct: s.offPct, fantasyPoints: 0 });
    }
  }
  return { logs, kicks };
}

/** Each team's latest final injury report stamped before the wall, this season. */
function injuriesBefore(season: number, wall: Date) {
  const sched = schedule(season);
  const stampOf = new Map<string, Date>();
  for (const g of sched) for (const t of [g.home, g.away]) stampOf.set(`${t}|${g.week}`, injuryFinalAt(g.kickoff));
  const latest = new Map<string, number>();
  for (const r of injuryRows(season)) {
    const team = teamOf(r.team!), wk = Number(r.week);
    const at = stampOf.get(`${team}|${wk}`);
    if (at && at < wall && wk > (latest.get(team) ?? 0)) latest.set(team, wk);
  }
  const injuries: Injury[] = [];
  const stamps: Date[] = [];
  const status = (s: string | undefined) => (s === 'Out' || s === 'Doubtful' || s === 'Questionable' ? s : null);
  for (const r of injuryRows(season)) {
    const team = teamOf(r.team!), wk = Number(r.week);
    if (latest.get(team) !== wk) continue;
    stamps.push(stampOf.get(`${team}|${wk}`)!);
    injuries.push({ playerId: r.gsis_id!, name: r.full_name!, team, position: r.position!, status: status(r.report_status),
      practice: r.practice_status && r.practice_status !== 'NA' ? r.practice_status : null });
  }
  return { injuries, stamps };
}

function depthBefore(season: number, at: Date) {
  const rows: DepthRow[] = [];
  const stamps: Date[] = [];
  for (const snaps of depthSnaps(season).values()) {
    const last = snaps.filter((s) => s.at < at).at(-1);
    if (last) { rows.push(...last.list); stamps.push(last.at); }
  }
  return { rows, stamps };
}

// ---------- The week ----------

/** Every moment the world was built from, for the wall test and the report. */
export interface Audit {
  ref: WeekRef;
  firstBoard: Date;
  boards: Map<string, { boardAt: Date; capturedAt: Date; asked: Date | null }>;
  early: Map<string, Date>;
  scripts: Map<string, Date>;
  logKickoffs: Date[];
  injuryStamps: Date[];
  depthStamps: Date[];
  /** Board names that matched no gsis id (their lines key on name:<nameKey>). */
  unmatched: string[];
  /** Alt rungs whose hold came from the board's median because the player had no two-sided main line. */
  medianHolds: number;
}

const gamesOf = (ref: WeekRef) => schedule(ref.season).filter((g) => g.week === ref.week);

function build(ref: WeekRef): { world: WeekWorld; audit: Audit } {
  assertRef(ref);
  const games = gamesOf(ref);
  if (!games.length) throw new Error(`No games for ${weekLabel(ref)}`);
  const firstBoard = new Date(Math.min(...games.map((g) => +g.boardAt)));
  const audit: Audit = { ref, firstBoard, boards: new Map(), early: new Map(), scripts: new Map(), logKickoffs: [], injuryStamps: [], depthStamps: [], unmatched: [], medianHolds: 0 };

  const board: RawQuote[] = [];
  let early: RawQuote[] | null = existsSync(`${BACKUPS_DIR}/capsules/${ref.season}/wk${pad(ref.week)}/early/odds`) ? [] : null;
  const unmatched = new Set<string>();
  const people = new Map<string, ReturnType<ReturnType<typeof playerMatcher>>>();
  for (const g of games) {
    const sat = readCapsule(ref, 'sat', g.gameId);
    if (!sat) throw new Error(`${weekLabel(ref)} ${g.gameId} has no board capsule`);
    const capturedAt = new Date(sat.capturedAt);
    if (capturedAt > g.boardAt) throw new Error(`Time capsule broken: ${g.gameId} board stamped ${sat.capturedAt}, after its board ${g.boardAt.toISOString()}`);
    if (sat.asked && +new Date(sat.asked) !== +g.boardAt) throw new Error(`${g.gameId} board was bought for ${sat.asked}, not its board ${g.boardAt.toISOString()}`);
    audit.boards.set(g.gameId, { boardAt: g.boardAt, capturedAt, asked: sat.asked ? new Date(sat.asked) : null });
    const base = playerMatcher(ref.season, ref.week, [g.home, g.away]);
    const match = (name: string) => { const p = base(name); if (!p.matched) unmatched.add(`${g.gameId} ${name}`); people.set(`${g.gameId}|${p.playerId}`, p); return p; };
    board.push(...quotesOf(sat.raw, g.gameId, match));
    const e = readCapsule(ref, 'early', g.gameId);
    if (e && early) {
      const at = new Date(e.capturedAt);
      if (!(at < g.boardAt)) throw new Error(`Time capsule broken: ${g.gameId} early snapshot stamped ${e.capturedAt}, not before its board`);
      audit.early.set(g.gameId, at);
      early.push(...quotesOf(e.raw, g.gameId, match));
    }
  }
  if (early && !early.length) early = null;
  audit.unmatched = [...unmatched];

  // Holds: each player's two-sided DraftKings main line per stat, and the median per stat on each board.
  const dk = board.filter((q) => q.book === BOOK);
  const mainHold = new Map<string, number>();
  const boardHolds = new Map<string, number[]>();
  const boardOf = new Map(games.map((g) => [g.gameId, g.boardAt.toISOString()]));
  for (const o of dk.filter((q) => !q.alt && q.side === 'over')) {
    const u = dk.find((q) => !q.alt && q.side === 'under' && q.gameId === o.gameId && q.player === o.player && q.betType === o.betType && q.point === o.point);
    if (!u) continue;
    const h = holdOf(o.price, u.price);
    mainHold.set(`${o.gameId}|${o.playerId}|${o.betType}`, h);
    const bk = `${boardOf.get(o.gameId)}|${o.betType}`;
    boardHolds.set(bk, [...(boardHolds.get(bk) ?? []), h]);
  }
  const weekHolds = (b: BetType) => [...boardHolds].filter(([k]) => k.endsWith(`|${b}`)).flatMap(([, v]) => v);

  const lines: Line[] = [];
  const keys = new Set<string>();
  for (const o of dk.filter((q) => q.side === 'over')) {
    const g = games.find((x) => x.gameId === o.gameId)!;
    const p = people.get(`${o.gameId}|${o.playerId}`)!;
    let hold: number;
    const own = dk.find((q) => q.side === 'under' && q.alt === o.alt && q.gameId === o.gameId && q.player === o.player && q.betType === o.betType && q.point === o.point);
    if (own) hold = holdOf(o.price, own.price);
    else if (mainHold.has(`${o.gameId}|${o.playerId}|${o.betType}`)) hold = mainHold.get(`${o.gameId}|${o.playerId}|${o.betType}`)!;
    else {
      audit.medianHolds++;
      const onBoard = boardHolds.get(`${boardOf.get(o.gameId)}|${o.betType}`) ?? [];
      hold = median(onBoard.length ? onBoard : weekHolds(o.betType));
      if (!Number.isFinite(hold)) throw new Error(`${weekLabel(ref)} has no two-sided DraftKings ${o.betType} line to take a hold from`);
    }
    const key = lineKey(ref.season, o.gameId, o.playerId, o.betType, o.line);
    if (keys.has(key)) throw new Error(`Duplicate line key ${key}`);
    keys.add(key);
    const team = p.team || '';
    lines.push({ key, gameId: o.gameId, playerId: o.playerId, player: o.player, team, opponent: team ? (team === g.home ? g.away : g.home) : '',
      position: p.position, betType: o.betType, alt: o.alt, line: o.line, price: o.price, fair: Math.min(1, fairOver(o.price, hold)) });
  }

  const sc = loadScripts(ref, games);
  audit.scripts = sc.stamps;
  const { logs, kicks } = logsBefore(firstBoard, ref.season);
  audit.logKickoffs = kicks;
  const inj = injuriesBefore(ref.season, firstBoard);
  audit.injuryStamps = inj.stamps;
  const depth = depthBefore(ref.season, firstBoard);
  const prevBoard = (() => {
    const prev = ref.week > 1 ? gamesOf({ season: ref.season, week: ref.week - 1 }) : [];
    return prev.length ? new Date(Math.min(...prev.map((g) => +g.boardAt))) : new Date(+firstBoard - 7 * 86_400_000);
  })();
  const depthPrev = depthBefore(ref.season, prevBoard);
  audit.depthStamps = [...depth.stamps, ...depthPrev.stamps];

  const world: WeekWorld = {
    ref, games: games.map(({ gameId, kickoff, home, away, boardAt, roof }) => ({ gameId, kickoff, home, away, boardAt, roof })),
    lines, board: board.map(strip), early: early?.map(strip) ?? null, scripts: sc.scripts, logs,
    injuries: inj.injuries, depth: depth.rows, depthPrev: depthPrev.rows,
  };
  return { world, audit };
}

/** Everything that existed by the week's board. Throws if any input breaks the wall. */
export const openWeek = (ref: WeekRef): WeekWorld => build(ref).world;
/** The world plus every stamp it was built from. */
export const auditWeek = (ref: WeekRef) => build(ref);

// ---------- Monday ----------

export const picksPath = (ref: WeekRef) => `${ledgerDir()}/${weekLabel(ref)}-picks.json`;
const pickKeys = (picks: Pick[]) => picks.map((p) => p.key).sort();

/** Writes the week's picks to the ledger. Picks are recorded once; a different set for the same week is refused. */
export function recordPicks(ref: WeekRef, picks: Pick[]): string {
  assertRef(ref);
  const f = picksPath(ref);
  if (existsSync(f)) {
    const had = JSON.parse(readFileSync(f, 'utf8')) as { picks: Pick[] };
    if (JSON.stringify(pickKeys(had.picks)) !== JSON.stringify(pickKeys(picks))) throw new Error(`${f} already holds different picks; picks are recorded once`);
    return f;
  }
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, `${JSON.stringify({ ref, recordedAt: new Date().toISOString(), picks }, null, 1)}\n`);
  return f;
}

/**
 * Results for every board line (null when he did not play, a refund) and DraftKings' closing price for each board line
 * still posted at the close. Refuses unless the ledger already holds exactly these picks for the week.
 */
export function reveal(ref: WeekRef, picks: Pick[]): Reveal {
  assertRef(ref);
  const f = picksPath(ref);
  if (!existsSync(f)) throw new Error(`Refused: record ${weekLabel(ref)} picks to ${f} before the reveal`);
  const had = JSON.parse(readFileSync(f, 'utf8')) as { picks: Pick[] };
  if (JSON.stringify(pickKeys(had.picks)) !== JSON.stringify(pickKeys(picks))) throw new Error(`Refused: ${f} does not hold these picks`);

  const { world } = build(ref);
  const games = gamesOf(ref);
  const byGame = new Map(games.map((g) => [g.gameId, g]));
  const rows = new Map<string, StatRow>();
  const played = new Set<string>();
  const nfl = byNflverseId(ref.season);
  for (const r of statRows(ref.season)) { const g = nfl.get(r.nflverseGame); if (g && g.week === ref.week) { rows.set(`${g.gameId}|${r.playerId}`, r); played.add(`${g.gameId}|${r.playerId}`); } }
  for (const s of snapRows(ref.season)) { const g = nfl.get(s.nflverseGame); if (g && g.week === ref.week && s.gsis && s.played) played.add(`${g.gameId}|${s.gsis}`); }

  const outcomes: Reveal['outcomes'] = new Map();
  for (const l of world.lines) {
    if (!played.has(`${l.gameId}|${l.playerId}`)) { outcomes.set(l.key, null); continue; }
    const r = rows.get(`${l.gameId}|${l.playerId}`);
    const value = !r ? 0 : l.betType === 'rush_yds' ? r.rushYds : l.betType === 'reception_yds' ? r.recYds : l.betType === 'pass_yds' ? r.passYds : r.rushYds + r.recYds;
    outcomes.set(l.key, { value, hit: overHits(l.alt, l.line, value) });
  }

  const close: Reveal['close'] = new Map();
  const keys = new Set(world.lines.map((l) => l.key));
  for (const g of games) {
    const c = readCapsule(ref, 'close', g.gameId);
    if (!c) continue;
    const at = new Date(c.capturedAt);
    if (!(at > byGame.get(g.gameId)!.boardAt && at <= g.kickoff)) throw new Error(`${g.gameId} close stamped ${c.capturedAt}, outside its board to kickoff`);
    const match = playerMatcher(ref.season, ref.week, [g.home, g.away]);
    for (const q of quotesOf(c.raw, g.gameId, match)) {
      if (q.book !== BOOK || q.side !== 'over') continue;
      const key = lineKey(ref.season, q.gameId, q.playerId, q.betType, q.line);
      if (keys.has(key)) close.set(key, q.price);
    }
  }
  return { ref, outcomes, close };
}
