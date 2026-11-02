// Picks: the gap between our estimate and the priced chance, the gem tier it earns, and the verdict
// the six signals add up to. Encodings live in packages/facet/patterns/hidden-gems.md.

export type GemTier = 'rough' | 'cut' | 'polished' | 'flawless';
export type SignalState = 'go' | 'wait' | 'stop' | 'none';
export type Verdict = SignalState;

/** Signal order is fixed: it is the order of the dots in the slate's signal strip. */
export const SIGNALS = ['setup', 'trackRecord', 'sample', 'priceGap', 'matchup', 'market'] as const;
export type SignalId = (typeof SIGNALS)[number];
export type Signals = Record<SignalId, SignalState>;

export const UNCHECKED: Signals = { setup: 'none', trackRecord: 'none', sample: 'none', priceGap: 'none', matchup: 'none', market: 'none' };

/** Gap in percentage points (our estimate minus the priced chance), rounded to whole points as displayed. */
export function gapPoints(estimate: number, priced: number): number {
  return Math.round((estimate - priced) * 100);
}

/** Tier thresholds in points. Same ladder as the specimen (tierOf in packages/facet/preview/specimen.js). */
export const TIER_THRESHOLDS = { flawless: 12, polished: 9, cut: 6 } as const;

/** The tier a gap earns. Gaps under 1 point earn none: they are not gems. */
export function tierOf(gap: number): GemTier | null {
  if (gap >= TIER_THRESHOLDS.flawless) return 'flawless';
  if (gap >= TIER_THRESHOLDS.polished) return 'polished';
  if (gap >= TIER_THRESHOLDS.cut) return 'cut';
  if (gap >= 1) return 'rough';
  return null;
}

/**
 * The verdict from the six signals (rule v0, to confirm with the owner):
 * - setup unchecked: Unchecked, because nothing else matters until the setup is known
 * - setup stop, or two or more stops: Stop
 * - four or more go and no stop: Go
 * - otherwise: Wait
 * Matches every pick in the specimen's slate.
 */
export function verdictOf(signals: Signals): Verdict {
  const states = SIGNALS.map((s) => signals[s]);
  const count = (state: SignalState) => states.filter((s) => s === state).length;
  if (signals.setup === 'none') return 'none';
  if (signals.setup === 'stop' || count('stop') >= 2) return 'stop';
  if (count('go') >= 4 && count('stop') === 0) return 'go';
  return 'wait';
}

/** Screen-reader summary for the signal strip ("5 go, 1 wait"). */
export function signalSummary(signals: Signals): string {
  const order: SignalState[] = ['go', 'wait', 'stop', 'none'];
  const words: Record<SignalState, string> = { go: 'go', wait: 'wait', stop: 'stop', none: 'unchecked' };
  return order
    .map((state) => [state, SIGNALS.filter((s) => signals[s] === state).length] as const)
    .filter(([, n]) => n > 0)
    .map(([state, n]) => `${n} ${words[state]}`)
    .join(', ');
}
