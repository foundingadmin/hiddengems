import type { Job } from '../runner';
import { pullOdds } from './odds';
import { buildPicks } from './picks';
import { pullResults } from './results';
import { pullRosters } from './rosters';
import { pullSchedule } from './schedule';

/** Every job, by name. Cron, the CLI and in-app "Pull now" buttons all run jobs from here. */
export const jobs: Record<string, Job> = Object.fromEntries(
  [pullSchedule, pullRosters, pullOdds, buildPicks, pullResults].map((j) => [j.name, j]),
);

/** The order to run everything in from an empty database. */
export const BOOTSTRAP = ['pull-schedule', 'pull-rosters', 'pull-odds', 'pull-results'] as const;

export { pullOdds, buildPicks, pullResults, pullRosters, pullSchedule };
export { marketsFromEnv, DEFAULT_MARKETS } from './odds';
export { grade } from './results';
