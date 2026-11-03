// Graded history (docs/prd.md F1.1, F1.2): the results line over every graded gem, each placed slip's outcome and
// the season record of placed slips. Pure: Slips, History reads these and never re-derives them.
import type { GradeBox } from './grades';
import { type SlipPlay, slipPayout } from './slips';

export const GRADE_BOXES: readonly GradeBox[] = ['earned', 'unlucky', 'lucky', 'wrong-read'];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The plain mean of closing line values; null when there are none. */
export function averageClv(clvs: readonly number[]): number | null {
  return clvs.length ? clvs.reduce((a, c) => a + c, 0) / clvs.length : null;
}

export interface GradedTake {
  clv: number;
  box: GradeBox;
}

export interface ResultsLine {
  graded: number;
  averageClv: number | null;
  boxes: Record<GradeBox, number>;
}

/** The results line (F1.1): how many gems are graded, their average CLV and how many landed in each box. */
export function resultsLine(grades: readonly GradedTake[]): ResultsLine {
  const boxes = Object.fromEntries(GRADE_BOXES.map((b) => [b, 0])) as Record<GradeBox, number>;
  for (const g of grades) boxes[g.box]++;
  return { graded: grades.length, averageClv: averageClv(grades.map((g) => g.clv)), boxes };
}

export interface SlipLegOutcome {
  /** The price the leg was placed at. */
  price: number;
  /** The bet's status: open, won, lost, push or void. A push or void leg drops out of the parlay. */
  status: string;
  /** Its CLV once graded, else null. */
  clv: number | null;
}

/**
 * earned   every live leg scored, so the slip paid
 * missed   a leg did not score, so the stake is gone
 * pending  a leg is still open
 * void     every leg was voided or pushed, so the stake came back
 */
export type SlipResultKind = 'earned' | 'missed' | 'pending' | 'void';

export interface SlipOutcome {
  result: SlipResultKind;
  /** What the book paid back, stake included; null while pending. */
  returned: number | null;
  /** Returned less the stake, to the cent; null while pending. */
  profit: number | null;
  legs: number;
  scored: number;
  /** Legs with a grade, and their average CLV (null before any is graded). */
  graded: number;
  clv: number | null;
}

/** One placed slip, every leg on one stake: it pays only if every live leg scores (core slipPayout()). */
export function slipOutcome(stake: number, legs: readonly SlipLegOutcome[]): SlipOutcome {
  const clvs = legs.flatMap((l) => (l.clv == null ? [] : [l.clv]));
  const live = legs.filter((l) => l.status !== 'push' && l.status !== 'void');
  let result: SlipResultKind;
  let returned: number | null;
  if (legs.some((l) => l.status === 'lost')) [result, returned] = ['missed', 0];
  else if (!legs.length || legs.some((l) => l.status !== 'won' && l.status !== 'push' && l.status !== 'void')) [result, returned] = ['pending', null];
  else if (!live.length) [result, returned] = ['void', stake];
  else [result, returned] = ['earned', slipPayout(stake, live.map((l) => l.price))];
  return {
    result, returned, profit: returned == null ? null : round2(returned - stake),
    legs: legs.length, scored: legs.filter((l) => l.status === 'won').length, graded: clvs.length, clv: averageClv(clvs),
  };
}

export interface PlacedSlipRecord {
  week: number;
  play: SlipPlay;
  stake: number;
  outcome: SlipOutcome;
  /** Each leg's grade, null until graded. */
  legs: readonly ({ clv: number; box: GradeBox } | null)[];
}

export interface SeasonRecord {
  /** Graded legs across placed slips, their average CLV and the weeks they span. */
  legs: number;
  averageClv: number | null;
  weeks: { first: number; last: number } | null;
  /** Settled slips: what was staked and the profit, overall and by play (null when none of that play settled). */
  settled: number;
  staked: number;
  profit: number;
  suggested: number | null;
  own: number | null;
  /** Graded legs that lost to the close and missed. */
  wrongReads: number;
}

/** The season so far for placed slips. Pending slips count toward nothing until they settle. */
export function seasonRecord(slips: readonly PlacedSlipRecord[]): SeasonRecord {
  const graded = slips.flatMap((s) => s.legs.flatMap((l) => (l ? [{ ...l, week: s.week }] : [])));
  const weeks = graded.map((l) => l.week);
  const settled = slips.filter((s) => s.outcome.profit != null);
  const sum = (xs: readonly PlacedSlipRecord[]) => (xs.length ? round2(xs.reduce((a, s) => a + s.outcome.profit!, 0)) : null);
  return {
    legs: graded.length,
    averageClv: averageClv(graded.map((l) => l.clv)),
    weeks: weeks.length ? { first: Math.min(...weeks), last: Math.max(...weeks) } : null,
    settled: settled.length,
    staked: round2(settled.reduce((a, s) => a + s.stake, 0)),
    profit: sum(settled) ?? 0,
    suggested: sum(settled.filter((s) => s.play === 'suggested')),
    own: sum(settled.filter((s) => s.play === 'own')),
    wrongReads: graded.filter((l) => l.box === 'wrong-read').length,
  };
}
