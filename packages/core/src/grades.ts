// Grading (docs/prd.md F1.1 and F1.2). Every gem record and every placed bet is graded once its game is
// final: closing line value against the fair price at the kickoff freeze, and one of four boxes.
import { fairChance } from './gems';
import { impliedFromDecimal } from './odds';

/** The fair price at the close as decimal odds: the posted price with the assumed cut taken out. */
export function fairDecimal(price: number): number {
  return 1 / fairChance(price);
}

/** clv = taken_decimal / close_fair_decimal - 1. Above zero beats the close. */
export function closingLineValue(takenDecimal: number, closeFairDecimal: number): number {
  impliedFromDecimal(takenDecimal);
  impliedFromDecimal(closeFairDecimal);
  return takenDecimal / closeFairDecimal - 1;
}

/**
 * earned      beat the close, hit
 * unlucky     beat the close, missed
 * lucky       lost to the close, hit
 * wrong-read  lost to the close, missed
 */
export type GradeBox = 'earned' | 'unlucky' | 'lucky' | 'wrong-read';

export const GRADE_BOX_LABELS: Record<GradeBox, string> = { earned: 'Earned', unlucky: 'Unlucky', lucky: 'Lucky', 'wrong-read': 'Wrong read' };

export function gradeBox(beatClose: boolean, hit: boolean): GradeBox {
  if (beatClose) return hit ? 'earned' : 'unlucky';
  return hit ? 'lucky' : 'wrong-read';
}

export interface Grade {
  clv: number;
  /** CLV above zero. A price that only matches the close did not beat it. */
  beatClose: boolean;
  box: GradeBox;
}

/** Grades one take: the price taken (decision price for a gem, the bet's price for a bet) against the close. */
export function gradeTake({ taken, closePrice, hit }: { taken: number; closePrice: number; hit: boolean }): Grade {
  const clv = closingLineValue(taken, fairDecimal(closePrice));
  const beatClose = clv > 0;
  return { clv, beatClose, box: gradeBox(beatClose, hit) };
}

/** Anytime TD hits when the player scored at least once. */
export const anytimeTdHit = (touchdowns: number): boolean => touchdowns > 0;
