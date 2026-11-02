// Provider contracts. Adapters translate a provider's payloads into these shapes and nothing else:
// teams arrive as any name findTeam() resolves, and our ids are assigned by the jobs.
import type { BookId, MarketId, Side } from '@hiddengems/core';
import type { Http } from '../http';

export interface ProviderContext {
  now: Date;
  http: Http;
  log: (level: 'info' | 'warn', message: string, data?: Record<string, unknown>) => void;
}

export interface ScheduleGame {
  externalId: string;
  season: number;
  seasonType: 'pre' | 'reg' | 'post';
  week: number | null;
  kickoff: Date;
  awayTeam: string;
  homeTeam: string;
  neutralSite: boolean;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';
  awayScore: number | null;
  homeScore: number | null;
}

export interface RosterPlayer {
  externalId: string;
  name: string;
  position: string | null;
  team: string | null;
  jerseyNumber: number | null;
  status: string | null;
}

export interface OddsEvent {
  externalId: string;
  kickoff: Date;
  awayTeam: string;
  homeTeam: string;
}

export interface OddsQuote {
  bookId: BookId;
  marketId: MarketId;
  /** As the provider spells it; matched to players by nameKey(). Null for game markets. */
  playerName: string | null;
  side: Side;
  line: number | null;
  priceDecimal: number;
  observedAt: Date;
}

export interface StatLine {
  playerExternalId: string;
  gameExternalId: string;
  touchdowns: number;
  receptions: number | null;
  receivingYards: number | null;
  rushingYards: number | null;
  passingYards: number | null;
  passingTds: number | null;
  extra?: Record<string, unknown>;
}

/** What every adapter shares: its id, request headers (keys) and an optional quota reader. */
export interface ProviderBase {
  id: string;
  headers?: Record<string, string>;
  /** Reads quota headers, when the provider sends them. */
  usage?(res: Response): { used: number | null; remaining: number | null } | null;
}

export interface ScheduleProvider extends ProviderBase {
  schedule(ctx: ProviderContext, season: number): Promise<ScheduleGame[]>;
}
export interface RosterProvider extends ProviderBase {
  players(ctx: ProviderContext): Promise<RosterPlayer[]>;
}
export interface OddsProvider extends ProviderBase {
  events(ctx: ProviderContext): Promise<OddsEvent[]>;
  eventOdds(ctx: ProviderContext, event: OddsEvent, markets: readonly MarketId[]): Promise<OddsQuote[]>;
}
export interface ResultsProvider extends ProviderBase {
  /** Stat lines for one week of games. */
  stats(ctx: ProviderContext, season: number, week: number): Promise<StatLine[]>;
}

export interface Providers {
  schedule: ScheduleProvider;
  rosters: RosterProvider;
  odds: OddsProvider;
  results: ResultsProvider;
}
