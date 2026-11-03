// Picks providers from the environment. DATA_MODE=sample (the default without a key) uses the sample
// provider everywhere; DATA_MODE=live uses nflverse (free, no key) and The Odds API (ODDS_API_KEY).
import { ours } from '../errors';
import { oddsApi } from './odds-api';
import { sampleProviders } from './sample';
import { nflverse } from './nflverse';
import type { Providers } from './types';

export type DataMode = 'sample' | 'live';

export function dataMode(env: Record<string, string | undefined> = process.env): DataMode {
  if (env.DATA_MODE === 'live' || env.DATA_MODE === 'sample') return env.DATA_MODE;
  return env.ODDS_API_KEY ? 'live' : 'sample';
}

export function providersFor(env: Record<string, string | undefined> = process.env): Providers {
  if (dataMode(env) === 'sample') return sampleProviders();
  if (!env.ODDS_API_KEY) throw ours('config', 'Add ODDS_API_KEY to pull live odds, or set DATA_MODE=sample');
  const stats = nflverse();
  return { schedule: stats, rosters: stats, odds: oddsApi(env.ODDS_API_KEY), results: stats, usage: stats };
}

export * from './types';
export { oddsApi, normalizeEventOdds } from './odds-api';
export { nflverse, normalizeGames, normalizeRoster, normalizeStats, normalizeInjuries, buildUsage, easternKickoff, NFLVERSE_URLS } from './nflverse';
export { sampleProviders, SAMPLE_PLAYERS } from './sample';
