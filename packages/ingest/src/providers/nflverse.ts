// nflverse (https://github.com/nflverse/nflverse-data), free and public: schedules, 2026 rosters with jersey
// numbers, and weekly player stats for grading and the model (docs/prd.md section 10). No key needed.
// Files are CSV release assets; ids are nflverse's: game_id ("2026_09_CIN_ATL") and gsis player ids.
import { gunzipSync } from 'node:zlib';
import { nameKey, seasonOf } from '@hiddengems/core';
import { parseCsv, readCsvColumns } from '../csv';
import { ours } from '../errors';
import type {
  InjuryReport, ProviderContext, ResultsProvider, RosterProvider, ScheduleGame, ScheduleProvider, StatLine, UsageLine, UsageProvider,
} from './types';

export const NFLVERSE_BASE = 'https://github.com/nflverse/nflverse-data/releases/download';
const BASE = NFLVERSE_BASE;
export const NFLVERSE_URLS = {
  games: `${BASE}/schedules/games.csv`,
  roster: (season: number) => `${BASE}/rosters/roster_${season}.csv`,
  stats: (season: number) => `${BASE}/stats_player/stats_player_week_${season}.csv`,
  pbp: (season: number) => `${BASE}/pbp/play_by_play_${season}.csv.gz`,
  snaps: (season: number) => `${BASE}/snap_counts/snap_counts_${season}.csv`,
  injuries: (season: number) => `${BASE}/injuries/injuries_${season}.csv`,
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
    const spread = num(g.spread_line), total = num(g.total_line);
    const kickoff = easternKickoff(g.gameday!, g.gametime!);
    const away = num(g.away_score), home = num(g.home_score);
    const final = away !== null && home !== null;
    const started = now.getTime() >= kickoff.getTime();
    return {
      externalId: g.game_id!, season, seasonType: SEASON_TYPES[g.game_type!] ?? 'reg', week: num(g.week), kickoff,
      awayTeam: g.away_team!, homeTeam: g.home_team!, neutralSite: g.location === 'Neutral',
      status: final ? 'final' : started ? 'in_progress' : 'scheduled', awayScore: away, homeScore: home,
      spreadLine: spread, totalLine: total,
    };
  });
}

export function normalizeRoster(text: string) {
  const rows = parseCsv(text);
  need(rows, ['gsis_id', 'full_name', 'position', 'team', 'jersey_number', 'status'], 'roster');
  // The season file can list a player twice (a mid-season move); the later row wins.
  const byId = new Map(rows.filter((p) => p.gsis_id).map((p) => [p.gsis_id!, p]));
  return [...byId.values()].map((p) => ({
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

const SKILL = new Set(['QB', 'RB', 'WR', 'TE', 'FB']);
const PBP_COLUMNS = ['game_id', 'week', 'posteam', 'yardline_100', 'play_type', 'rusher_player_id', 'passer_player_id', 'receiver_player_id', 'td_player_id', 'touchdown'] as const;

/**
 * One row per skill player per game, as hgs.py's game_logs() builds them: everyone with an offensive
 * snap, and for games whose snap counts have not landed yet (they run a few days behind), anyone who ran,
 * caught or threw. Red zone means inside the opponent's 10.
 */
export function buildUsage(pbpText: string, snapsText: string, rosterText: string): { lines: UsageLine[]; unmatchedSnaps: string[] } {
  const pbp = readCsvColumns(pbpText, PBP_COLUMNS);
  if (pbp.missing.length) throw ours('payload', `nflverse play by play no longer has ${pbp.missing.join(', ')}`, { provider: 'nflverse' });
  const snaps = parseCsv(snapsText);
  need(snaps, ['game_id', 'week', 'player', 'pfr_player_id', 'position', 'team', 'offense_snaps', 'offense_pct'], 'snap counts');
  const roster = parseCsv(rosterText);
  need(roster, ['gsis_id', 'pfr_id', 'position', 'full_name', 'team'], 'roster');
  const gsisByPfr = new Map<string, string>();
  const gsisByName = new Map<string, string>();
  const positionOf = new Map<string, string>();
  for (const r of roster) {
    if (r.pfr_id && r.gsis_id && !gsisByPfr.has(r.pfr_id)) gsisByPfr.set(r.pfr_id, r.gsis_id);
    if (r.gsis_id && r.full_name) gsisByName.set(`${nameKey(r.full_name)}|${r.team}`, r.gsis_id);
    if (r.gsis_id && !positionOf.has(r.gsis_id)) positionOf.set(r.gsis_id, r.position ?? '');
  }

  const out = new Map<string, UsageLine>();
  const key = (game: string, player: string) => `${game}|${player}`;
  const unmatched = new Set<string>();
  const snapGames = new Set<string>();
  for (const s of snaps) {
    if (!(Number(s.offense_snaps) > 0) || !SKILL.has(s.position!)) continue;
    // Some roster rows lack a pfr id; fall back to name and team.
    const gsis = gsisByPfr.get(s.pfr_player_id!) ?? gsisByName.get(`${nameKey(s.player ?? '')}|${s.team}`);
    if (!gsis) { unmatched.add(s.pfr_player_id!); continue; }
    snapGames.add(s.game_id!);
    const k = key(s.game_id!, gsis);
    if (out.has(k)) continue;
    out.set(k, {
      playerExternalId: gsis, gameExternalId: s.game_id!, week: Number(s.week), team: s.team!, position: s.position!, snapPct: num(s.offense_pct),
      rzCarries: 0, rzTargets: 0, rzCarryTds: 0, rzTargetTds: 0, touchdowns: 0,
    });
  }
  // Games without snap counts yet: anyone who ran, caught or threw, with the roster's position.
  const [G, W, POS, YL, TYPE, RUSH, PASS, RECV, TDP, TD] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  for (const p of pbp.rows) {
    if (snapGames.has(p[G]!) || !p[POS]) continue;
    for (const id of [p[RUSH], p[RECV], p[PASS]]) {
      if (!id || id === 'NA') continue;
      const position = positionOf.get(id);
      if (!position || !SKILL.has(position)) continue;
      const k = key(p[G]!, id);
      if (!out.has(k)) out.set(k, { playerExternalId: id, gameExternalId: p[G]!, week: Number(p[W]), team: p[POS]!, position, snapPct: null, rzCarries: 0, rzTargets: 0, rzCarryTds: 0, rzTargetTds: 0, touchdowns: 0 });
    }
  }
  const bump = (game: string, id: string | undefined, f: 'rzCarries' | 'rzTargets' | 'rzCarryTds' | 'rzTargetTds' | 'touchdowns') => {
    if (!id || id === 'NA') return;
    const u = out.get(key(game, id));
    if (u) u[f]++;
  };
  for (const p of pbp.rows) {
    const g = p[G]!, td = p[TD] === '1', scorer = p[TDP];
    if (td) bump(g, scorer, 'touchdowns');
    const yl = num(p[YL]);
    if (yl === null || yl > 10) continue;
    if (p[TYPE] === 'run') { bump(g, p[RUSH], 'rzCarries'); if (td && scorer === p[RUSH]) bump(g, scorer, 'rzCarryTds'); }
    if (p[TYPE] === 'pass') { bump(g, p[RECV], 'rzTargets'); if (td && scorer === p[RECV]) bump(g, scorer, 'rzTargetTds'); }
  }
  return { lines: [...out.values()], unmatchedSnaps: [...unmatched] };
}

/** The latest week's injury report: everyone on it, with game status (Out, Doubtful, Questionable), last practice and injury. */
export function normalizeInjuries(text: string): InjuryReport | null {
  const rows = parseCsv(text);
  need(rows, ['week', 'gsis_id', 'report_status'], 'injuries');
  const week = Math.max(...rows.map((r) => Number(r.week)).filter(Number.isFinite));
  if (!Number.isFinite(week)) return null;
  const value = (v: string | undefined) => (v && v !== 'NA' ? v : null);
  const statuses = rows.filter((r) => Number(r.week) === week && r.gsis_id)
    .map((r) => ({
      playerExternalId: r.gsis_id!,
      status: value(r.report_status),
      practice: value(r.practice_status),
      injury: value(r.report_primary_injury) ?? value(r.practice_primary_injury),
    }))
    .filter((s) => s.status || s.practice);
  return { week, statuses };
}

export function nflverse(): ScheduleProvider & RosterProvider & ResultsProvider & UsageProvider {
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
    async gameUsage(ctx: ProviderContext, season: number) {
      const [gz, snaps, roster] = await Promise.all([
        ctx.http.getBytes(NFLVERSE_URLS.pbp(season)), ctx.http.getText(NFLVERSE_URLS.snaps(season)), ctx.http.getText(NFLVERSE_URLS.roster(season)),
      ]);
      let pbp: string;
      try { pbp = gunzipSync(gz).toString('utf8'); } catch { throw ours('payload', 'nflverse play by play did not unzip', { provider: 'nflverse' }); }
      const { lines, unmatchedSnaps } = buildUsage(pbp, snaps, roster);
      if (unmatchedSnaps.length) ctx.log('warn', `${unmatchedSnaps.length} snap count players are not on the roster`, { pfrIds: unmatchedSnaps.slice(0, 25) });
      return lines;
    },
    async injuries(ctx: ProviderContext, season: number) {
      return normalizeInjuries(await ctx.http.getText(NFLVERSE_URLS.injuries(season)));
    },
  };
}
