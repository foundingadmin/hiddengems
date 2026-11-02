// nflverse (https://github.com/nflverse/nflverse-data), free and public: schedules, 2026 rosters with jersey
// numbers, and weekly player stats for grading and the model (docs/prd.md section 10). No key needed.
// Files are CSV release assets; ids are nflverse's: game_id ("2026_09_CIN_ATL") and gsis player ids.
import { seasonOf } from '@hiddengems/core';
import { parseCsv } from '../csv';
import { ours } from '../errors';
import type { ProviderContext, ResultsProvider, RosterProvider, ScheduleGame, ScheduleProvider, StatLine } from './types';

const BASE = 'https://github.com/nflverse/nflverse-data/releases/download';
export const NFLVERSE_URLS = {
  games: `${BASE}/schedules/games.csv`,
  roster: (season: number) => `${BASE}/rosters/roster_${season}.csv`,
  stats: (season: number) => `${BASE}/stats_player/stats_player_week_${season}.csv`,
};

function need(rows: Record<string, string>[], cols: string[], what: string) {
  const missing = rows.length ? cols.filter((c) => !(c in rows[0]!)) : [];
  if (missing.length) throw ours('payload', `nflverse ${what} no longer has ${missing.join(', ')}`, { provider: 'nflverse' });
}
const num = (v: string | undefined) => (v === undefined || v === '' || v === 'NA' ? null : Number(v));

/** nflverse kickoff times are US Eastern wall time ("2026-11-08", "13:00"). */
export function easternKickoff(day: string, time: string): Date {
  const guess = new Date(`${day}T${time || '13:00'}:00Z`);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(guess).map((x) => [x.type, x.value]));
  const shown = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!);
  return new Date(guess.getTime() + (guess.getTime() - shown));
}

const SEASON_TYPES: Record<string, ScheduleGame['seasonType']> = { REG: 'reg', PRE: 'pre', WC: 'post', DIV: 'post', CON: 'post', SB: 'post' };

export function normalizeGames(text: string, season: number, now: Date): ScheduleGame[] {
  const rows = parseCsv(text);
  need(rows, ['game_id', 'season', 'game_type', 'week', 'gameday', 'gametime', 'away_team', 'home_team', 'away_score', 'home_score', 'location'], 'schedule');
  return rows.filter((g) => Number(g.season) === season).map((g) => {
    const kickoff = easternKickoff(g.gameday!, g.gametime!);
    const away = num(g.away_score), home = num(g.home_score);
    const final = away !== null && home !== null;
    const started = now.getTime() >= kickoff.getTime();
    return {
      externalId: g.game_id!, season, seasonType: SEASON_TYPES[g.game_type!] ?? 'reg', week: num(g.week), kickoff,
      awayTeam: g.away_team!, homeTeam: g.home_team!, neutralSite: g.location === 'Neutral',
      status: final ? 'final' : started ? 'in_progress' : 'scheduled', awayScore: away, homeScore: home,
    };
  });
}

export function normalizeRoster(text: string) {
  const rows = parseCsv(text);
  need(rows, ['gsis_id', 'full_name', 'position', 'team', 'jersey_number', 'status'], 'roster');
  return rows.filter((p) => p.gsis_id).map((p) => ({
    externalId: p.gsis_id!, name: p.full_name!, position: p.position || null, team: p.team || null,
    jerseyNumber: num(p.jersey_number), status: p.status || null,
  }));
}

/** Anytime TD counts touchdowns a player scores: rushing, receiving, returns and recoveries, never thrown ones. */
export function normalizeStats(text: string, week?: number): StatLine[] {
  const rows = parseCsv(text);
  need(rows, ['player_id', 'game_id', 'week', 'rushing_tds', 'receiving_tds', 'special_teams_tds', 'fumble_recovery_tds', 'receptions', 'receiving_yards', 'rushing_yards', 'passing_yards', 'passing_tds'], 'player stats');
  return rows.filter((s) => week === undefined || Number(s.week) === week).map((s) => ({
    playerExternalId: s.player_id!,
    gameExternalId: s.game_id!,
    touchdowns: (num(s.rushing_tds) ?? 0) + (num(s.receiving_tds) ?? 0) + (num(s.special_teams_tds) ?? 0) + (num(s.fumble_recovery_tds) ?? 0),
    receptions: num(s.receptions), receivingYards: num(s.receiving_yards), rushingYards: num(s.rushing_yards),
    passingYards: num(s.passing_yards), passingTds: num(s.passing_tds),
    extra: { targets: num(s.targets), carries: num(s.carries), targetShare: num(s.target_share) },
  }));
}

export function nflverse(): ScheduleProvider & RosterProvider & ResultsProvider {
  // The weekly stats file covers the whole season; one download serves every week a run grades.
  const statsText = new Map<number, Promise<string>>();
  return {
    id: 'nflverse',
    async schedule(ctx: ProviderContext, season: number) {
      return normalizeGames(await ctx.http.getText(NFLVERSE_URLS.games), season, ctx.now);
    },
    async players(ctx: ProviderContext) {
      return normalizeRoster(await ctx.http.getText(NFLVERSE_URLS.roster(seasonOf(ctx.now))));
    },
    async stats(ctx: ProviderContext, season: number, week: number) {
      if (!statsText.has(season)) statsText.set(season, ctx.http.getText(NFLVERSE_URLS.stats(season)));
      return normalizeStats(await statsText.get(season)!, week);
    },
  };
}
