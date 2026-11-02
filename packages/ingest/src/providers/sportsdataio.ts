// SportsDataIO NFL v3 (https://sportsdata.io/developers/api-documentation/nfl): schedule, rosters with
// jersey numbers, and player game stats for settling bets. Key goes in the Ocp-Apim-Subscription-Key header.
import { z } from 'zod';
import { ours } from '../errors';
import type { ResultsProvider, RosterProvider, ScheduleGame, ScheduleProvider, StatLine } from './types';

const BASE = 'https://api.sportsdata.io/v3/nfl';

const Game = z.object({
  GameKey: z.string(),
  Season: z.number(),
  SeasonType: z.number(),
  Week: z.number().nullable(),
  DateTimeUTC: z.string().nullish(),
  DateTime: z.string().nullish(),
  AwayTeam: z.string(),
  HomeTeam: z.string(),
  Status: z.string().nullish(),
  AwayScore: z.number().nullish(),
  HomeScore: z.number().nullish(),
  NeutralVenue: z.boolean().nullish(),
});
const Player = z.object({
  PlayerID: z.number(),
  Name: z.string(),
  Position: z.string().nullish(),
  Team: z.string().nullish(),
  Number: z.number().nullish(),
  Status: z.string().nullish(),
});
const Stat = z.object({
  PlayerID: z.number(),
  GameKey: z.string(),
  Receptions: z.number().nullish(),
  ReceivingYards: z.number().nullish(),
  ReceivingTouchdowns: z.number().nullish(),
  RushingYards: z.number().nullish(),
  RushingTouchdowns: z.number().nullish(),
  PassingYards: z.number().nullish(),
  PassingTouchdowns: z.number().nullish(),
  FumbleReturnTouchdowns: z.number().nullish(),
  PuntReturnTouchdowns: z.number().nullish(),
  KickReturnTouchdowns: z.number().nullish(),
  InterceptionReturnTouchdowns: z.number().nullish(),
});

function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const r = schema.safeParse(data);
  if (!r.success) throw ours('payload', `SportsDataIO ${what} no longer matches our adapter: ${r.error.issues[0]?.message ?? 'invalid'}`, { provider: 'sportsdataio' });
  return r.data;
}

/** SportsDataIO's DateTime is US Eastern wall time without an offset; converts it to a real instant. */
export function easternToUtc(local: string): Date {
  const asUtc = new Date(`${local.replace(/Z$/, '')}Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(asUtc).reduce<Record<string, string>>((a, p) => (a[p.type] = p.value, a), {});
  const shown = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!);
  return new Date(asUtc.getTime() + (asUtc.getTime() - shown));
}

const SEASON_TYPES = { 1: 'reg', 2: 'pre', 3: 'post' } as const;
function status(s: string | null | undefined): ScheduleGame['status'] {
  switch (s) {
    case 'InProgress': return 'in_progress';
    case 'Final': case 'F/OT': return 'final';
    case 'Postponed': case 'Suspended': return 'postponed';
    case 'Canceled': case 'Forfeit': return 'canceled';
    default: return 'scheduled';
  }
}

export function normalizeSchedule(payload: unknown): ScheduleGame[] {
  return parse(z.array(Game), payload, 'schedule')
    .filter((g) => g.AwayTeam !== 'BYE' && g.HomeTeam !== 'BYE' && (g.DateTimeUTC || g.DateTime))
    .map((g) => ({
      externalId: g.GameKey,
      season: g.Season,
      seasonType: SEASON_TYPES[g.SeasonType as 1 | 2 | 3] ?? 'reg',
      week: g.Week,
      kickoff: g.DateTimeUTC ? new Date(`${g.DateTimeUTC.replace(/Z$/, '')}Z`) : easternToUtc(g.DateTime!),
      awayTeam: g.AwayTeam,
      homeTeam: g.HomeTeam,
      neutralSite: g.NeutralVenue ?? false,
      status: status(g.Status),
      awayScore: g.AwayScore ?? null,
      homeScore: g.HomeScore ?? null,
    }));
}

export function normalizeStats(payload: unknown): StatLine[] {
  return parse(z.array(Stat), payload, 'player game stats').map((s) => ({
    playerExternalId: String(s.PlayerID),
    gameExternalId: s.GameKey,
    // Anytime TD counts scoring touchdowns, never thrown ones.
    touchdowns: (s.ReceivingTouchdowns ?? 0) + (s.RushingTouchdowns ?? 0) + (s.FumbleReturnTouchdowns ?? 0)
      + (s.PuntReturnTouchdowns ?? 0) + (s.KickReturnTouchdowns ?? 0) + (s.InterceptionReturnTouchdowns ?? 0),
    receptions: s.Receptions ?? null,
    receivingYards: s.ReceivingYards ?? null,
    rushingYards: s.RushingYards ?? null,
    passingYards: s.PassingYards ?? null,
    passingTds: s.PassingTouchdowns ?? null,
  }));
}

export function sportsDataIo(apiKey: string): ScheduleProvider & RosterProvider & ResultsProvider {
  return {
    id: 'sportsdataio',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    async schedule(ctx, season) {
      const [reg, post] = await Promise.all([
        ctx.http.getJson(`${BASE}/scores/json/Schedules/${season}REG`),
        ctx.http.getJson(`${BASE}/scores/json/Schedules/${season}POST`).catch(() => []),
      ]);
      return [...normalizeSchedule(reg), ...normalizeSchedule(post)];
    },
    async players(ctx) {
      return parse(z.array(Player), await ctx.http.getJson(`${BASE}/scores/json/Players`), 'players')
        .map((p) => ({
          externalId: String(p.PlayerID), name: p.Name, position: p.Position ?? null,
          team: p.Team ?? null, jerseyNumber: p.Number ?? null, status: p.Status ?? null,
        }));
    },
    async stats(ctx, season, week) {
      return normalizeStats(await ctx.http.getJson(`${BASE}/stats/json/PlayerGameStatsByWeek/${season}REG/${week}`));
    },
  };
}
