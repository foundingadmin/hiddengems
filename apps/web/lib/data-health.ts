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
  { job: 'pull-weather', label: 'Weather', live: 'Open-Meteo' },
  { job: 'build-picks', label: 'Ratings', live: 'Model v3.0' },
  { job: 'backup', label: 'Backup', live: 'GitHub, private' },
] as const;
export const LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.job, s.label]));
export const PROVIDER_NAMES: Record<string, string> = { 'odds-api': 'The Odds API', nflverse: 'nflverse', sample: 'Sample', 'github-backup': 'GitHub', memory: 'Local', 'open-meteo': 'Open-Meteo' };

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, ...o });
export const timeOfDay = (d: Date) => fmt({ hour: 'numeric', minute: '2-digit' }).format(d);
export const weekdayTime = (d: Date) => fmt({ weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);

/** The job's daily cron time in vercel.json (UTC), or null when it is not a daily job. */
function dailyCron(job: string): { h: number; m: number } | null {
  const cron = vercel.crons.find((c) => c.path === `/api/cron/${job}`)?.schedule.split(' ');
  if (!cron || cron[2] !== '*' || !/^\d+$/.test(cron[0]!) || !/^\d+$/.test(cron[1]!)) return null;
  return { h: Number(cron[1]), m: Number(cron[0]) };
}
export const isDaily = (job: string) => dailyCron(job) != null;

/** Plain-language schedule: "Daily at 4:17 AM", "Weekly and at kickoff", "After odds or usage", "After odds". */
export function scheduleText(job: string, now: Date): string {
  if (job === 'pull-odds') return 'Weekly and at kickoff';
  if (job === 'build-picks') return 'After odds or usage';
  if (job === 'pull-weather') return 'After odds';
  const c = dailyCron(job);
  if (!c) return 'Daily';
  const at = new Date(now);
  at.setUTCHours(c.h, c.m, 0, 0);
  return `Daily at ${timeOfDay(at)}`;
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
  const c = dailyCron(job);
  if (!c) return null;
  const at = new Date(now);
  at.setUTCHours(c.h, c.m, 0, 0);
  if (at <= now) at.setTime(at.getTime() + DAY);
  return at;
}

/** "in 40m", "in 15h", "in 2d". */
export function until(at: Date, now: Date): string {
  const ms = at.getTime() - now.getTime();
  if (ms < 3_600_000) return `in ${Math.max(1, Math.round(ms / 60_000))}m`;
  if (ms < 2 * DAY) return `in ${Math.round(ms / 3_600_000)}h`;
  return `in ${Math.round(ms / DAY)}d`;
}
