// The gem rating, Fool's Gold and the Recommended order (docs/prd.md section 8, approved Nov 2 2026,
// to revisit after Week 9 grades). Market math from section 11.4, clarity from section 11.7.
import { impliedFromDecimal } from './odds';

/** The book's cut assumed on a one-sided price: 5% plus 1% per point of decimal odds, at most 35% (section 11.4). */
export const HOUSE_CUT = { base: 0.05, perPoint: 0.01, max: 0.35 } as const;

export function houseCut(decimal: number): number {
  return Math.min(HOUSE_CUT.max, HOUSE_CUT.base + HOUSE_CUT.perPoint * decimal);
}

/** The market's fair chance behind a posted price: the implied chance less the assumed cut (hgs.py v3.0). */
export function fairChance(decimal: number): number {
  return impliedFromDecimal(decimal) * (1 - houseCut(decimal));
}

export interface GemInput {
  /** Our hit chance (the model's appraisal), 0 to 1. */
  hitChance: number;
  /** The posted price at the purchase book, decimal odds. */
  price: number;
  /** Confidence in the read, 0 to 100. */
  clarity: number;
  /** Whether the player has 2026 stats. Without them there is no read and the market stands. */
  hasStats: boolean;
}

/**
 * gem         clears the cut: our chance beats the posted price
 * fools-gold  looks good against the fair price, but the book's cut eats it
 * none        beats neither price
 * unrated     no 2026 stats, so no read
 */
export type GemKind = 'gem' | 'fools-gold' | 'none' | 'unrated';

export interface GemRead {
  kind: GemKind;
  /** 0 to 100 for a gem, otherwise null. */
  rating: number | null;
  /** Carat: our chance minus the market's fair chance, in points. */
  carat: number;
  /** Our chance minus the posted price's implied chance, in points. Above zero clears the cut. */
  gapToPosted: number;
  /** Fair chance behind the posted price. */
  fair: number;
  /** Implied chance of the posted price, cut included. */
  priced: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Carat, in points, that earns the full edge half of the rating. */
export const FULL_CARAT = 10;

/** rating = round(100 * clamp(carat / 10, 0, 1) * clarity / 100), only for props that clear the cut. */
export function gemRating(carat: number, clarity: number): number {
  return Math.round(100 * clamp(carat / FULL_CARAT, 0, 1) * clamp(clarity, 0, 100) / 100);
}

export function appraise({ hitChance, price, clarity, hasStats }: GemInput): GemRead {
  const priced = impliedFromDecimal(price);
  const fair = fairChance(price);
  const carat = (hitChance - fair) * 100;
  const gapToPosted = (hitChance - priced) * 100;
  const base = { carat, gapToPosted, fair, priced };
  if (!hasStats) return { kind: 'unrated', rating: null, ...base };
  if (gapToPosted > 0) return { kind: 'gem', rating: gemRating(carat, clarity), ...base };
  return { kind: carat > 0 ? 'fools-gold' : 'none', rating: null, ...base };
}

export interface Rankable {
  kind: GemKind;
  hitChance: number;
  clarity: number;
  rating: number | null;
}

/** The Recommended score: hit chance times clarity, likeliest real gem first. Null outside gems. */
export function recommendedScore(g: Pick<Rankable, 'kind' | 'hitChance' | 'clarity'>): number | null {
  return g.kind === 'gem' ? g.hitChance * clamp(g.clarity, 0, 100) / 100 : null;
}

const GROUP: Record<GemKind, number> = { gem: 0, unrated: 1, 'fools-gold': 2, none: 3 };

/** Recommended order: gems by hit chance times clarity, then unrated props, then Fool's Gold last. */
export function compareRecommended(a: Rankable, b: Rankable): number {
  if (GROUP[a.kind] !== GROUP[b.kind]) return GROUP[a.kind] - GROUP[b.kind];
  const sa = recommendedScore(a) ?? a.hitChance, sb = recommendedScore(b) ?? b.hitChance;
  if (sb !== sa) return sb - sa;
  return (b.rating ?? -1) - (a.rating ?? -1);
}

export interface ClarityParts {
  /** Sample size, worth up to 40. */
  sample: number;
  /** Consistency, worth up to 30. */
  consistency: number;
  /** Books agree, worth up to 15. */
  booksAgree: number;
  /** Setup (injury report, snap share trend), worth up to 15. */
  setup: number;
}

/** What each clarity part is worth; they add up to 100 (section 11.7). */
export const CLARITY_MAX: Readonly<ClarityParts> = { sample: 40, consistency: 30, booksAgree: 15, setup: 15 };

/** Clarity out of 100: sample 40, consistency 30, books agree 15, setup 15 (section 11.7). */
export function clarityScore(p: ClarityParts): number {
  return Math.round(clamp(p.sample, 0, CLARITY_MAX.sample) + clamp(p.consistency, 0, CLARITY_MAX.consistency)
    + clamp(p.booksAgree, 0, CLARITY_MAX.booksAgree) + clamp(p.setup, 0, CLARITY_MAX.setup));
}

/** A gem joins the New gems row when it reaches this rating, */
export const NEW_GEM_RATING = 90;
/** or when it jumps this much since it was found or last read (docs/build-brief.md, New gems row). */
export const NEW_GEM_JUMP = 15;

export interface GemMarkState {
  /** Rating when the prop first became a gem. */
  foundRating: number;
  /** Rating when last marked read, or null if never read. */
  readRating: number | null;
}

/**
 * Why a gem is new, or null when it is not: it crossed 90, or jumped 15 or more, since it was found
 * (unread) or since it was last marked read.
 */
export function newGemReason(rating: number | null, mark: GemMarkState | null): { kind: 'crossed' | 'jumped'; from: number } | null {
  if (rating === null) return null;
  const from = mark ? mark.readRating ?? mark.foundRating : rating;
  const read = mark?.readRating != null;
  if (rating >= NEW_GEM_RATING && (!read || from < NEW_GEM_RATING)) return { kind: 'crossed', from };
  if (rating - from >= NEW_GEM_JUMP) return { kind: 'jumped', from };
  return null;
}
