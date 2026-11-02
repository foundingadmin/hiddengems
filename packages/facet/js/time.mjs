// Facet time: the one source of truth for relative times and durations (owner decisions, 2026-11-02).
//
// Values use compact units, no space, at most two units, largest first:
//   durations       4.1s, 30s, 1m 20s, 2h 5m
//   relative past   Just now, 4m ago, 3h ago, 2d ago      (a date after 7 days; formatAgo returns null)
//   relative future in 5m, in 6h, in 1d 6h, Due now
// Sentences spell units out instead ("every 5 minutes", "after 30 seconds"); these helpers are for values.
// Relative times render in sans (<time data-relative>); clock and calendar times render in mono.
//
//   import { formatDuration, formatAgo, formatUntil, stampTimes } from '@foundingcreative/facet/js/time.mjs';
//   stampTimes();   // fills every <time data-relative data-stamp datetime="..."> once, at load. Never animated.

const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;

function two(ms, units) {
  const parts = [];
  let rest = ms;
  for (const [size, label] of units) {
    const n = Math.floor(rest / size);
    if (n || parts.length) { if (n) parts.push(`${n}${label}`); rest -= n * size; }
    if (parts.length === 2) break;
  }
  return parts.join(' ');
}

export function formatDuration(ms) {
  if (!(ms >= 0)) return '';
  if (ms < 10 * S) return `${(ms / S).toFixed(1)}s`;
  if (ms < M) return `${Math.round(ms / S)}s`;
  return two(Math.round(ms / S) * S, [[D, 'd'], [H, 'h'], [M, 'm'], [S, 's']]);
}

export function formatAgo(ms) {
  if (!(ms >= 0)) return '';
  if (ms < 45 * S) return 'Just now';
  if (ms < H) return `${Math.max(1, Math.round(ms / M))}m ago`;
  if (ms < D) return `${Math.floor(ms / H)}h ago`;
  if (ms < 7 * D) return `${Math.floor(ms / D)}d ago`;
  return null; // older than a week: show the date instead
}

export function formatUntil(ms) {
  if (!(ms > 0)) return 'Due now';
  if (ms < M) return 'in under 1m';
  return 'in ' + two(Math.round(ms / M) * M, [[D, 'd'], [H, 'h'], [M, 'm']]);
}

// Relative to now: past reads "4m ago", future reads "in 5m".
export function formatRelative(date, now = Date.now()) {
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return t > now ? formatUntil(t - now) : formatAgo(now - t);
}

export function stampTimes(root = document, now = Date.now()) {
  root.querySelectorAll('time[data-relative][data-stamp][datetime]').forEach((el) => {
    const text = formatRelative(el.getAttribute('datetime'), now);
    if (text) el.textContent = text;
  });
}
