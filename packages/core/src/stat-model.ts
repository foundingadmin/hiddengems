// The stat ladder model (Nov 7 2026): receptions, receiving yards and rushing yards at a book's line.
// A smoothed, recency weighted hit rate over this season's games, recalibrated, then blended with the
// market like the TD model (statsWeight). Fit and tested on nflverse 2026 weekly stats: fit on Weeks 4 to
// 6, tested on Weeks 7 and later at rungs the model put between 10% and 55%, the raw hit rate ran 3 to 5
// points hot; this read's Brier was 0.1750 against 0.1776 uncalibrated.
import { CLARITY_MAX, type ClarityParts, fairChance } from './gems';
import { type StatMarketId, statNeeded } from './markets';
import { CLARITY_V3, INJURY_SETUP, booksAgree, statsWeight } from './model';

export const MODEL_STAT = 'hg-stat-1.0';

export const STAT_V1 = {
  /** Each older game counts this much of the one after it. */
  decay: 0.9,
  /** Smoothing width: this share of his spread, never under minWidth. */
  width: 0.5,
  minWidth: { receptions: 0.5, receiving_yds: 5, rushing_yds: 5 } as Record<StatMarketId, number>,
  calA: -0.28,
  calB: 0.85,
  /** Sample: full marks at this many games. */
  fullGames: 8,
  /** Consistency: zero once the smoothed read and the plain hit rate differ by this much. */
  consistencyGap: 0.2,
} as const;

const Phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x: number): number {
  // Abramowitz and Stegun 7.1.26, good to 1.5e-7.
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const logit = (p: number) => Math.log(p / (1 - p));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface StatRead {
  /** Calibrated chance he reaches the line, stats alone. */
  chance: number;
  /** Plain hit rate this season, for the sheet and consistency. */
  hitRate: number;
  hits: number;
  games: number;
  /** Hits in his last five games. */
  last5: number;
  last5Games: number;
  /** Recency weighted average of the stat. */
  average: number;
}

/** Stats side of a stat prop: values are his games this season, oldest first. */
export function statChance(market: StatMarketId, values: readonly number[], line: number): StatRead | null {
  const n = values.length;
  if (!n) return null;
  const need = statNeeded(line);
  const w = values.map((_, i) => STAT_V1.decay ** (n - 1 - i));
  const W = w.reduce((a, b) => a + b, 0);
  const avg = values.reduce((s, v, i) => s + w[i]! * v, 0) / W;
  const sd = Math.sqrt(values.reduce((s, v, i) => s + w[i]! * (v - avg) ** 2, 0) / W);
  const h = Math.max(STAT_V1.minWidth[market], STAT_V1.width * sd);
  const smooth = values.reduce((s, v, i) => s + w[i]! * (1 - Phi((need - 0.5 - v) / h)), 0) / W;
  const chance = 1 / (1 + Math.exp(-(STAT_V1.calA + STAT_V1.calB * logit(clamp(smooth, 0.01, 0.99)))));
  const hits = values.filter((v) => v >= need).length;
  const last = values.slice(-5);
  return { chance, hitRate: hits / n, hits, games: n, last5: last.filter((v) => v >= need).length, last5Games: last.length, average: avg };
}

export interface StatPropInput {
  market: StatMarketId;
  line: number;
  /** His games this season with the stat, oldest first; empty without 2026 games. */
  values: readonly number[];
  price: number;
  bookPrices: readonly number[];
  injuryStatus: string | null;
  /** His recent snap share is under 80% of his season share. */
  snapsFalling: boolean;
}

export interface StatPropRead {
  hitChance: number;
  statsChance: number | null;
  statsWeight: number;
  fair: number;
  hasStats: boolean;
  parts: ClarityParts;
  stats: StatRead | null;
}

/** Our read on one stat prop: hit chance and clarity parts. Feed the result to appraise(). */
export function readStatProp(input: StatPropInput): StatPropRead {
  const fair = fairChance(input.price);
  const setup = Math.max(0, (input.injuryStatus ? INJURY_SETUP[input.injuryStatus] ?? CLARITY_MAX.setup : CLARITY_MAX.setup) - (input.snapsFalling ? CLARITY_V3.fallingPenalty : 0));
  const stats = statChance(input.market, input.values, input.line);
  if (!stats) {
    return { hitChance: fair, statsChance: null, statsWeight: 0, fair, hasStats: false, stats: null,
      parts: { sample: 0, consistency: 0, booksAgree: booksAgree(input.bookPrices), setup } };
  }
  const w = statsWeight(stats.games, input.price);
  const hitChance = w * stats.chance + (1 - w) * fair;
  return {
    hitChance, statsChance: stats.chance, statsWeight: w, fair, hasStats: true, stats,
    parts: {
      sample: CLARITY_MAX.sample * Math.min(1, stats.games / STAT_V1.fullGames),
      consistency: CLARITY_MAX.consistency * (1 - Math.min(1, Math.abs(stats.chance - stats.hitRate) / STAT_V1.consistencyGap)),
      booksAgree: booksAgree(input.bookPrices),
      setup,
    },
  };
}
