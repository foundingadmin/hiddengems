// pull-results: stat lines for recently finished games, then settles open bets and records the
// closing price (the last price before kickoff) for beating-the-close tracking.
import { bets, games, oddsSnapshots, playerGameStats } from '@hiddengems/db';
import { and, desc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { Job } from '../runner';
import { chunks, plural, refMap } from './shared';

type StatRow = typeof playerGameStats.$inferSelect;
const STAT_FOR_MARKET: Record<string, keyof StatRow> = {
  receptions: 'receptions', receiving_yards: 'receivingYards', rushing_yards: 'rushingYards', passing_yards: 'passingYards', passing_tds: 'passingTds',
};

/** won, lost or push for a settled stat line, or null when this market cannot be settled from totals. */
export function grade(bet: { marketId: string; side: string; line: number | null }, stat: StatRow): 'won' | 'lost' | 'push' | null {
  if (bet.marketId === 'anytime_td') return stat.touchdowns > 0 ? 'won' : 'lost';
  const field = STAT_FOR_MARKET[bet.marketId];
  if (!field || bet.line == null) return null; // first and last TD need play-by-play
  const value = stat[field] as number | null;
  if (value == null) return null;
  if (value === bet.line) return 'push';
  return (value > bet.line) === (bet.side === 'over') ? 'won' : 'lost';
}

export const pullResults: Job = {
  name: 'pull-results',
  provider: 'results',
  async run(ctx) {
    const { db, now } = ctx;
    const since = new Date(now.getTime() - 10 * 86_400_000);
    const finals = await db.select().from(games).where(and(eq(games.status, 'final'), gt(games.kickoffAt, since)));
    if (!finals.length) return { skipped: 'No games finished in the last 10 days' };

    const provider = ctx.providers.results;
    const pctx = ctx.using(provider);
    const weeks = [...new Set(finals.filter((g) => g.week != null).map((g) => `${g.season}:${g.week}`))];
    const lines = (await Promise.all(weeks.map((w) => { const [s, wk] = w.split(':').map(Number); return provider.stats(pctx, s!, wk!); }))).flat();

    const gameRefs = await refMap(db, provider.id, 'game', [...new Set(lines.map((l) => l.gameExternalId))]);
    const playerRefs = await refMap(db, provider.id, 'player', [...new Set(lines.map((l) => l.playerExternalId))]);
    const finalIds = new Set(finals.map((g) => g.id));
    const rows: (typeof playerGameStats.$inferInsert)[] = [];
    let unknown = 0;
    for (const l of lines) {
      const gameId = gameRefs.get(l.gameExternalId), playerId = playerRefs.get(l.playerExternalId);
      if (!gameId || !playerId || !finalIds.has(gameId)) { unknown++; continue; }
      rows.push({
        gameId, playerId, touchdowns: l.touchdowns, receptions: l.receptions, receivingYards: l.receivingYards, rushingYards: l.rushingYards,
        passingYards: l.passingYards, passingTds: l.passingTds, extra: l.extra ?? null, runId: ctx.runId, updatedAt: now,
      });
    }
    for (const batch of chunks(rows)) {
      await db.insert(playerGameStats).values(batch).onConflictDoUpdate({
        target: [playerGameStats.gameId, playerGameStats.playerId],
        set: {
          touchdowns: sql`excluded.touchdowns`, receptions: sql`excluded.receptions`, receivingYards: sql`excluded.receiving_yards`,
          rushingYards: sql`excluded.rushing_yards`, passingYards: sql`excluded.passing_yards`, passingTds: sql`excluded.passing_tds`,
          extra: sql`excluded.extra`, runId: sql`excluded.run_id`, updatedAt: sql`excluded.updated_at`,
        },
      });
    }
    if (unknown) ctx.log('warn', `${plural(unknown, 'stat line')} did not match a final game or a known player`);

    // Closing prices for bets whose game has kicked off.
    const started = await db.select({ bet: bets, kickoff: games.kickoffAt }).from(bets).innerJoin(games, eq(games.id, bets.gameId))
      .where(and(isNull(bets.closingPrice), lte(games.kickoffAt, now)));
    for (const { bet, kickoff } of started) {
      const [close] = await db.select({ price: oddsSnapshots.priceDecimal }).from(oddsSnapshots)
        .where(and(eq(oddsSnapshots.selectionKey, bet.selectionKey), eq(oddsSnapshots.bookId, bet.bookId), lte(oddsSnapshots.observedAt, kickoff)))
        .orderBy(desc(oddsSnapshots.observedAt)).limit(1);
      if (close) await db.update(bets).set({ closingPrice: close.price }).where(eq(bets.id, bet.id));
    }

    // Settle open bets on finished games.
    const open = await db.select().from(bets).where(and(eq(bets.status, 'open'), inArray(bets.gameId, [...finalIds])));
    let settled = 0;
    for (const bet of open) {
      if (!bet.playerId) continue;
      const [stat] = await db.select().from(playerGameStats).where(and(eq(playerGameStats.gameId, bet.gameId), eq(playerGameStats.playerId, bet.playerId)));
      if (!stat) continue;
      const result = grade(bet, stat);
      if (!result) continue;
      const stake = Number(bet.stake);
      const payout = result === 'won' ? stake * bet.priceDecimal : result === 'push' ? stake : 0;
      await db.update(bets).set({ status: result, payout: payout.toFixed(2), settledAt: now }).where(eq(bets.id, bet.id));
      settled++;
    }
    return { message: `Pulled ${plural(rows.length, 'stat line')} for ${plural(finals.length, 'final game')}, settled ${plural(settled, 'bet')}`, rowsWritten: rows.length };
  },
};
