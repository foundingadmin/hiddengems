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

/**
 * The markets each pull carries. Every stat ladder costs one more credit per game, so on the free plan they ride
 * the Sunday morning pull only (about 45 credits a week on a full slate, beside about 60 for anytime TD), and a
 * manual pull the owner confirms. Kickoff freezes stay anytime TD only.
 */
export const LADDER_SNAPSHOTS: readonly string[] = ['sun'];
export const TD_MARKETS = ['anytime_td'] as const;
export const LADDER_MARKETS = ['receptions', 'receiving_yds', 'rushing_yds'] as const;
export function marketsFor(pull: { snapshot: string | null; manual: boolean }): string[] {
  return pull.manual || (pull.snapshot && LADDER_SNAPSHOTS.includes(pull.snapshot)) ? [...TD_MARKETS, ...LADDER_MARKETS] : [...TD_MARKETS];
}

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

export interface TakenSlot {
  slot: string;
  pulledAt: Date;
}

/**
 * The decision point for a game: the last weekly snapshot (open, sat, sun) pulled before its kickoff and
 * within a week of it. That is Sunday 8:43 AM for Sunday and Monday games, and the latest snapshot before
 * it for earlier games (Tuesday's opening line for Thursday, Saturday night for a late Saturday game).
 * Null when no weekly snapshot was taken (manual pulls only).
 */
export function decisionSnapshot<S extends TakenSlot>(kickoff: Date, slots: readonly S[]): S | null {
  const from = kickoff.getTime() - 7 * 86_400_000;
  let best: S | null = null;
  for (const s of slots) {
    if (s.slot.startsWith('freeze:')) continue;
    const t = s.pulledAt.getTime();
    if (t >= kickoff.getTime() || t <= from) continue;
    if (!best || t > best.pulledAt.getTime()) best = s;
  }
  return best;
}

/**
 * One selection's price as of a moment, from its snapshot history: the last price pulled at or before
 * `at`, or, when the book had not listed it yet, the first price seen after.
 */
export function priceAsOf<P extends { pulledAt: Date; observedAt: Date }>(history: readonly P[], at: Date): P | null {
  const t = at.getTime();
  let before: P | null = null, after: P | null = null;
  const later = (a: P, b: P) => a.pulledAt.getTime() - b.pulledAt.getTime() || a.observedAt.getTime() - b.observedAt.getTime();
  for (const p of history) {
    if (p.pulledAt.getTime() <= t) { if (!before || later(p, before) > 0) before = p; }
    else if (!after || later(p, after) < 0) after = p;
  }
  return before ?? after;
}
