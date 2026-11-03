import type { Job } from '../runner';
import { pullOdds } from './odds';
import { buildPicks } from './picks';
import { pullResults } from './results';
import { pullRosters } from './rosters';
import { pullSchedule } from './schedule';
import { pullUsage } from './usage';
import { backupDatabase } from './backup';

/** Every job, by name. Cron, the CLI and in-app "Pull now" buttons all run jobs from here. */
export const jobs: Record<string, Job> = Object.fromEntries(
  [pullSchedule, pullRosters, pullOdds, buildPicks, pullResults, pullUsage, backupDatabase].map((j) => [j.name, j]),
);

/** The order to run everything in from an empty database: stats before odds, so props can be rated. */
export const BOOTSTRAP = ['pull-schedule', 'pull-rosters', 'pull-results', 'pull-usage', 'pull-odds'] as const;

export { pullOdds, buildPicks, pullResults, pullRosters, pullSchedule, pullUsage, backupDatabase };
export { MARKETS } from './odds';
export { grade } from './results';
