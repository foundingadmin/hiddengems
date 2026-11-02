// When odds are pulled (docs/build-brief.md, "Free data only"). The Odds API free plan has 500 credits a
// month and charges about 1 per game per pull, so prices are pulled only on the snapshot schedule:
// the opening line, Saturday 7:47 PM, Sunday 8:43 AM (Denver), and a freeze just before each kickoff.
// Cron may call the odds job as often as it likes; these functions decide whether a pull is due.

export const SNAPSHOT_ZONE = 'America/Denver';

/** Weekly snapshots in Denver time. weekday: 0 is Sunday. horizonDays: how far ahead games are pulled. */
export const SNAPSHOTS = [
  { id: 'open', weekday: 2, time: '10:07', horizonDays: 7 },
  { id: 'sat', weekday: 6, time: '19:47', horizonDays: 4 },
  { id: 'sun', weekday: 0, time: '08:43', horizonDays: 4 },
] as const;

/** A snapshot runs if cron reaches it within this long; later it is skipped, never pulled late. */
export const SNAPSHOT_GRACE_MINUTES = 90;
/** Each game's freeze pull happens within this many minutes before its kickoff. */
export const FREEZE_LEAD_MINUTES = 20;

const parts = (d: Date, zone: string) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' })
    .formatToParts(d).map((p) => [p.type, p.value]),
) as Record<string, string>;

/** A wall-clock date and time in a time zone ("2026-11-07", "19:47") as a real instant. */
export function zonedTimeToUtc(date: string, time: string, zone: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const p = parts(guess, zone);
  const shown = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return new Date(guess.getTime() + (guess.getTime() - shown));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DueSnapshot {
  /** Stable id for this occurrence ("sat:2026-11-07"), recorded once pulled. */
  slot: string;
  at: Date;
  horizonDays: number;
}

/** The weekly snapshot due now, if any: its time has passed within the grace window and it was not taken. */
export function dueSnapshot(now: Date, taken: ReadonlySet<string>): DueSnapshot | null {
  const p = parts(now, SNAPSHOT_ZONE);
  const today = `${p.year}-${p.month}-${p.day}`;
  const weekday = WEEKDAYS.indexOf(p.weekday!);
  for (const s of SNAPSHOTS) {
    const back = (weekday - s.weekday + 7) % 7;
    let date = new Date(`${today}T12:00:00Z`);
    date = new Date(date.getTime() - back * 86_400_000);
    let at = zonedTimeToUtc(date.toISOString().slice(0, 10), s.time, SNAPSHOT_ZONE);
    if (at > now) {
      date = new Date(date.getTime() - 7 * 86_400_000);
      at = zonedTimeToUtc(date.toISOString().slice(0, 10), s.time, SNAPSHOT_ZONE);
    }
    const slot = `${s.id}:${date.toISOString().slice(0, 10)}`;
    if (now.getTime() - at.getTime() <= SNAPSHOT_GRACE_MINUTES * 60_000 && !taken.has(slot)) {
      return { slot, at, horizonDays: s.horizonDays };
    }
  }
  return null;
}

/** Games whose freeze pull is due: kickoff within FREEZE_LEAD_MINUTES, not yet frozen. Slot: "freeze:<gameId>". */
export function dueFreezes<G extends { id: string; kickoff: Date }>(now: Date, games: readonly G[], taken: ReadonlySet<string>): G[] {
  const t = now.getTime();
  return games.filter((g) => {
    const until = g.kickoff.getTime() - t;
    return until > 0 && until <= FREEZE_LEAD_MINUTES * 60_000 && !taken.has(`freeze:${g.id}`);
  });
}
