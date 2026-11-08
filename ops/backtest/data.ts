// Loads nflverse 2026 and the cached historical odds, and cuts both down to what was knowable at a week's board.
// Every input carries the moment it became knowable; capsule() refuses any input from on or after the board.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { type GameLine, type UsageGame, findTeam, gameId, nameKey, zonedTimeToUtc } from '../../packages/core/src/index';
import { parseCsv } from '../../packages/ingest/src/csv';
import { buildUsage, normalizeGames, normalizeStats } from '../../packages/ingest/src/providers/nflverse';
import { normalizeEventOdds } from '../../packages/ingest/src/providers/odds-api';
import type { OddsQuote } from '../../packages/ingest/src/providers/types';
import { NFLVERSE_DIR, ODDS_DIR } from './paths';

const read = (f: string) => readFileSync(`${NFLVERSE_DIR}/${f}`, 'utf8');
const teamId = (abbr: string) => {
  const t = findTeam(abbr);
  if (!t) throw new Error(`Unknown team ${abbr}`);
  return t.id;
};

export interface Box { touchdowns: number; receptions: number | null; receivingYards: number | null; rushingYards: number | null }
export interface SeasonGame { gameId: string; nflverseId: string; week: number; kickoff: Date; home: string; away: string }
export interface Injury { status: string | null; practice: string | null; injury: string | null }
export interface RosterRow { team: string; names: string[] }

export interface Season {
  games: SeasonGame[];
  lines: GameLine[];
  usage: UsageGame[];
  box: Map<string, Box>;
  /** Week, then gsis id. */
  injuries: Map<number, Map<string, Injury>>;
  rosters: Map<number, Map<string, RosterRow>>;
}

const v = (s: string | undefined) => (s && s !== 'NA' ? s : null);

export function loadSeason(): Season {
  const sched = normalizeGames(read('games.csv'), 2026, new Date()).filter((g) => g.seasonType === 'reg' && g.week !== null);
  const games: SeasonGame[] = sched.map((g) => {
    const away = teamId(g.awayTeam), home = teamId(g.homeTeam);
    return { gameId: gameId(g.kickoff, away, home), nflverseId: g.externalId, week: g.week!, kickoff: g.kickoff, home, away };
  });
  const byNfl = new Map(games.map((g) => [g.nflverseId, g]));
  const lines: GameLine[] = sched.map((g, i) => ({
    gameId: games[i]!.gameId, week: g.week!, homeTeam: games[i]!.home, awayTeam: games[i]!.away, spreadLine: g.spreadLine ?? null, totalLine: g.totalLine ?? null,
  }));

  const pbp = gunzipSync(readFileSync(`${NFLVERSE_DIR}/play_by_play_2026.csv.gz`)).toString('utf8');
  const { lines: usageLines } = buildUsage(pbp, read('snap_counts_2026.csv'), read('roster_2026.csv'));
  const usage: UsageGame[] = usageLines.flatMap((u) => {
    const g = byNfl.get(u.gameExternalId);
    if (!g) return [];
    return [{ playerId: u.playerExternalId, gameId: g.gameId, week: u.week, team: teamId(u.team), position: u.position, snapPct: u.snapPct,
      rzCarries: u.rzCarries, rzTargets: u.rzTargets, rzCarryTds: u.rzCarryTds, rzTargetTds: u.rzTargetTds, touchdowns: u.touchdowns }];
  });

  const box = new Map<string, Box>();
  for (const s of normalizeStats(read('stats_player_week_2026.csv'))) {
    const g = byNfl.get(s.gameExternalId);
    if (g) box.set(`${g.gameId}:${s.playerExternalId}`, { touchdowns: s.touchdowns, receptions: s.receptions, receivingYards: s.receivingYards, rushingYards: s.rushingYards });
  }

  const injuries = new Map<number, Map<string, Injury>>();
  for (const r of parseCsv(read('injuries_2026.csv'))) {
    if (r.game_type !== 'REG' || !r.gsis_id) continue;
    const wk = Number(r.week);
    const m = injuries.get(wk) ?? new Map<string, Injury>();
    m.set(r.gsis_id, { status: v(r.report_status), practice: v(r.practice_status), injury: v(r.report_primary_injury) ?? v(r.practice_primary_injury) });
    injuries.set(wk, m);
  }

  const rosters = new Map<number, Map<string, RosterRow>>();
  for (const r of parseCsv(read('roster_weekly_2026.csv'))) {
    if (r.game_type !== 'REG' || !r.gsis_id || !r.team) continue;
    const wk = Number(r.week);
    const m = rosters.get(wk) ?? new Map<string, RosterRow>();
    const names = [r.full_name, r.football_name && r.last_name ? `${r.football_name} ${r.last_name}` : null].filter((n): n is string => Boolean(n));
    m.set(r.gsis_id, { team: teamId(r.team), names });
    rosters.set(wk, m);
  }
  return { games, lines, usage, box, injuries, rosters };
}

/** When a week's official injury report was final: Friday 4 PM Eastern before its Sunday games. */
export function injuryReportAt(sunday: string): Date {
  const d = new Date(`${sunday}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2);
  return zonedTimeToUtc(d.toISOString().slice(0, 10), '16:00', 'America/New_York');
}

/** When a week's roster was set: Wednesday 4 PM Eastern before its Sunday games. */
export function rosterAt(sunday: string): Date {
  const d = new Date(`${sunday}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 4);
  return zonedTimeToUtc(d.toISOString().slice(0, 10), '16:00', 'America/New_York');
}

export interface Stamp { source: string; at: Date }

/** The guard. Any input stamped on or after the board fails the whole run. */
export function capsule(boardAt: Date, stamps: Iterable<Stamp>): number {
  let n = 0;
  for (const s of stamps) {
    n++;
    if (!(s.at.getTime() < boardAt.getTime())) throw new Error(`Time capsule broken: ${s.source} is stamped ${s.at.toISOString()}, not before the board at ${boardAt.toISOString()}`);
  }
  return n;
}

export interface Snapshot { eventId: string; gameId: string; timestamp: Date; quotes: OddsQuote[] }

/** One kind of cached snapshot for a week (board or close), keyed by our game id. */
export function loadOdds(week: number, kind: 'board' | 'close'): Map<string, Snapshot> {
  const dir = `${ODDS_DIR}/wk${week}/${kind}`;
  const out = new Map<string, Snapshot>();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const body = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const e = body.data;
    const id = gameId(new Date(e.commence_time), teamId(e.away_team), teamId(e.home_team));
    out.set(id, { eventId: e.id, gameId: id, timestamp: new Date(body.timestamp), quotes: normalizeEventOdds(e) });
  }
  return out;
}

/** Matches a book's player name to a gsis id among the two teams' rosters that week. */
export function nameMatcher(roster: Map<string, RosterRow>, teams: string[]): (name: string | null) => string | null {
  const by = new Map<string, string | null>();
  for (const [id, r] of roster) {
    if (!teams.includes(r.team)) continue;
    for (const n of r.names) {
      const k = nameKey(n);
      by.set(k, by.has(k) && by.get(k) !== id ? null : id);
    }
  }
  return (name) => (name ? by.get(nameKey(name)) ?? null : null);
}
