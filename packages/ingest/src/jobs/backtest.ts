// backtest: the weekly calibration check (docs/prd.md goal 2). Scores model v3.0 walk forward over every
// completed week of the season from Week 4 (core walkForward()): each player game's chance from the weeks
// before it, against whether he scored. Reads player_usage, player_game_stats and games; writes nothing but
// its run: the score in the message, one log line per week, and a warning when it is above the baseline. Sample
// players score far more often than real ones, so on sample data the score stands alone, with no baseline check.
import { BACKTEST, type GameLine, type UsageGame, seasonOf, walkForward } from '@hiddengems/core';
import { games, playerGameStats, playerUsage } from '@hiddengems/db';
import { and, eq } from 'drizzle-orm';
import type { Job } from '../runner';

const DONE = new Set(['postponed', 'canceled']);
const brier = (n: number) => n.toFixed(4);
const playerGames = (n: number) => `${n.toLocaleString('en-US')} player game${n === 1 ? '' : 's'}`;
const weekSpan = (weeks: number[]) => (weeks.length === 1 ? `Week ${weeks[0]}` : `Weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`);

export const backtest: Job = {
  name: 'backtest',
  async run(ctx) {
    const { db, now } = ctx;
    const season = seasonOf(now);
    const schedule = (await db.select().from(games).where(and(eq(games.season, season), eq(games.seasonType, 'reg'))))
      .filter((g) => g.week !== null);
    // A week is complete once every game in it has kicked off; only final games' player games are scored.
    const weeks = new Map<number, boolean>();
    for (const g of schedule) {
      if (DONE.has(g.status)) continue;
      weeks.set(g.week!, (weeks.get(g.week!) ?? true) && g.kickoffAt <= now);
    }
    const complete = [...weeks].filter(([, done]) => done).map(([w]) => w);
    const lines: GameLine[] = schedule.map((g) => ({
      gameId: g.id, week: g.week!, homeTeam: g.homeTeamId, awayTeam: g.awayTeamId, spreadLine: g.spreadLine, totalLine: g.totalLine,
    }));

    const usage = await db.select({ u: playerUsage }).from(playerUsage).innerJoin(games, eq(games.id, playerUsage.gameId))
      .where(and(eq(playerUsage.season, season), eq(games.status, 'final')));
    const logs: UsageGame[] = usage.map(({ u }) => ({
      playerId: u.playerId, gameId: u.gameId, week: u.week, team: u.teamId, position: u.position, snapPct: u.snapPct,
      rzCarries: u.rzCarries, rzTargets: u.rzTargets, rzCarryTds: u.rzCarryTds, rzTargetTds: u.rzTargetTds, touchdowns: u.touchdowns,
    }));
    // Whether he scored comes from his stat line; play by play's count stands in until results land.
    const stats = await db.select({ gameId: playerGameStats.gameId, playerId: playerGameStats.playerId, touchdowns: playerGameStats.touchdowns })
      .from(playerGameStats).innerJoin(games, eq(games.id, playerGameStats.gameId)).where(eq(games.season, season));
    const tds = new Map(stats.map((s) => [`${s.gameId}|${s.playerId}`, s.touchdowns]));

    const result = walkForward({ logs, lines, weeks: complete, scored: (g) => (tds.get(`${g.gameId}|${g.playerId}`) ?? g.touchdowns) > 0 });
    const baseline = brier(result.baseline);
    if (result.brier === null) {
      return { message: `Nothing to score yet: no completed week from Week ${BACKTEST.firstWeek} has earlier games to read`, rowsWritten: 0, meta: { ...result } };
    }
    for (const w of result.weeks) {
      ctx.log('info', `Week ${w.week}: Brier ${brier(w.brier)} over ${playerGames(w.games)}`, { week: w.week, games: w.games, brier: w.brier });
    }
    const score = brier(result.brier);
    const span = weekSpan(result.weeks.map((w) => w.week));
    if (ctx.providers.usage.id === 'sample') {
      return { message: `Brier ${score} over ${playerGames(result.games)} in ${span} on sample data`, rowsWritten: 0, meta: { ...result } };
    }
    // Above the baseline, the warning carries the gap, so Data health says it once (its note) instead of twice.
    if (result.aboveBaseline) ctx.log('warn', `Brier is ${brier(result.delta!)} above the ${baseline} baseline`, { brier: result.brier, baseline: result.baseline, delta: result.delta });
    const versus = result.aboveBaseline ? '' : `, ${score === baseline ? 'at' : 'under'} the ${baseline} baseline`;
    return {
      message: `Brier ${score} over ${playerGames(result.games)} in ${span}${versus}`,
      rowsWritten: 0,
      meta: { ...result },
    };
  },
};
