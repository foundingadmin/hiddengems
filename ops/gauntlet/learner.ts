// The learner. Blend, pick, score, reweight and pool, as ops/gauntlet/README.md describes them. Pure functions over
// the contract's types: no files, no clock, no network. run.ts walks the weeks and keeps the state; report.ts reads
// what run.ts wrote.
import {
  BET_TYPES, type BetType, type Line, type Pick, type Reveal, type Rules, SEED_IDS, type SeedId, type Weights,
} from './contract';

export type SeedSet = Record<SeedId, number>;
/** Every seed's chances for one week, as seed.read(world) returned them. A line a seed left out is silent. */
export type SeedChances = Record<SeedId, Map<string, number>>;

/** Chances are held off 0 and 1 so log odds and log loss stay finite. */
const EDGE = 1e-6;
export const clampChance = (p: number) => Math.min(1 - EDGE, Math.max(EDGE, p));
export const logit = (p: number) => { const q = clampChance(p); return Math.log(q / (1 - q)); };
export const inverseLogit = (x: number) => 1 / (1 + Math.exp(-x));

export const evenSet = (): SeedSet => Object.fromEntries(SEED_IDS.map((s) => [s, 1 / SEED_IDS.length])) as SeedSet;
export const startWeights = (): Weights => ({
  shared: evenSet(),
  byBetType: Object.fromEntries(BET_TYPES.map((b) => [b, evenSet()])) as Record<BetType, SeedSet>,
});

export function normalize(set: SeedSet): SeedSet {
  const total = SEED_IDS.reduce((t, s) => t + set[s], 0);
  return Object.fromEntries(SEED_IDS.map((s) => [s, set[s] / total])) as SeedSet;
}

// ---------------------------------------------------------------------------------------------------------------
// Saturday, blend

export interface Blend {
  chance: number;
  /** Each seed's push on the line in log odds, weight times (its log odds minus fair's). Silent seeds push 0. */
  contributions: Record<SeedId, number>;
  /** The seed's own chance, or null when it was silent and stood in at fair. */
  seedChances: Record<SeedId, number | null>;
}

/**
 * The MOD's chance: the weighted average of every seed's chance in log odds, silent seeds at DraftKings' fair chance.
 * Since each set adds to 1, logit(chance) = logit(fair) + the sum of the contributions.
 */
export function blend(line: Line, chances: SeedChances, weights: SeedSet): Blend {
  const base = logit(line.fair);
  let x = base;
  const contributions = {} as Record<SeedId, number>;
  const seedChances = {} as Record<SeedId, number | null>;
  for (const s of SEED_IDS) {
    const p = chances[s].get(line.key);
    const spoke = p !== undefined && Number.isFinite(p);
    seedChances[s] = spoke ? p : null;
    contributions[s] = spoke ? weights[s] * (logit(p) - base) : 0;
    x += contributions[s];
  }
  return { chance: inverseLogit(x), contributions, seedChances };
}

// ---------------------------------------------------------------------------------------------------------------
// Saturday, pick

export interface Gem extends Pick { seedChances: Record<SeedId, number | null>; rank: number }

/**
 * Edge is the MOD's chance minus 1 / price, so the cut stays in. Odds within minPrice to maxPrice and positive edge,
 * at most perPlayer per player, best edge first, up to picksPerWeek. Ties go to the line key so a rerun matches.
 */
export function pick(lines: Line[], chances: SeedChances, weights: Weights, rules: Rules): Gem[] {
  const candidates: Omit<Gem, 'rank'>[] = [];
  for (const line of lines) {
    if (!(line.price >= rules.minPrice && line.price <= rules.maxPrice)) continue;
    const b = blend(line, chances, weights.byBetType[line.betType]);
    const edge = b.chance - 1 / line.price;
    if (!(edge > 0)) continue;
    candidates.push({ key: line.key, line, chance: b.chance, edge, contributions: b.contributions, seedChances: b.seedChances });
  }
  candidates.sort((a, b) => b.edge - a.edge || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const perPlayer = new Map<string, number>();
  const gems: Gem[] = [];
  for (const c of candidates) {
    if (gems.length >= rules.picksPerWeek) break;
    const n = perPlayer.get(c.line.playerId) ?? 0;
    if (n >= rules.perPlayer) continue;
    perPlayer.set(c.line.playerId, n + 1);
    gems.push({ ...c, rank: gems.length + 1 });
  }
  return gems;
}

// ---------------------------------------------------------------------------------------------------------------
// Tuesday, score

export const logLoss = (p: number, hit: boolean) => -Math.log(hit ? clampChance(p) : 1 - clampChance(p));

export interface SeedScore { gain: number; lines: number }
export interface WeekScores {
  /** All bet types together, for the shared set. */
  shared: Record<SeedId, SeedScore>;
  byBetType: Record<BetType, Record<SeedId, SeedScore>>;
  /** Graded board lines this week (refunds left out), per bet type. */
  graded: Record<BetType, number>;
}

const emptyScores = () => Object.fromEntries(SEED_IDS.map((s) => [s, { gain: 0, lines: 0 }])) as Record<SeedId, SeedScore>;

/**
 * Each seed's log loss gain over fair, summed over every graded board line it spoke on, per bet type and for all
 * bet types together. A silent line counts 0, which is exactly what the blend gets from a silent seed, so the sum is
 * the seed's whole worth to the blend that week. Lines with no result (he did not play) are left out.
 */
export function score(lines: Line[], chances: SeedChances, reveal: Reveal): WeekScores {
  const out: WeekScores = {
    shared: emptyScores(),
    byBetType: Object.fromEntries(BET_TYPES.map((b) => [b, emptyScores()])) as WeekScores['byBetType'],
    graded: Object.fromEntries(BET_TYPES.map((b) => [b, 0])) as Record<BetType, number>,
  };
  for (const line of lines) {
    const o = reveal.outcomes.get(line.key);
    if (!o) continue;
    out.graded[line.betType] += 1;
    const fairLoss = logLoss(line.fair, o.hit);
    for (const s of SEED_IDS) {
      const p = chances[s].get(line.key);
      if (p === undefined || !Number.isFinite(p)) continue;
      const gain = fairLoss - logLoss(p, o.hit);
      for (const cell of [out.shared[s], out.byBetType[line.betType][s]]) { cell.gain += gain; cell.lines += 1; }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Tuesday, reweight

/**
 * Rank based. Seeds that spoke are ranked by gain (ties share a rank). The best is multiplied by 1 + maxStep, the
 * worst by 1 - maxStep, the rest in proportion to their rank between. Silent seeds hold exactly. The seeds that
 * spoke are then rescaled to their old total, so the set still adds to 1, and no weight ever moves by more than
 * maxStep of itself in one week (the rescale is solved with each weight held inside that band).
 */
export function reweight(set: SeedSet, scores: Record<SeedId, SeedScore>, maxStep: number): SeedSet {
  const spoke = SEED_IDS.filter((s) => scores[s].lines > 0);
  if (spoke.length < 2) return { ...set };
  const sorted = [...spoke].sort((a, b) => scores[b].gain - scores[a].gain);
  const rank = new Map<SeedId, number>();
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && scores[sorted[j + 1]!].gain === scores[sorted[i]!].gain) j++;
    for (let k = i; k <= j; k++) rank.set(sorted[k]!, (i + j) / 2);
    i = j + 1;
  }
  const last = sorted.length - 1;
  const factor = (s: SeedId) => 1 + maxStep * (1 - (2 * rank.get(s)!) / last);
  const mass = spoke.reduce((t, s) => t + set[s], 0);
  const lo = (s: SeedId) => set[s] * (1 - maxStep);
  const hi = (s: SeedId) => set[s] * (1 + maxStep);
  const at = (lambda: number, s: SeedId) => Math.min(hi(s), Math.max(lo(s), set[s] * factor(s) * lambda));
  const total = (lambda: number) => spoke.reduce((t, s) => t + at(lambda, s), 0);
  // total() rises with lambda from mass * (1 - maxStep) to mass * (1 + maxStep), so bisection finds the rescale.
  let a = 0;
  let b = 1;
  while (total(b) < mass) b *= 2;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (total(m) < mass) a = m; else b = m; }
  const next = { ...set };
  for (const s of spoke) next[s] = at(b, s);
  return normalize(next);
}

// ---------------------------------------------------------------------------------------------------------------
// Tuesday, pool

/** How much of a bet type's blend set is its own evidence: lines / (lines + poolingLines). */
export const ownShare = (lines: number, poolingLines: number) => (lines + poolingLines > 0 ? lines / (lines + poolingLines) : 0);

export function pool(own: SeedSet, shared: SeedSet, lines: number, poolingLines: number): SeedSet {
  const a = ownShare(lines, poolingLines);
  return normalize(Object.fromEntries(SEED_IDS.map((s) => [s, a * own[s] + (1 - a) * shared[s]])) as SeedSet);
}

// ---------------------------------------------------------------------------------------------------------------
// The state the walk carries from week to week

export interface LearnerState {
  /** What the blend reads: shared, and each bet type's own set pooled with shared. */
  weights: Weights;
  /** Each bet type's own learned set, before pooling. */
  own: Record<BetType, SeedSet>;
  /** Graded board lines so far, per bet type. */
  lines: Record<BetType, number>;
  /** Lines each seed has spoken on and been graded, per bet type. */
  spoken: Record<BetType, Record<SeedId, number>>;
}

export function startState(): LearnerState {
  return {
    weights: startWeights(),
    own: Object.fromEntries(BET_TYPES.map((b) => [b, evenSet()])) as Record<BetType, SeedSet>,
    lines: Object.fromEntries(BET_TYPES.map((b) => [b, 0])) as Record<BetType, number>,
    spoken: Object.fromEntries(BET_TYPES.map((b) => [b, Object.fromEntries(SEED_IDS.map((s) => [s, 0]))])) as LearnerState['spoken'],
  };
}

/** One Tuesday: reweight the shared set and each bet type's own set, count the lines, pool. */
export function learn(state: LearnerState, scores: WeekScores, rules: Rules): LearnerState {
  const shared = reweight(state.weights.shared, scores.shared, rules.maxStep);
  const own = {} as Record<BetType, SeedSet>;
  const lines = {} as Record<BetType, number>;
  const spoken = {} as LearnerState['spoken'];
  const byBetType = {} as Record<BetType, SeedSet>;
  for (const b of BET_TYPES) {
    own[b] = reweight(state.own[b], scores.byBetType[b], rules.maxStep);
    lines[b] = state.lines[b] + scores.graded[b];
    spoken[b] = Object.fromEntries(SEED_IDS.map((s) => [s, state.spoken[b][s] + scores.byBetType[b][s].lines])) as Record<SeedId, number>;
    byBetType[b] = pool(own[b], shared, lines[b], rules.poolingLines);
  }
  return { weights: { shared, byBetType }, own, lines, spoken };
}
