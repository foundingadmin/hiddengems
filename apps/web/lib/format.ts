// Display formats from packages/facet/patterns/hidden-gems.md ("Number formats") and the Facet time rules.

export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const odds = (d: number) => d.toFixed(2);
export const points = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} pts`;

/** Clock time in the viewer's zone; the app defaults to Eastern until viewer zones are wired in. */
export const ZONE = process.env.DISPLAY_TIME_ZONE ?? 'America/New_York';

export function kickoff(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
}

export function clock(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}

/** Relative time with compact units ("Just now", "4m ago", "3h ago", "2d ago"); a date after a week. */
export function ago(d: Date, now = new Date()): string {
  const ms = now.getTime() - d.getTime();
  if (ms < 45_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return clock(d);
}

export function duration(ms: number | null): string {
  if (ms == null) return '–';
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`;
}
