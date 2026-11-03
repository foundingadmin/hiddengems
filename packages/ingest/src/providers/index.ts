// Picks providers from the environment. DATA_MODE=sample (the default without a key) uses the sample
// provider everywhere; DATA_MODE=live uses nflverse (free, no key) and The Odds API (ODDS_API_KEY).
// Vercel previews (staging and task branches) are always sample, whatever their env holds: they use the staging
// database, never spend odds credits and never write to the backup repository (docs/architecture.md, "Environments").
import { ours } from '../errors';
import { githubBackup, memoryBackup } from './backup';
import { oddsApi } from './odds-api';
import { sampleProviders } from './sample';
import { nflverse } from './nflverse';
import type { Providers } from './types';

export type DataMode = 'sample' | 'live';

export function dataMode(env: Record<string, string | undefined> = process.env): DataMode {
  if (env.VERCEL_ENV === 'preview') return 'sample';
  if (env.DATA_MODE === 'live' || env.DATA_MODE === 'sample') return env.DATA_MODE;
  return env.ODDS_API_KEY ? 'live' : 'sample';
}

export function providersFor(env: Record<string, string | undefined> = process.env): Providers {
  const offsite = env.VERCEL_ENV !== 'preview' && (env.BACKUP_GITHUB_REPO || env.BACKUP_GITHUB_TOKEN);
  const backup = offsite ? githubBackup(env.BACKUP_GITHUB_TOKEN, env.BACKUP_GITHUB_REPO) : null;
  if (dataMode(env) === 'sample') return { ...sampleProviders(), ...(backup ? { backup } : {}) };
  if (!env.ODDS_API_KEY) throw ours('config', 'Add ODDS_API_KEY to pull live odds, or set DATA_MODE=sample');
  const stats = nflverse();
  return { schedule: stats, rosters: stats, odds: oddsApi(env.ODDS_API_KEY), results: stats, usage: stats, backup: backup ?? githubBackup(undefined, undefined) };
}

export * from './types';
export { oddsApi, normalizeEventOdds } from './odds-api';
export { nflverse, normalizeGames, normalizeRoster, normalizeStats, normalizeInjuries, buildUsage, easternKickoff, NFLVERSE_URLS } from './nflverse';
export { sampleProviders, SAMPLE_PLAYERS } from './sample';
export { githubBackup, memoryBackup } from './backup';
export { anthropic, type AssistantProvider } from './anthropic';
