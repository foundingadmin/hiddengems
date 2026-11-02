// consensus-v0: the placeholder model, so the pipeline runs end to end before the real one exists.
// It estimates a selection from the other books' prices: the average fair chance where both sides of
// an over/under are listed (vig removed), otherwise their average priced chance (vig included).
// A positive gap therefore means "this book is longer than the market", which is line shopping, not
// a forecast. The real model (Phase 3) replaces estimate() and fills the other signals.
import { removeVig, impliedFromDecimal } from '@hiddengems/core';

export const MODEL = 'consensus-v0';

export interface BookPrice {
  bookId: string;
  price: number;
  /** The same book's price on the other side of an over/under, when listed. */
  opposite?: number;
}

export function estimate(others: readonly BookPrice[]): { probability: number; devigged: boolean } | null {
  if (!others.length) return null;
  const devig = others.every((b) => b.opposite != null);
  const probs = others.map((b) => (devig ? removeVig([b.price, b.opposite!])[0]! : impliedFromDecimal(b.price)));
  return { probability: probs.reduce((a, b) => a + b, 0) / probs.length, devigged: devig };
}
