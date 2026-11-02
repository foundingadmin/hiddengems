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
