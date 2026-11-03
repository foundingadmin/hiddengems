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

/** A run time with its day word (Facet schedule rows): "Today 6:00 PM", "Tomorrow 4:17 AM", "Tue 12:00 AM",
 * or "Oct 31 11:00 PM" beyond a week either way. */
export function dayTime(d: Date, now = new Date()): string {
  const day = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(x);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(d);
  const days = Math.round((Date.parse(day(d)) - Date.parse(day(now))) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  if (days === -1) return `Yesterday ${time}`;
  if (Math.abs(days) < 7) return `${new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' }).format(d)} ${time}`;
  return `${new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric' }).format(d)} ${time}`;
}

/** A log timestamp to the second ("Nov 02 8:55:12 PM"), in the display zone. */
export function stamp(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', second: '2-digit' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day} ${p.hour}:${p.minute}:${p.second} ${p.dayPeriod}`;
}

/** A clock time to the second ("8:55:12 PM"), for the lines inside one run. */
export function seconds(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(d);
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
