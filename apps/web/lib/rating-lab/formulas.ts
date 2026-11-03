// The rating lab's formula comparison (docs/prd.md section 8): five candidate ratings on the 126 Week 9
// opening props, logged Nov 2 2026 with one book posted. The two kept formulas run through core's live
// rules; the three dropped ones stay here only as the record of what was compared.
import { gemRating, recommendedScore } from '@hiddengems/core';
import week9 from './week9-opening.json';

export interface LabProp {
  player: string;
  position: string;
  game: string;
  kickoff: string;
  /** Decimal odds at the one book posted. */
  price: number;
  /** The posted price's implied chance, whole percent. */
  pricedPct: number;
  /** Our hit chance, whole percent. */
  hitPct: number;
  /** Carat as logged: our chance minus the fair chance, in points. */
  carat: number;
  clarity: number;
  /** The old scorecard's carat: edge times odds times clarity. */
  scorecard: number;
}

export const WEEK9: readonly LabProp[] = week9;

/** Clears the posted price: our chance beats its implied chance. */
export const clears = (p: LabProp) => p.hitPct > p.pricedPct;

const unit = (n: number) => Math.min(1, Math.max(0, n));

export interface Formula {
  id: string;
  name: string;
  /** What the owner decided on Nov 2 2026. */
  status: 'Live rating' | 'Live order' | 'Dropped';
  plain: string;
  code: string;
  rewards: string;
  costs: string;
  verdict: string;
  /** Null when the formula gives the prop no score. */
  score: (p: LabProp) => number | null;
}

export const FORMULAS: readonly Formula[] = [
  {
    id: 'scorecard', name: 'Old scorecard', status: 'Dropped',
    plain: 'Edge times the odds times clarity, the carat number on the old pipeline scorecard.',
    code: 'score = carat × odds × clarity factor',
    rewards: 'Big payouts. The odds multiply the edge, so a small edge on a 20.0 long shot outranks a solid edge at 3.0.',
    costs: 'The top fills with players you would rarely bet, and most of them miss even when the read is right.',
    verdict: 'Ranks payout, not confidence that the gem is real.',
    score: (p) => p.scorecard,
  },
  {
    id: 'blend', name: 'Added blend', status: 'Dropped',
    plain: '60% edge plus 40% clarity, added. Props that miss the posted price are capped at 40.',
    code: 'score = 100 × (0.6 × clamp(carat / 10) + 0.4 × clarity / 100); if not clears: score = min(score, 40)',
    rewards: 'Shorter odds and well known players with lots of games behind the read.',
    costs: 'A prop with no edge but a clean sample still scores 30 to 40, so most of its top 10 miss the posted price.',
    verdict: 'Adding clarity lets props with no edge float up.',
    score: (p) => {
      const v = 100 * (0.6 * unit(p.carat / 10) + 0.4 * p.clarity / 100);
      return clears(p) ? v : Math.min(v, 40);
    },
  },
  {
    id: 'rating', name: 'Edge × clarity', status: 'Live rating',
    plain: 'Carat and clarity multiplied, so a gem needs both. Only props that clear the posted price are rated.',
    code: 'if not clears: no rating; rating = round(100 × clamp(carat / 10, 0, 1) × clarity / 100)',
    rewards: 'Props where the model disagrees with the price and the read is solid.',
    costs: 'Ignores the odds, so a 6.0 and a 20.0 with the same edge rate the same.',
    verdict: 'Every top 10 pick clears the price. The number on the gem.',
    score: (p) => (clears(p) ? gemRating(p.carat, p.clarity) : null),
  },
  {
    id: 'return', name: 'Expected return', status: 'Dropped',
    plain: 'What a $1 bet returns on average if our hit chance is right.',
    code: 'score = 100 × clamp((hit chance × odds − 1) / 0.4)',
    rewards: 'Long shots. Expected return grows with the payout.',
    costs: 'The math holds only over hundreds of bets, and each Sunday is judged on its own.',
    verdict: 'Long run math for a week by week bettor.',
    score: (p) => 100 * unit((p.hitPct / 100 * p.price - 1) / 0.4),
  },
  {
    id: 'order', name: 'Gate, then safest', status: 'Live order',
    plain: 'Only props that clear the posted price qualify, ranked by hit chance times clarity, so the likeliest real gem leads.',
    code: 'if not clears: no score; score = hit chance × clarity / 100',
    rewards: 'The shortest odds that still have a real edge.',
    costs: 'Some weeks the gate leaves few gems and none at your usual odds, so the board has to say so.',
    verdict: 'The order of the Gems board, paired with edge × clarity for the number.',
    score: (p) => {
      const s = recommendedScore({ kind: clears(p) ? 'gem' : 'none', hitChance: p.hitPct / 100, clarity: p.clarity });
      return s === null ? null : s * 100;
    },
  },
];

/** The ten highest scores, highest first; props the formula gives no score are left out. */
export function topTen(f: Formula, props: readonly LabProp[]): { prop: LabProp; score: number }[] {
  return props
    .map((prop) => ({ prop, score: f.score(prop) }))
    .filter((x): x is { prop: LabProp; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
