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
  /** Closing lines from the schedule, for implied team points. Above zero means the home team is favored. */
  spreadLine?: number | null;
  totalLine?: number | null;
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
  /** The book's slip link for this pick, when sent. It only adds the pick; it never places a bet. */
  link: string | null;
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

/** One player's usage in one game (core UsageGame, with the provider's ids). */
export interface UsageLine {
  playerExternalId: string;
  gameExternalId: string;
  week: number;
  team: string;
  position: string;
  snapPct: number | null;
  rzCarries: number;
  rzTargets: number;
  rzCarryTds: number;
  rzTargetTds: number;
  touchdowns: number;
}

/** The latest injury report: its week and each listed player's game status (Out, Doubtful, Questionable). */
export interface InjuryReport {
  week: number;
  statuses: { playerExternalId: string; status: string }[];
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

export interface UsageProvider extends ProviderBase {
  /** Every skill player's usage in every game of the season so far. */
  gameUsage(ctx: ProviderContext, season: number): Promise<UsageLine[]>;
  injuries(ctx: ProviderContext, season: number): Promise<InjuryReport | null>;
}

/** Off-site storage for nightly database backups. */
export interface BackupTarget extends ProviderBase {
  /** Where backups land, for the run log ("owner/name"). */
  where: string;
  put(ctx: ProviderContext, path: string, bytes: Uint8Array, message: string): Promise<void>;
}

export interface Providers {
  schedule: ScheduleProvider;
  rosters: RosterProvider;
  odds: OddsProvider;
  results: ResultsProvider;
  usage: UsageProvider;
  backup: BackupTarget;
}
