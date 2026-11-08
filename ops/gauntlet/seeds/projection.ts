// The shared projection: usage times efficiency, ported from MOD5's projector with every tuned setting stripped
// (no edge floor, no calibration slope, no fitted exponents, no main-line-only or injury filters, no skipped stats).
// Usage is destiny reads it as it stands; game script, matchup, hot hand, cooling off and next man up each change one
// input (a scale, the window of games, or added volume) and price the same curve.
//
// A bet type is made of parts: rushing (carries times yards per carry), receiving (targets times yards per target) and
// passing (yards per game: the log has no attempts, so a quarterback's volume is his yards).
import type { BetType, GameLog, WeekWorld } from '../contract';
import { clamp, gamesByPlayer, median, mean, phi, posGroup, seasons } from './shared';

/** A game four games back counts half: game plans, health and depth charts turn over in about a month. */
const HALF_LIFE_GAMES = 4;
/** Last season's role counts as three games: an offseason changes coordinators and teammates, and roles settle in about a month. */
export const LAST_SEASON_GAMES = 3;
/** A rate needs about two games of a starter's work (some 30 carries, 15 targets) before it says more about him than his position. */
const PRIOR_VOLUME: Record<Part, number> = { rush: 30, rec: 15, pass: 0 };
/** Most skill players touch the ball in a game they play; two games of an 85% prior keep one blank from reading as a pattern. */
const ANY_OUTPUT_PRIOR = 0.85;
const ANY_OUTPUT_GAMES = 2;
/** One play moves a yardage total by about a first down, so no curve is sharper than 8 yards. */
const MIN_SD_YARDS = 8;
/** A spread is measured only from players with four games of output: fewer is one hot game and some noise. */
const SPREAD_MIN_GAMES = 4;
/** Typical game-to-game swing of a skill player's yards, used only when a position has no measured spread. */
const FALLBACK_CV = 0.6;

export type Part = 'rush' | 'rec' | 'pass';
export const PARTS: Record<BetType, Part[]> = { rush_yds: ['rush'], reception_yds: ['rec'], pass_yds: ['pass'], rush_reception_yds: ['rush', 'rec'] };

export const yards = (l: GameLog, p: Part) => (p === 'rush' ? l.rushYds : p === 'rec' ? l.recYds : l.passYds);
const volume = (l: GameLog, p: Part) => (p === 'rush' ? l.carries : p === 'rec' ? l.targets : l.passYds);
export const statValue = (l: GameLog, bet: BetType) => PARTS[bet].reduce((a, p) => a + yards(l, p), 0);

/** Which games and weights a projection uses. */
export type Window =
  | 'recent' // this season, recent games first, last season worth LAST_SEASON_GAMES (Usage is destiny)
  | 'last3' // this season's last 3 games, equal weight (Hot hand)
  | 'season'; // every game this season, equal weight (Cooling off)

export interface ProjectOptions {
  window?: Window;
  /** Multiplies each part's mean (game script, matchup). */
  scale?: Partial<Record<Part, number>>;
  /** Volume added per game to each part, in the part's own unit: carries, targets, passing yards (next man up). */
  addVolume?: Partial<Record<Part, number>>;
}

export interface Projection {
  /** Average output per game, zeros included. */
  mean: number;
  /** Chance of any output at all. */
  pPos: number;
  /** Mean and spread of the curve that prices games with output. */
  cm: number;
  sd: number;
  /** Games this season that count. */
  games: number;
}

interface Weighted { log: GameLog; w: number }

export interface Projector {
  /** Played games this season and last, oldest first. */
  history(playerId: string): { now: GameLog[]; last: GameLog[] };
  /** A player's recent volume per game, per part (recency weights, last season early). */
  volume(playerId: string): Record<Part, number> | null;
  project(playerId: string, position: string, bet: BetType, opts?: ProjectOptions): Projection | null;
}

export function projector(world: WeekWorld): Projector {
  const byPlayer = gamesByPlayer(world);
  const groupOf = (l: GameLog) => posGroup(l.position);

  // League rate per position and part (yards per carry, per target), over every played game on record.
  const rate = new Map<string, { yds: number; vol: number }>();
  for (const v of byPlayer.values()) for (const l of v) for (const p of ['rush', 'rec', 'pass'] as Part[]) {
    const k = `${groupOf(l)}|${p}`;
    const cur = rate.get(k) ?? { yds: 0, vol: 0 };
    cur.yds += yards(l, p); cur.vol += volume(l, p);
    rate.set(k, cur);
  }
  const leagueRate = (pos: string, p: Part) => {
    if (p === 'pass') return 1;
    const r = rate.get(`${pos}|${p}`);
    return r && r.vol > 0 ? r.yds / r.vol : 0;
  };

  // Spread: median coefficient of variation of games with output, per position and bet type, per player season.
  const cvs = new Map<string, number[]>();
  for (const v of byPlayer.values()) {
    const bySeason = new Map<number, GameLog[]>();
    for (const l of v) bySeason.set(l.season, [...(bySeason.get(l.season) ?? []), l]);
    for (const games of bySeason.values()) {
      if (games.length < SPREAD_MIN_GAMES) continue;
      const pos = groupOf(games.at(-1)!);
      for (const bet of Object.keys(PARTS) as BetType[]) {
        const xs = games.map((l) => statValue(l, bet)).filter((x) => x > 0);
        if (xs.length < SPREAD_MIN_GAMES) continue;
        const m = mean(xs);
        if (m <= 0.5) continue;
        const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
        cvs.set(`${pos}|${bet}`, [...(cvs.get(`${pos}|${bet}`) ?? []), sd / m]);
      }
    }
  }
  const cvOf = (pos: string, bet: BetType) => median(cvs.get(`${pos}|${bet}`) ?? []) || FALLBACK_CV;

  const history = (pid: string) => seasons(world, byPlayer.get(pid) ?? []);

  function weigh(pid: string, window: Window): { rows: Weighted[]; nEff: number; games: number } {
    const { now, last } = history(pid);
    if (window === 'last3') { const xs = now.slice(-3); return { rows: xs.map((log) => ({ log, w: 1 })), nEff: xs.length, games: now.length }; }
    if (window === 'season') return { rows: now.map((log) => ({ log, w: 1 })), nEff: now.length, games: now.length };
    const rows = now.map((log, i) => ({ log, w: 0.5 ** ((now.length - 1 - i) / HALF_LIFE_GAMES) }));
    const W = rows.reduce((a, r) => a + r.w, 0);
    const nNow = W ? W ** 2 / rows.reduce((a, r) => a + r.w ** 2, 0) : 0;
    // Last season's games share LAST_SEASON_GAMES of weight: its per-game average counts as that many games.
    for (const log of last) rows.push({ log, w: LAST_SEASON_GAMES / last.length });
    return { rows, nEff: nNow + (last.length ? LAST_SEASON_GAMES : 0), games: now.length };
  }

  function volumeOf(pid: string): Record<Part, number> | null {
    const { rows } = weigh(pid, 'recent');
    const W = rows.reduce((a, r) => a + r.w, 0);
    if (!W) return null;
    const v = (p: Part) => rows.reduce((a, r) => a + r.w * volume(r.log, p), 0) / W;
    return { rush: v('rush'), rec: v('rec'), pass: v('pass') };
  }

  return {
    history,
    volume: volumeOf,
    project(pid, position, bet, opts = {}) {
      const pos = posGroup(position);
      const { rows, nEff, games } = weigh(pid, opts.window ?? 'recent');
      const W = rows.reduce((a, r) => a + r.w, 0);
      const added = opts.addVolume && Object.values(opts.addVolume).some((x) => (x ?? 0) > 0);
      if (!W && !added) return null;
      let m = 0;
      for (const p of PARTS[bet]) {
        const vol = (W ? rows.reduce((a, r) => a + r.w * volume(r.log, p), 0) / W : 0) + (opts.addVolume?.[p] ?? 0);
        const k = PRIOR_VOLUME[p];
        const sumVol = rows.reduce((a, r) => a + r.w * volume(r.log, p), 0);
        const eff = p === 'pass' ? 1 : (rows.reduce((a, r) => a + r.w * yards(r.log, p), 0) + k * leagueRate(pos, p)) / (sumVol + k || 1);
        m += vol * eff * (opts.scale?.[p] ?? 1);
      }
      const pPos = (rows.reduce((a, r) => a + r.w * (statValue(r.log, bet) > 0 ? 1 : 0), 0) + ANY_OUTPUT_GAMES * ANY_OUTPUT_PRIOR) / (W + ANY_OUTPUT_GAMES);
      const cm = m / pPos;
      // Uncertainty in the average itself widens the curve: fewer effective games, wider.
      const sd = Math.max(cvOf(pos, bet) * cm, MIN_SD_YARDS) * Math.sqrt(1 + 1 / Math.max(nEff, 1));
      return { mean: m, pPos, cm, sd, games };
    },
  };
}

/**
 * Chance the stat clears the line: the chance of any output times a lognormal over the games with output. Lognormal
 * because yards skew right (one long play lifts a game), so the median game sits below the average.
 */
export function overChance(line: number, pr: Projection): number {
  if (!(pr.cm > 0)) return clamp(0);
  const s2 = Math.log(1 + (pr.sd / pr.cm) ** 2);
  const z = (Math.log(Math.max(line, 0.01)) - (Math.log(pr.cm) - s2 / 2)) / Math.sqrt(s2);
  return clamp(pr.pPos * (1 - phi(z)));
}

/** Runs a projection over every line on the board; lines it returns null for stay silent. */
export function speakFromProjection(world: WeekWorld, opts: (line: WeekWorld['lines'][number], proj: Projector) => ProjectOptions | null): Map<string, number> {
  const proj = projector(world);
  const out = new Map<string, number>();
  for (const l of world.lines) {
    const o = opts(l, proj);
    if (!o) continue;
    const pr = proj.project(l.playerId, l.position, l.betType, o);
    if (pr) out.set(l.key, overChance(l.line, pr));
  }
  return out;
}
