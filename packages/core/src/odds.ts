// Odds math. Hidden Gems stores decimal odds; everything else converts at the edges.
// Formulas match packages/facet/patterns/hidden-gems.md ("Number formats").

/** Priced chance (implied probability, vig included) from decimal odds. */
export function impliedFromDecimal(decimal: number): number {
  if (!(decimal > 1)) throw new RangeError(`Decimal odds must be above 1, got ${decimal}`);
  return 1 / decimal;
}

export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || Math.abs(american) < 100) throw new RangeError(`American odds must be at least 100 in size, got ${american}`);
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

export function decimalToAmerican(decimal: number): number {
  impliedFromDecimal(decimal);
  return decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
}

/**
 * Removes the vig from a complete set of outcomes (both sides of an over/under, or every runner),
 * by normalizing implied chances to sum to 1. One-sided props (anytime TD "yes" only) cannot be de-vigged.
 */
export function removeVig(decimals: readonly number[]): number[] {
  const implied = decimals.map(impliedFromDecimal);
  const total = implied.reduce((a, b) => a + b, 0);
  return implied.map((p) => p / total);
}

/** The bookmaker's margin over a complete set of outcomes, as a fraction (0.05 = 5%). */
export function overround(decimals: readonly number[]): number {
  return decimals.map(impliedFromDecimal).reduce((a, b) => a + b, 0) - 1;
}
