// How often odds are pulled. Vercel cron calls the odds job every 5 minutes; the job decides from the
// schedule whether a pull is due, so daylight saving, Thursday and Saturday games and international
// kickoffs need no cron changes, and quiet weeks spend no API quota.

const MIN = 60_000;
const HOUR = 60 * MIN;

export interface CadenceInput {
  now: Date;
  /** Kickoffs of games not yet final. */
  kickoffs: readonly Date[];
  /** When odds were last pulled successfully, if ever. */
  lastSuccessAt: Date | null;
}

/** Minutes between pulls: 5 within 6 hours of a kickoff or while games are on, hourly within 3 days, every 6 hours otherwise. */
export function oddsIntervalMinutes({ now, kickoffs }: Pick<CadenceInput, 'now' | 'kickoffs'>): number {
  const t = now.getTime();
  const inPlayWindow = 4 * HOUR;
  const soonest = kickoffs
    .map((k) => k.getTime() - t)
    .filter((d) => d > -inPlayWindow)
    .sort((a, b) => a - b)[0];
  if (soonest === undefined) return 6 * 60;
  if (soonest <= 6 * HOUR) return 5;
  if (soonest <= 72 * HOUR) return 60;
  return 6 * 60;
}

/** Whether an odds pull is due now. A 30 second grace absorbs cron jitter. */
export function isOddsPullDue(input: CadenceInput): boolean {
  if (!input.lastSuccessAt) return true;
  const elapsed = input.now.getTime() - input.lastSuccessAt.getTime();
  return elapsed >= oddsIntervalMinutes(input) * MIN - 30_000;
}
