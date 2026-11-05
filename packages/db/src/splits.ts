// A player's conditional splits for one game (core splitsFor(), docs/prd.md F2.2), read from what the jobs already
// store: his games (player_game_stats, player_usage), his teams' usage, the schedule and the roster. Null when the
// game or player is unknown, his team is not in the game, or he has no games this season before it.
import { type SplitPlayed, type SplitScheduleGame, type Splits, type UsageGame, splitsFor } from '@hiddengems/core';
import { and, eq, inArray, lt } from 'drizzle-orm';
import type { Db } from './client';
import { games, playerGameStats, playerUsage, players } from './schema';

export interface SplitPerson {
  name: string;
  position: string | null;
  teamId: string | null;
  jerseyNumber: number | null;
}

export interface PlayerSplits extends Splits {
  gameId: string;
  teamId: string;
  /** The people the conditions name (the usual starter, the key teammates), by player id. */
  people: Record<string, SplitPerson>;
}

export async function getSplits(db: Db, playerId: string, gameId: string): Promise<PlayerSplits | null> {
  const [[game], [player]] = await Promise.all([
    db.select().from(games).where(eq(games.id, gameId)),
    db.select().from(players).where(eq(players.id, playerId)),
  ]);
  if (!game || !player || game.week == null) return null;
  const team = player.teamId;
  if (!team || (team !== game.homeTeamId && team !== game.awayTeamId)) return null;

  const season = await db.select().from(games).where(and(eq(games.season, game.season), eq(games.seasonType, 'reg')));
  const schedule: SplitScheduleGame[] = season.filter((g) => g.week != null).map((g) => ({
    gameId: g.id, week: g.week!, homeTeam: g.homeTeamId, awayTeam: g.awayTeamId, spreadLine: g.spreadLine, totalLine: g.totalLine,
    kickoff: g.kickoffAt, neutralSite: g.neutralSite,
  }));
  const current = schedule.find((g) => g.gameId === gameId);
  if (!current) return null;
  const before = new Map(season.filter((g) => g.week != null && g.week < game.week!).map((g) => [g.id, g]));
  const ids = [...before.keys()];
  if (!ids.length) return null;

  // His games: the stat line's touchdowns when it is in, else play by play's; his team from usage.
  const [own, stats] = await Promise.all([
    db.select().from(playerUsage).where(and(eq(playerUsage.playerId, playerId), inArray(playerUsage.gameId, ids))),
    db.select({ gameId: playerGameStats.gameId, touchdowns: playerGameStats.touchdowns }).from(playerGameStats)
      .where(and(eq(playerGameStats.playerId, playerId), inArray(playerGameStats.gameId, ids))),
  ]);
  const usageBy = new Map(own.map((u) => [u.gameId, u]));
  const statsBy = new Map(stats.map((s) => [s.gameId, s.touchdowns]));
  const played: SplitPlayed[] = [...new Set([...usageBy.keys(), ...statsBy.keys()])].map((id) => {
    const g = before.get(id)!;
    const side = usageBy.get(id)?.teamId ?? (team === g.homeTeamId || team === g.awayTeamId ? team : null);
    return { gameId: id, team: side, touchdowns: statsBy.get(id) ?? usageBy.get(id)?.touchdowns ?? 0 };
  });
  if (!played.length) return null;

  const teams = [...new Set([team, ...played.map((p) => p.team).filter((t): t is string => !!t)])];
  const teamRows = await db.select().from(playerUsage)
    .where(and(eq(playerUsage.season, game.season), lt(playerUsage.week, game.week), inArray(playerUsage.teamId, teams)));
  const usage: UsageGame[] = teamRows.map((u) => ({
    playerId: u.playerId, gameId: u.gameId, week: u.week, team: u.teamId, position: u.position, snapPct: u.snapPct,
    rzCarries: u.rzCarries, rzTargets: u.rzTargets, rzCarryTds: u.rzCarryTds, rzTargetTds: u.rzTargetTds, touchdowns: u.touchdowns,
  }));
  const qbs = [...new Set(usage.filter((u) => u.position === 'QB').map((u) => u.playerId))];
  const [passing, roster] = await Promise.all([
    qbs.length ? db.select({ gameId: playerGameStats.gameId, playerId: playerGameStats.playerId, passingYards: playerGameStats.passingYards })
      .from(playerGameStats).where(and(inArray(playerGameStats.playerId, qbs), inArray(playerGameStats.gameId, ids))) : [],
    db.select().from(players).where(eq(players.teamId, team)),
  ]);

  const splits = splitsFor({
    playerId, team, schedule, played, usage, passing,
    game: current,
    roster: roster.map((r) => ({ playerId: r.id, teamId: r.teamId, status: r.status, injuryStatus: r.injuryStatus })),
  });
  if (!splits) return null;
  const named = [...new Set(splits.splits.flatMap((s) => s.players))];
  const people: Record<string, SplitPerson> = {};
  if (named.length) {
    for (const p of await db.select().from(players).where(inArray(players.id, named))) {
      people[p.id] = { name: p.name, position: p.position, teamId: p.teamId, jerseyNumber: p.jerseyNumber };
    }
  }
  return { ...splits, gameId, teamId: team, people };
}
