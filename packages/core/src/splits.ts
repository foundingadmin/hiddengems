// Conditional splits, first set (docs/prd.md F2.2 and section 17): anytime TD rates this season under one condition
// at a time, each shrunk toward his season rate, rate_split = (hits_split + 4 * season_rate) / (n_split + 4). A split
// under 3 games is thin and renders cloudy. Every input is data we already hold: his games, every teammate's usage
// (snap counts and play by play), the schedule's kickoffs and lines, and the roster with the injury report.
// Context only: no split moves a rating.
import { type GameLine, type UsageGame, impliedFactor } from './model';
import { favoredBySpread } from './trends';

/**
 * qb        his team's usual starting quarterback started, or someone else did
 * teammate  his team's WR1, RB1 and TE1 (other than him) all played, or one was missing
 * venue     home or away (a neutral site is neither)
 * rest      short week (5 days or fewer since his team's last game), off a bye (13 days or more), or normal
 * implied   his team's implied points above or below the league average through that week
 * role      favorite or underdog by the spread (a pick'em is neither)
 */
export type SplitKey = 'qb' | 'teammate' | 'venue' | 'rest' | 'implied' | 'role';
export type SplitSide =
  | 'usual' | 'other' | 'in' | 'out' | 'home' | 'away' | 'short' | 'bye' | 'normal' | 'above' | 'below' | 'favorite' | 'underdog';

export const SPLIT_KEYS: readonly SplitKey[] = ['qb', 'teammate', 'venue', 'rest', 'implied', 'role'];
export const SPLIT_SIDES: Record<SplitKey, readonly SplitSide[]> = {
  qb: ['usual', 'other'],
  teammate: ['in', 'out'],
  venue: ['home', 'away'],
  rest: ['short', 'normal', 'bye'],
  implied: ['above', 'below'],
  role: ['favorite', 'underdog'],
};

/** Games of his season rate each split is shrunk toward. */
export const SPLIT_PRIOR_GAMES = 4;
/** A split with fewer games than this is thin. */
export const SPLIT_MIN_GAMES = 3;
/** Days since his team's last game, by Eastern calendar date. */
export const SHORT_WEEK_DAYS = 5;
export const BYE_DAYS = 13;
/** Positions whose top player by snap share counts as a key teammate. */
export const KEY_TEAMMATES = ['WR', 'RB', 'TE'] as const;

/** A regular season game of this season: its lines (model GameLine) plus kickoff and venue. */
export interface SplitScheduleGame extends GameLine {
  kickoff: Date;
  neutralSite: boolean;
}

/** One game he played, with the team he played for (null when unknown) and the touchdowns he scored. */
export interface SplitPlayed {
  gameId: string;
  team: string | null;
  touchdowns: number;
}

/** A player's current standing, for which side this week's game is on. */
export interface SplitRosterEntry {
  playerId: string;
  teamId: string | null;
  /** Roster status (nflverse ACT, RES, INA; the sample sends Active). */
  status: string | null;
  /** Injury report game status: Out, Doubtful, Questionable, or null. */
  injuryStatus: string | null;
}

export interface SplitsInput {
  playerId: string;
  /** His team in the game being priced. */
  team: string;
  game: SplitScheduleGame;
  /** This season's regular season games, for rest and the implied points average. */
  schedule: readonly SplitScheduleGame[];
  /** His games this season; only those in the schedule before this game's week count. */
  played: readonly SplitPlayed[];
  /** Every player's usage in his teams' games this season (snap counts and play by play). */
  usage: readonly UsageGame[];
  /** Passing yards per quarterback game, to name the starter of a game whose snap counts have not landed. */
  passing?: readonly { gameId: string; playerId: string; passingYards: number | null }[];
  /** Everyone currently on his team. Without it, every teammate counts as available this week. */
  roster?: readonly SplitRosterEntry[];
}

export interface SplitCount {
  side: SplitSide;
  hits: number;
  games: number;
  /** Shrunk toward the season rate. */
  rate: number;
  thin: boolean;
}

export interface Split {
  key: SplitKey;
  /** The side this week's game is on; null when it cannot be told (a Questionable teammate, no lines). */
  current: SplitSide | null;
  /** The current side's games, hits and shrunk rate (the season rate with no games). */
  hits: number;
  games: number;
  rate: number;
  seasonRate: number;
  thin: boolean;
  /** Every side, for the loupe. */
  sides: SplitCount[];
  /** Who the condition turns on: the usual starter (qb), or the WR1, RB1 and TE1 other than him (teammate). */
  players: string[];
}

/** One of his games with the side it was on for each condition (null where it cannot be told). */
export interface SplitGame {
  gameId: string;
  week: number;
  touchdowns: number;
  hit: boolean;
  sides: Record<SplitKey, SplitSide | null>;
}

export interface Splits {
  playerId: string;
  season: { hits: number; games: number; rate: number };
  splits: Split[];
  /** His games, oldest first, so the loupe can combine conditions and redraw without another query. */
  log: SplitGame[];
}

export function splitRate(hits: number, games: number, seasonRate: number, prior = SPLIT_PRIOR_GAMES): number {
  return (hits + prior * seasonRate) / (games + prior);
}

const easternDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayNumber = (d: Date) => Date.parse(`${easternDate.format(d)}T00:00:00Z`) / 86_400_000;

/** Short week, off a bye or normal, from the team's previous game; null for its first game. */
export function restOf(kickoff: Date, previous: Date | null): 'short' | 'bye' | 'normal' | null {
  if (!previous) return null;
  const days = dayNumber(kickoff) - dayNumber(previous);
  return days <= SHORT_WEEK_DAYS ? 'short' : days >= BYE_DAYS ? 'bye' : 'normal';
}

const teamGameKey = (gameId: string, team: string) => `${gameId}|${team}`;

/**
 * The quarterback who started each team game: most snaps; before snap counts land, most passing yards; else the
 * only quarterback who played. Unknown games are left out.
 */
export function startingQbs(usage: readonly UsageGame[], passing: SplitsInput['passing'] = []): Map<string, string> {
  const yards = new Map(passing.map((p) => [`${p.gameId}|${p.playerId}`, p.passingYards ?? 0]));
  const qbs = new Map<string, UsageGame[]>();
  for (const u of usage) {
    if (u.position !== 'QB') continue;
    const k = teamGameKey(u.gameId, u.team);
    qbs.set(k, [...(qbs.get(k) ?? []), u]);
  }
  const out = new Map<string, string>();
  for (const [k, list] of qbs) {
    const snapped = list.filter((u) => u.snapPct !== null);
    if (snapped.length) {
      out.set(k, snapped.reduce((a, b) => (b.snapPct! > a.snapPct! ? b : a)).playerId);
      continue;
    }
    const thrown = list.map((u) => ({ id: u.playerId, y: yards.get(`${u.gameId}|${u.playerId}`) ?? 0 })).sort((a, b) => b.y - a.y);
    if (thrown.length === 1 || (thrown[0]!.y > 0 && thrown[0]!.y > thrown[1]!.y)) out.set(k, thrown[0]!.id);
  }
  return out;
}

const AVAILABLE = new Set(['ACT', 'ACTIVE']);
/** out: listed Out or Doubtful, off the active roster, or no longer on the team. unsure: Questionable. */
function standing(entry: SplitRosterEntry | undefined, team: string, roster: SplitsInput['roster']): 'in' | 'out' | 'unsure' {
  if (!roster) return 'in';
  if (!entry || entry.teamId !== team) return 'out';
  if (entry.injuryStatus === 'Out' || entry.injuryStatus === 'Doubtful') return 'out';
  if (entry.status && !AVAILABLE.has(entry.status.toUpperCase())) return 'out';
  return entry.injuryStatus === 'Questionable' ? 'unsure' : 'in';
}

/** The team's top WR, RB and TE by mean snap share in the games each played, with enough games to count. */
export function keyTeammates(usage: readonly UsageGame[], team: string, roster?: SplitsInput['roster']): { playerId: string; position: string; firstWeek: number }[] {
  const own = usage.filter((u) => u.team === team);
  const snapGames = new Set(own.filter((u) => u.snapPct !== null).map((u) => u.gameId));
  const minGames = Math.max(2, Math.ceil(snapGames.size / 3));
  const onTeam = roster ? new Set(roster.filter((r) => r.teamId === team).map((r) => r.playerId)) : null;
  const by = new Map<string, { position: string; snaps: number[]; firstWeek: number }>();
  for (const u of own) {
    const p = by.get(u.playerId) ?? { position: u.position, snaps: [], firstWeek: u.week };
    p.firstWeek = Math.min(p.firstWeek, u.week);
    if (u.snapPct !== null) p.snaps.push(u.snapPct);
    by.set(u.playerId, p);
  }
  const out: { playerId: string; position: string; firstWeek: number }[] = [];
  for (const position of KEY_TEAMMATES) {
    const ranked = [...by.entries()]
      .filter(([id, p]) => p.position === position && p.snaps.length >= minGames && (!onTeam || onTeam.has(id)))
      .map(([id, p]) => ({ id, p, mean: p.snaps.reduce((a, b) => a + b, 0) / p.snaps.length, total: p.snaps.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.mean - a.mean || b.total - a.total || a.id.localeCompare(b.id));
    const top = ranked[0];
    if (top) out.push({ playerId: top.id, position, firstWeek: top.p.firstWeek });
  }
  return out;
}

/**
 * Every condition for one player in one game: which side this game is on, and his hits, games and shrunk rate on
 * that side and every other. Null when he has no games this season before this one.
 */
export function splitsFor(input: SplitsInput): Splits | null {
  const { playerId, team, game, schedule, usage } = input;
  const byId = new Map(schedule.map((g) => [g.gameId, g]));
  const played = input.played
    .map((p) => ({ ...p, g: byId.get(p.gameId) }))
    .filter((p): p is SplitPlayed & { g: SplitScheduleGame } => !!p.g && p.g.week < game.week)
    .sort((a, b) => a.g.week - b.g.week);
  if (!played.length) return null;
  const seasonHits = played.filter((p) => p.touchdowns > 0).length;
  const seasonRate = seasonHits / played.length;
  const roster = input.roster;
  const rosterBy = new Map((roster ?? []).map((r) => [r.playerId, r]));
  const past = usage.filter((u) => {
    const g = byId.get(u.gameId);
    return !!g && g.week < game.week;
  });

  // Who started at quarterback, and his team's usual starter: most starts this season, the latest breaking a tie.
  const starters = startingQbs(past, input.passing);
  const starts = new Map<string, { n: number; week: number }>();
  for (const g of schedule) {
    if (g.week >= game.week) continue;
    const qb = starters.get(teamGameKey(g.gameId, team));
    if (!qb) continue;
    const s = starts.get(qb) ?? { n: 0, week: 0 };
    starts.set(qb, { n: s.n + 1, week: Math.max(s.week, g.week) });
  }
  const usual = [...starts.entries()].sort((a, b) => b[1].n - a[1].n || b[1].week - a[1].week)[0]?.[0] ?? null;

  // His team's key teammates (not him), and the team games each missed after his first game for it.
  const leaders = keyTeammates(past, team, roster).filter((l) => l.playerId !== playerId);
  const playedBy = new Set(past.map((u) => `${u.gameId}|${u.team}|${u.playerId}`));
  const snapsIn = new Set(past.filter((u) => u.snapPct !== null).map((u) => teamGameKey(u.gameId, u.team)));

  const lineSides = (g: SplitScheduleGame, side: string | null) => {
    const home = side === g.homeTeam, away = side === g.awayTeam;
    if (!side || (!home && !away)) return { venue: null, rest: null, implied: null, role: null };
    const previous = schedule
      .filter((o) => (o.homeTeam === side || o.awayTeam === side) && o.kickoff < g.kickoff)
      .reduce<SplitScheduleGame | null>((a, o) => (!a || o.kickoff > a.kickoff ? o : a), null);
    const implied = impliedFactor(g, side, schedule);
    const favored = favoredBySpread(g.spreadLine, home);
    return {
      venue: g.neutralSite ? null : home ? 'home' : 'away',
      rest: restOf(g.kickoff, previous?.kickoff ?? null),
      implied: implied ? (implied.factor > 1 ? 'above' : 'below') : null,
      role: favored === null ? null : favored ? 'favorite' : 'underdog',
    } satisfies Partial<Record<SplitKey, SplitSide | null>>;
  };

  const log: SplitGame[] = played.map((p) => {
    const starter = p.team ? starters.get(teamGameKey(p.gameId, p.team)) : undefined;
    const known = p.team === team && snapsIn.has(teamGameKey(p.gameId, team)) && leaders.length > 0;
    const missing = known && leaders.some((l) => p.g.week >= l.firstWeek && !playedBy.has(`${p.gameId}|${team}|${l.playerId}`));
    return {
      gameId: p.gameId, week: p.g.week, touchdowns: p.touchdowns, hit: p.touchdowns > 0,
      sides: {
        qb: usual && starter ? (starter === usual ? 'usual' : 'other') : null,
        teammate: known ? (missing ? 'out' : 'in') : null,
        ...lineSides(p.g, p.team),
      },
    };
  });

  // This week: the usual starter and the key teammates per the roster and injury report.
  const qbNow = usual ? standing(rosterBy.get(usual), team, roster) : null;
  const matesNow = leaders.map((l) => standing(rosterBy.get(l.playerId), team, roster));
  const current: Record<SplitKey, SplitSide | null> = {
    qb: qbNow === null || qbNow === 'unsure' ? null : qbNow === 'in' ? 'usual' : 'other',
    teammate: !leaders.length ? null : matesNow.includes('out') ? 'out' : matesNow.includes('unsure') ? null : 'in',
    ...lineSides(game, team),
  };

  const count = (key: SplitKey, side: SplitSide): SplitCount => {
    const on = log.filter((g) => g.sides[key] === side);
    const hits = on.filter((g) => g.hit).length;
    return { side, hits, games: on.length, rate: splitRate(hits, on.length, seasonRate), thin: on.length < SPLIT_MIN_GAMES };
  };
  const splits = SPLIT_KEYS.map((key): Split => {
    const sides = SPLIT_SIDES[key].map((side) => count(key, side));
    const now = sides.find((s) => s.side === current[key]);
    return {
      key, current: current[key], hits: now?.hits ?? 0, games: now?.games ?? 0, rate: now?.rate ?? seasonRate, seasonRate,
      thin: (now?.games ?? 0) < SPLIT_MIN_GAMES, sides,
      players: key === 'qb' ? (usual ? [usual] : []) : key === 'teammate' ? leaders.map((l) => l.playerId) : [],
    };
  });
  return { playerId, season: { hits: seasonHits, games: played.length, rate: seasonRate }, splits, log };
}

/**
 * The loupe's read with several conditions on at once: his games on this week's side of every chosen condition,
 * shrunk toward his season rate. A condition with no current side is skipped.
 */
export function combineSplits(s: Splits, keys: readonly SplitKey[]): { keys: SplitKey[]; hits: number; games: number; rate: number; thin: boolean } {
  const on = keys.filter((k) => s.splits.find((x) => x.key === k)?.current != null);
  const want = new Map(on.map((k) => [k, s.splits.find((x) => x.key === k)!.current]));
  const games = s.log.filter((g) => on.every((k) => g.sides[k] === want.get(k)));
  const hits = games.filter((g) => g.hit).length;
  return { keys: on, hits, games: games.length, rate: splitRate(hits, games.length, s.season.rate), thin: games.length < SPLIT_MIN_GAMES };
}

/** Splits the Notes cite (docs/prd.md F2.2), at most this many, under the trend lines. */
export const SPLIT_NOTES = 2;
/** A cited split's shrunk rate sits at least this far from his season rate. */
export const SPLIT_NOTE_GAP = 0.1;
/** Home or away and favored or underdog already have trend lines (trends.ts), so the Notes cite the rest. */
export const SPLIT_NOTE_KEYS: readonly SplitKey[] = ['qb', 'teammate', 'rest', 'implied'];

export interface SplitNote {
  key: SplitKey;
  side: SplitSide;
  hits: number;
  games: number;
  /** Shrunk, as the loupe shows it. */
  rate: number;
  /** abs(raw rate - 0.5) * sqrt(games), the trend lines' score. */
  score: number;
}

/**
 * The splits that count: this week's side of a condition, not thin, short of his whole season, and shrunk at
 * least SPLIT_NOTE_GAP away from his season rate. Ranked like the trend lines; context only.
 */
export function splitNotes(s: Splits, limit = SPLIT_NOTES): SplitNote[] {
  return s.splits
    .filter((x) => SPLIT_NOTE_KEYS.includes(x.key) && x.current != null && !x.thin && x.games < s.season.games
      && Math.abs(x.rate - s.season.rate) >= SPLIT_NOTE_GAP)
    .map((x): SplitNote => ({
      key: x.key, side: x.current!, hits: x.hits, games: x.games, rate: x.rate,
      score: Math.abs(x.hits / x.games - 0.5) * Math.sqrt(x.games),
    }))
    .sort((a, b) => b.score - a.score || SPLIT_KEYS.indexOf(a.key) - SPLIT_KEYS.indexOf(b.key))
    .slice(0, limit);
}
