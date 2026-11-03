// Hidden Gems v3.0 (docs/prd.md section 11), ported from hgs.py in the old pipeline. No I/O: the jobs
// hand it this season's usage per player game, the schedule's lines, the injury report and the books'
// prices, and it returns our hit chance and the clarity behind it.
//
//   red zone read   inside 10 carries x league TD rate per carry, plus inside 10 targets x league TD
//                   rate per target, plus long touchdowns shrunk toward the position's rate for his snaps
//   implied points  expected touchdowns scale by the team's implied points over the league average
//   blend           80% red zone read, 20% shrunk TD hit rate, then logistic recalibration
//   market blend    stats weight 0.5 (0.3 under 4 games) x min(1, 8 / (odds + 4)), the rest is the fair price
//   clarity         sample 40, consistency 30, books agree 15, setup 15
import { type ClarityParts, fairChance } from './gems';
import { impliedFromDecimal } from './odds';

export const MODEL_V3 = 'hg-v3.0';

/** Constants fit by the walk-forward backtest over Weeks 4 to 8 of 2026 (section 11.3). */
export const V3 = {
  /** Prior games that pull a player's long touchdown rate toward his position's rate. */
  longPrior: 32,
  /** Long touchdowns per full game of snaps when a position has no history. */
  longFallback: 0.02,
  /** Weight of the red zone read in the blend; the rest is the shrunk TD hit rate. */
  redZoneWeight: 0.8,
  /** Prior games behind the TD hit rate, at 20% scaled by snap share (full at 60%). */
  hitPrior: 8,
  hitPriorRate: 0.2,
  hitPriorSnaps: 0.6,
  /** Logistic recalibration: logit(p) -> a + b * logit(p). */
  calA: -0.213,
  calB: 0.755,
  /** Implied team points exponent (section 11.8). */
  impliedExponent: 1,
  /** Stats weight in the market blend: 0.5 from 4 games, 0.3 under. */
  statsWeight: 0.5,
  statsWeightThin: 0.3,
  thinGames: 4,
} as const;

/** One player's usage in one game, built from nflverse play by play and snap counts. */
export interface UsageGame {
  playerId: string;
  gameId: string;
  week: number;
  team: string;
  /** Position in that game (QB, RB, WR, TE, FB). */
  position: string;
  /** Offensive snap share, 0 to 1. Null until snap counts land (a few days behind play by play). */
  snapPct: number | null;
  /** Carries inside the opponent's 10. */
  rzCarries: number;
  /** Targets inside the opponent's 10. */
  rzTargets: number;
  /** Touchdowns on those carries and targets. */
  rzCarryTds: number;
  rzTargetTds: number;
  /** Every touchdown he scored (rushing, receiving, returns, recoveries). */
  touchdowns: number;
}

export interface LeagueRates {
  /** Touchdowns per inside 10 carry. */
  carryTd: number;
  /** Touchdowns per inside 10 target. */
  targetTd: number;
  /** Long touchdowns (anything not on an inside 10 carry or target) per full game of snaps, by position. */
  longPerSnapGame: Record<string, number>;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : NaN);
const longTds = (g: UsageGame) => Math.max(0, g.touchdowns - g.rzCarryTds - g.rzTargetTds);

export function leagueRates(logs: readonly UsageGame[]): LeagueRates {
  const carryTd = sum(logs.map((g) => g.rzCarryTds)) / Math.max(1, sum(logs.map((g) => g.rzCarries)));
  const targetTd = sum(logs.map((g) => g.rzTargetTds)) / Math.max(1, sum(logs.map((g) => g.rzTargets)));
  const long: Record<string, [number, number]> = {};
  for (const g of logs) {
    if (g.snapPct === null) continue;
    const t = (long[g.position] ??= [0, 0]);
    t[0] += longTds(g);
    t[1] += g.snapPct;
  }
  const longPerSnapGame: Record<string, number> = {};
  for (const [pos, [tds, snaps]] of Object.entries(long)) if (snaps > 0) longPerSnapGame[pos] = tds / snaps;
  return { carryTd, targetTd, longPerSnapGame };
}

/** A player's season so far, as the model reads it. */
export interface PlayerForm {
  playerId: string;
  /** Position and team from his latest game. */
  position: string;
  team: string;
  games: number;
  /** Games he scored in. */
  tdGames: number;
  touchdowns: number;
  rzCarriesPerGame: number;
  rzTargetsPerGame: number;
  /** Mean snap share this season (0.5 when no snap counts yet). */
  snapSeason: number;
  /** Mean snap share over his last 3 games with snap counts (season mean when none). */
  snapRecent: number;
  /** TD rate over his last 5 games. */
  last5: number;
  /** Long touchdowns per game, shrunk toward his position's rate for his snaps. */
  longRate: number;
  /** Expected touchdowns per game before implied points: the red zone read. */
  lambda: number;
}

/** Every player's form from this season's usage. Pass only games played before the one being priced. */
export function playerForms(logs: readonly UsageGame[], rates = leagueRates(logs)): Map<string, PlayerForm> {
  const by = new Map<string, UsageGame[]>();
  for (const g of logs) {
    const list = by.get(g.playerId);
    if (list) list.push(g); else by.set(g.playerId, [g]);
  }
  const out = new Map<string, PlayerForm>();
  for (const [playerId, list] of by) {
    const games = [...list].sort((a, b) => a.week - b.week);
    const latest = games[games.length - 1]!;
    const n = games.length;
    const snaps = games.map((g) => g.snapPct).filter((s): s is number => s !== null);
    const snapSeason = snaps.length ? mean(snaps) : 0.5;
    const snapRecent = snaps.length ? mean(snaps.slice(-3)) : snapSeason;
    const rzCarriesPerGame = mean(games.map((g) => g.rzCarries));
    const rzTargetsPerGame = mean(games.map((g) => g.rzTargets));
    const longPerGame = sum(games.map(longTds)) / n;
    const prior = (rates.longPerSnapGame[latest.position] ?? V3.longFallback) * snapRecent;
    const longRate = (longPerGame * n + V3.longPrior * prior) / (n + V3.longPrior);
    out.set(playerId, {
      playerId, position: latest.position, team: latest.team, games: n,
      tdGames: games.filter((g) => g.touchdowns > 0).length,
      touchdowns: sum(games.map((g) => g.touchdowns)),
      rzCarriesPerGame, rzTargetsPerGame, snapSeason, snapRecent,
      last5: mean(games.slice(-5).map((g) => (g.touchdowns > 0 ? 1 : 0))),
      longRate,
      lambda: rzCarriesPerGame * rates.carryTd + rzTargetsPerGame * rates.targetTd + longRate,
    });
  }
  return out;
}

/** A game's betting lines from the schedule. spreadLine above zero means the home team is favored. */
export interface GameLine {
  gameId: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  spreadLine: number | null;
  totalLine: number | null;
}

/** Implied points for each team in a game: half the total, plus or minus half the spread. */
export function impliedPoints(g: GameLine): { home: number; away: number } | null {
  if (g.spreadLine === null || g.totalLine === null) return null;
  return { home: g.totalLine / 2 + g.spreadLine / 2, away: g.totalLine / 2 - g.spreadLine / 2 };
}

/**
 * A team's implied points in one game over the league average for every team-game through that week
 * (section 11.8). Null without lines, so the model runs as if the factor were 1.
 */
export function impliedFactor(game: GameLine, team: string, season: readonly GameLine[]): { factor: number; points: number } | null {
  const own = impliedPoints(game);
  if (!own) return null;
  const points = team === game.homeTeam ? own.home : team === game.awayTeam ? own.away : null;
  if (points === null) return null;
  const all = season.filter((g) => g.week <= game.week).map(impliedPoints).filter((p) => p !== null).flatMap((p) => [p.home, p.away]);
  const avg = mean(all);
  if (!(avg > 0)) return null;
  return { factor: points / avg, points };
}

const logit = (p: number) => Math.log(p / (1 - p));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface StatsRead {
  /** Calibrated chance he scores, from the stats alone. */
  chance: number;
  /** Red zone read as a chance: 1 - exp(-lambda x implied factor). */
  redZone: number;
  /** TD hit rate shrunk toward 20% for his snap share. */
  hitRate: number;
}

/** The stats side of the model: red zone read with implied points, blended with the hit rate, recalibrated. */
export function statsChance(form: PlayerForm, impliedFactorValue = 1): StatsRead {
  const redZone = 1 - Math.exp(-form.lambda * impliedFactorValue ** V3.impliedExponent);
  const hitRate = (form.tdGames + V3.hitPrior * V3.hitPriorRate * Math.min(1, form.snapRecent / V3.hitPriorSnaps)) / (form.games + V3.hitPrior);
  const m = clamp(V3.redZoneWeight * redZone + (1 - V3.redZoneWeight) * hitRate, 0.005, 0.995);
  return { chance: 1 / (1 + Math.exp(-(V3.calA + V3.calB * logit(m)))), redZone, hitRate };
}

/** How much the stats get to say against the market: long shots need more proof (section 11.4). */
export function statsWeight(games: number, price: number): number {
  return (games >= V3.thinGames ? V3.statsWeight : V3.statsWeightThin) * Math.min(1, 8 / (price + 4));
}

/** Injury report statuses and what each leaves of the 15 setup points. Anything else (or none) keeps all 15. */
export const INJURY_SETUP: Record<string, number> = { Out: 0, Doubtful: 2, Questionable: 8 };

export interface ClarityInput {
  /** The player's form; null without 2026 stats. */
  form: PlayerForm | null;
  stats: StatsRead | null;
  /** Purchase book price, decimal. */
  price: number;
  hitChance: number;
  /** Every book's decimal price for the prop, the purchase book included. */
  bookPrices: readonly number[];
  /** Latest injury report status, if listed. */
  injuryStatus: string | null;
}

/** Books agree: the range of the books' implied chances over their mean, full marks when equal, zero at 25%. One book: 7. */
export function booksAgree(prices: readonly number[]): number {
  if (prices.length < 2) return 7;
  const ips = prices.map(impliedFromDecimal);
  const range = Math.max(...ips) - Math.min(...ips);
  return 15 * (1 - Math.min(1, range / mean(ips) / 0.25));
}

/** Clarity's four parts (section 11.7). Without stats there is no sample or consistency to measure. */
export function clarityParts(c: ClarityInput): ClarityParts {
  const injury = c.injuryStatus ? INJURY_SETUP[c.injuryStatus] ?? 15 : 15;
  if (!c.form || !c.stats) return { sample: 0, consistency: 0, booksAgree: booksAgree(c.bookPrices), setup: injury };
  const priced = impliedFromDecimal(c.price);
  const falling = c.form.snapRecent < 0.8 * c.form.snapSeason ? 5 : 0;
  return {
    sample: 40 * Math.min(1, c.form.games * Math.max(priced, c.hitChance) / 3),
    consistency: 30 * (1 - Math.min(1, Math.abs(c.stats.chance - c.stats.hitRate) / 0.25)),
    booksAgree: booksAgree(c.bookPrices),
    setup: Math.max(0, injury - falling),
  };
}

export interface ModelInput {
  /** Null when the player has no 2026 games: no read, the market stands. */
  form: PlayerForm | null;
  /** Implied points factor for his team in this game; 1 when the lines are missing. */
  impliedFactor?: number;
  /** Purchase book price, decimal. */
  price: number;
  bookPrices: readonly number[];
  injuryStatus: string | null;
}

export interface ModelRead {
  /** Our hit chance: the stats blended with the market's fair price. */
  hitChance: number;
  /** The stats-only chance, null without stats. */
  statsChance: number | null;
  /** Share of the hit chance that came from the stats. */
  statsWeight: number;
  /** The fair price the stats were blended with. */
  fair: number;
  hasStats: boolean;
  parts: ClarityParts;
}

/** Our read on one anytime TD prop: hit chance and clarity parts. Feed the result to appraise(). */
export function readProp(input: ModelInput): ModelRead {
  const fair = fairChance(input.price);
  if (!input.form) {
    return {
      hitChance: fair, statsChance: null, statsWeight: 0, fair, hasStats: false,
      parts: clarityParts({ form: null, stats: null, price: input.price, hitChance: fair, bookPrices: input.bookPrices, injuryStatus: input.injuryStatus }),
    };
  }
  const stats = statsChance(input.form, input.impliedFactor ?? 1);
  const w = statsWeight(input.form.games, input.price);
  const hitChance = w * stats.chance + (1 - w) * fair;
  return {
    hitChance, statsChance: stats.chance, statsWeight: w, fair, hasStats: true,
    parts: clarityParts({ form: input.form, stats, price: input.price, hitChance, bookPrices: input.bookPrices, injuryStatus: input.injuryStatus }),
  };
}
