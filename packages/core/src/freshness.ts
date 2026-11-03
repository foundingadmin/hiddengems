// Freshness (packages/facet/DESIGN.md rule 11): a pulled value under 6 hours old reads live, older reads stale,
// and nothing pulled yet reads queued. One rule for the footer, the price chart, the weather row and the notes.

export const FRESH_MS = 6 * 3_600_000;

export type FreshnessState = 'live' | 'stale' | 'queued';

export function freshnessState(at: Date | string | null | undefined, now: Date | string): FreshnessState {
  if (at == null) return 'queued';
  const age = new Date(now).getTime() - new Date(at).getTime();
  return Number.isNaN(age) ? 'queued' : age < FRESH_MS ? 'live' : 'stale';
}
