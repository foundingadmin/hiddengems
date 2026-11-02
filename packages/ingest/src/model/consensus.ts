// consensus-v0: the placeholder hit chance until the Hidden Gems v3.0 model (docs/prd.md section 11,
// hgs.py in the old pipeline) is ported. It averages the fair chance behind the other books' prices
// (section 11.4's assumed cut taken out), so a gem here means DraftKings is longer than the market:
// line shopping, not a forecast.
import { fairChance } from '@hiddengems/core';

export const MODEL = 'consensus-v0';

export function estimate(otherPrices: readonly number[]): number | null {
  if (!otherPrices.length) return null;
  return otherPrices.reduce((sum, p) => sum + fairChance(p), 0) / otherPrices.length;
}

/** Population standard deviation, for how much the books agree. */
export function spread(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}
