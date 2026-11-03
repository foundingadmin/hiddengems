// Appraisal over time (docs/prd.md F2.7): the purchase book's price for one selection from its first snapshot to
// kickoff, set against our fair price. Snapshots are written only when the book changes its price, each stamped
// with when the book changed it, so the price holds from one point to the next.
import { impliedFromDecimal } from './odds';

export interface PricePoint {
  at: Date;
  price: number;
}

/** One selection's snapshots at one book, oldest first, one point per change, none from kickoff on. */
export function priceTrail(snapshots: readonly { priceDecimal: number; observedAt: Date }[], kickoff: Date): PricePoint[] {
  const sorted = snapshots.filter((s) => s.observedAt.getTime() < kickoff.getTime())
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const out: PricePoint[] = [];
  for (const s of sorted) if (out.at(-1)?.price !== s.priceDecimal) out.push({ at: s.observedAt, price: s.priceDecimal });
  return out;
}

/** The decimal price at which a chance breaks even: our fair price, from our hit chance. */
export function fairPriceFor(chance: number): number {
  if (!(chance > 0 && chance <= 1)) throw new Error(`Chance must be in (0, 1], got ${chance}`);
  return 1 / chance;
}

/** Whether a posted price beats our fair price: the gap to the posted price is above zero (core appraise()). */
export function clearsFair(price: number, chance: number): boolean {
  return chance - impliedFromDecimal(price) > 0;
}
