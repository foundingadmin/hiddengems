// Shared by the Data health, Usage and Logs pages: the sources, their schedules (from vercel.json and the
// odds snapshot rules in core) and when each is due next.
import { FREEZE_LEAD_MINUTES, SNAPSHOT_ZONE, SNAPSHOTS, zonedTimeToUtc } from '@hiddengems/core';
import vercel from '@/vercel.json';
import { ZONE } from './format';

export const DAY = 86_400_000;
/** A daily source is overdue when its last run is older than this (a day, plus slack for a slow cron). */
export const OVERDUE_MS = 26 * 3_600_000;

export const SOURCES = [
  { job: 'pull-odds', label: 'Odds', live: 'The Odds API' },
  { job: 'pull-schedule', label: 'Schedule', live: 'nflverse' },
  { job: 'pull-rosters', label: 'Rosters', live: 'nflverse' },
  { job: 'pull-results', label: 'Results', live: 'nflverse' },
  { job: 'pull-usage', label: 'Usage and injuries', live: 'nflverse' },
  { job: 'build-picks', label: 'Ratings', live: 'Model v3.0' },
  { job: 'backup', label: 'Backup', live: 'GitHub, private' },
  { job: 'backtest', label: 'Backtest', live: 'Model v3.0' },
] as const;
/** Sources that call no provider: they run on our own data, so Usage leaves them out and sample mode keeps their name. */
export const NO_PROVIDER: ReadonlySet<string> = new Set(['build-picks', 'backtest']);
export const LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.job, s.label]));
export const PROVIDER_NAMES: Record<string, string> = { 'odds-api': 'The Odds API', nflverse: 'nflverse', sample: 'Sample', 'github-backup': 'GitHub', memory: 'Local' };

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, ...o });
export const timeOfDay = (d: Date) => fmt({ hour: 'numeric', minute: '2-digit' }).format(d);
export const weekdayTime = (d: Date) => fmt({ weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);

/** The job's cron time in vercel.json (UTC): daily, or weekly on one weekday (0 is Sunday). Null for anything else. */
function fixedCron(job: string): { h: number; m: number; weekday: number | null } | null {
  const cron = vercel.crons.find((c) => c.path === `/api/cron/${job}`)?.schedule.split(' ');
  if (!cron || cron[2] !== '*' || cron[3] !== '*' || !/^\d+$/.test(cron[0]!) || !/^\d+$/.test(cron[1]!)) return null;
  if (cron[4] !== '*' && !/^[0-6]$/.test(cron[4]!)) return null;
  return { h: Number(cron[1]), m: Number(cron[0]), weekday: cron[4] === '*' ? null : Number(cron[4]) };
}
const dailyCron = (job: string) => { const c = fixedCron(job); return c && c.weekday === null ? c : null; };
export const isDaily = (job: string) => dailyCron(job) != null;
export const isWeekly = (job: string) => fixedCron(job)?.weekday != null;
/** How long after its last run a daily or weekly source counts as overdue, with the same slack; null for the rest. */
export const overdueAfter = (job: string) => (isDaily(job) ? OVERDUE_MS : isWeekly(job) ? OVERDUE_MS + 6 * DAY : null);

/** Plain-language schedule: "Daily at 4:17 AM", "Tuesdays at 5:37 AM", "Weekly and at kickoff", "After odds or usage". */
export function scheduleText(job: string, now: Date): string {
  if (job === 'pull-odds') return 'Weekly and at kickoff';
  if (job === 'build-picks') return 'After odds or usage';
  const c = fixedCron(job);
  if (!c) return 'Daily';
  const at = nextCron(job, now)!;
  return c.weekday === null ? `Daily at ${timeOfDay(at)}` : `${fmt({ weekday: 'long' }).format(at)}s at ${timeOfDay(at)}`;
}

const dateIn = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: SNAPSHOT_ZONE }).format(d);
const dayIn = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: SNAPSHOT_ZONE, weekday: 'short' }).format(d);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SNAPSHOT_NAMES: Record<string, string> = { open: 'Opening line', sat: 'Saturday night lines', sun: 'Sunday morning lines' };

function nextSnapshot(s: (typeof SNAPSHOTS)[number], now: Date): Date | null {
  for (let i = 0; i <= 7; i++) {
    const day = new Date(now.getTime() + i * DAY);
    if (dayIn(day) !== WEEKDAYS[s.weekday]) continue;
    const at = zonedTimeToUtc(dateIn(day), s.time, SNAPSHOT_ZONE);
    if (at > now) return at;
  }
  return null;
}

/** The weekly odds snapshot times, in the display zone, for the tip on the odds schedule. */
export function snapshotTimes(now: Date): string {
  const times = SNAPSHOTS.map((s) => nextSnapshot(s, now)).filter((d): d is Date => d != null).map(weekdayTime);
  return `${times.join(', ')}, and ${FREEZE_LEAD_MINUTES} minutes before each kickoff`;
}

/** The next scheduled odds pull: a weekly snapshot or a game's kickoff freeze, whichever comes first. */
export function nextOddsPull(now: Date, kickoffs: Date[]): { at: Date; what: string } | null {
  const options: { at: Date; what: string }[] = [];
  for (const s of SNAPSHOTS) {
    const at = nextSnapshot(s, now);
    if (at) options.push({ at, what: SNAPSHOT_NAMES[s.id] ?? s.id });
  }
  for (const k of kickoffs) {
    const at = new Date(k.getTime() - FREEZE_LEAD_MINUTES * 60_000);
    if (at > now) options.push({ at, what: 'Kickoff freeze' });
  }
  return options.sort((a, b) => a.at.getTime() - b.at.getTime())[0] ?? null;
}

/** When a daily job runs next. */
export function nextDaily(job: string, now: Date): Date | null {
  return dailyCron(job) ? nextCron(job, now) : null;
}

/** When a daily or weekly cron job runs next. */
export function nextCron(job: string, now: Date): Date | null {
  const c = fixedCron(job);
  if (!c) return null;
  const at = new Date(now);
  at.setUTCHours(c.h, c.m, 0, 0);
  if (c.weekday !== null) at.setTime(at.getTime() + ((c.weekday - at.getUTCDay() + 7) % 7) * DAY);
  if (at <= now) at.setTime(at.getTime() + (c.weekday !== null ? 7 : 1) * DAY);
  return at;
}

/** "in 40m", "in 15h", "in 2d". */
export function until(at: Date, now: Date): string {
  const ms = at.getTime() - now.getTime();
  if (ms < 3_600_000) return `in ${Math.max(1, Math.round(ms / 60_000))}m`;
  if (ms < 2 * DAY) return `in ${Math.round(ms / 3_600_000)}h`;
  return `in ${Math.round(ms / DAY)}d`;
}
