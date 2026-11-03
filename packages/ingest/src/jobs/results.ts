// pull-results: nflverse stat lines for recently finished games, then settles open anytime TD bets,
// records the closing price (the last price before kickoff) and grades every gem record and placed bet
// on a final game: closing line value against the fair close and one of four boxes (core gradeTake()).
import { anytimeTdHit, fairChance, gradeTake, seasonOf } from '@hiddengems/core';
import { bets, gemRecords, games, grades, isMissingTable, oddsSnapshots, parlayLegBets, playerGameStats } from '@hiddengems/db';
import { type AnyColumn, and, desc, eq, inArray, isNotNull, isNull, lte, notInArray, sql } from 'drizzle-orm';
import type { Job, JobContext } from '../runner';
import { chunks, plural, refMap } from './shared';

type StatRow = typeof playerGameStats.$inferSelect;

/** won or lost for an anytime TD bet from the player's stat line; null for any other market. */
export function grade(bet: { marketId: string }, stat: Pick<StatRow, 'touchdowns'>): 'won' | 'lost' | null {
  if (bet.marketId !== 'anytime_td') return null;
  return anytimeTdHit(stat.touchdowns) ? 'won' : 'lost';
}

export const pullResults: Job = {
  name: 'pull-results',
  provider: 'results',
  async run(ctx) {
    const { db, now } = ctx;
    // Every final game this season with no stat lines yet (the first run backfills the season), plus the
    // last 10 days again, since stat corrections land after the fact.
    const since = new Date(now.getTime() - 10 * 86_400_000);
    const withStats = new Set((await db.selectDistinct({ id: playerGameStats.gameId }).from(playerGameStats)).map((r) => r.id));
    const finals = (await db.select().from(games).where(and(eq(games.status, 'final'), eq(games.season, seasonOf(now)))))
      .filter((g) => !withStats.has(g.id) || g.kickoffAt > since);
    if (!finals.length) {
      const graded = await gradeFinals(ctx);
      if (!graded?.gems && !graded?.bets) return { skipped: 'Every final game already has its stats' };
      return { message: `Graded ${plural(graded.gems, 'gem record')} and ${plural(graded.bets, 'bet')}`, rowsWritten: graded.gems + graded.bets };
    }

    const provider = ctx.providers.results;
    const pctx = ctx.using(provider);
    const weeks = [...new Set(finals.filter((g) => g.week != null).map((g) => `${g.season}:${g.week}`))];
    const lines = (await Promise.all(weeks.map((w) => { const [s, wk] = w.split(':').map(Number); return provider.stats(pctx, s!, wk!); }))).flat();

    const gameRefs = await refMap(db, provider.id, 'game', [...new Set(lines.map((l) => l.gameExternalId))]);
    const playerRefs = await refMap(db, provider.id, 'player', [...new Set(lines.map((l) => l.playerExternalId))]);
    const finalIds = new Set(finals.map((g) => g.id));
    // One row per player game: a provider that returns a line under two weeks must not upsert it twice in one insert.
    const byPlayerGame = new Map<string, typeof playerGameStats.$inferInsert>();
    let unknown = 0;
    const unknownIds = new Set<string>();
    for (const l of lines) {
      const gameId = gameRefs.get(l.gameExternalId), playerId = playerRefs.get(l.playerExternalId);
      if (!gameId || !playerId || !finalIds.has(gameId)) { unknown++; unknownIds.add(l.playerExternalId); continue; }
      byPlayerGame.set(`${gameId}|${playerId}`, {
        gameId, playerId, touchdowns: l.touchdowns, receptions: l.receptions, receivingYards: l.receivingYards, rushingYards: l.rushingYards,
        passingYards: l.passingYards, passingTds: l.passingTds, extra: l.extra ?? null, runId: ctx.runId, updatedAt: now,
      });
    }
    const rows = [...byPlayerGame.values()];
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
    if (unknown) ctx.log('warn', `${plural(unknown, 'stat line')} did not match a final game or a rostered player`, { playerIds: [...unknownIds].slice(0, 25) });

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
    // A parlay leg's own payout means nothing (the slip pays only if every leg hits), so it settles with none.
    const parlayLegs = await parlayLegBets(db, open.map((b) => b.id));
    let settled = 0;
    for (const bet of open) {
      if (!bet.playerId) continue;
      const [stat] = await db.select().from(playerGameStats).where(and(eq(playerGameStats.gameId, bet.gameId), eq(playerGameStats.playerId, bet.playerId)));
      if (!stat) continue;
      const result = grade(bet, stat);
      if (!result) continue;
      const stake = Number(bet.stake);
      const payout = parlayLegs.has(bet.id) ? null : (result === 'won' ? stake * bet.priceDecimal : 0).toFixed(2);
      await db.update(bets).set({ status: result, payout, settledAt: now }).where(eq(bets.id, bet.id));
      settled++;
    }

    const graded = await gradeFinals(ctx);
    const gradedText = graded?.gems || graded?.bets ? `, graded ${plural(graded.gems, 'gem record')} and ${plural(graded.bets, 'bet')}` : '';
    return {
      message: `Pulled ${plural(rows.length, 'stat line')} for ${plural(finals.length, 'final game')}, settled ${plural(settled, 'bet')}${gradedText}`,
      rowsWritten: rows.length + (graded?.gems ?? 0) + (graded?.bets ?? 0),
    };
  },
};

/**
 * Grades every gem record and placed bet whose game is final and whose player has a stat line, once each.
 * Null until the grades migration has run.
 */
export async function gradeFinals(ctx: Pick<JobContext, 'db' | 'now' | 'runId' | 'log'>): Promise<{ gems: number; bets: number } | null> {
  const { db, now } = ctx;
  const statOn = (gameId: AnyColumn, playerId: AnyColumn) =>
    and(eq(playerGameStats.gameId, gameId), eq(playerGameStats.playerId, playerId));
  let records;
  try {
    records = await db.select({ r: gemRecords, touchdowns: playerGameStats.touchdowns }).from(gemRecords)
      .innerJoin(games, eq(games.id, gemRecords.gameId))
      .innerJoin(playerGameStats, statOn(gemRecords.gameId, gemRecords.playerId))
      .leftJoin(grades, eq(grades.gemRecordId, gemRecords.id))
      .where(and(eq(games.status, 'final'), eq(gemRecords.marketId, 'anytime_td'), isNull(grades.id)));
  } catch (err) {
    if (isMissingTable(err)) {
      ctx.log('info', 'Grading starts once the database update runs (pnpm db:supabase-sql)');
      return null;
    }
    throw err;
  }
  const placed = await db.select({ bet: bets, touchdowns: playerGameStats.touchdowns }).from(bets)
    .innerJoin(games, eq(games.id, bets.gameId))
    .innerJoin(playerGameStats, statOn(bets.gameId, bets.playerId))
    .leftJoin(grades, eq(grades.betId, bets.id))
    .where(and(eq(games.status, 'final'), eq(bets.marketId, 'anytime_td'), isNotNull(bets.closingPrice), notInArray(bets.status, ['void', 'push']), isNull(grades.id)));

  const row = (subject: 'gem' | 'bet', taken: number, closePrice: number, touchdowns: number) => {
    const hit = anytimeTdHit(touchdowns);
    const g = gradeTake({ taken, closePrice, hit });
    return { runId: ctx.runId, subject, taken, closePrice, closeFair: fairChance(closePrice), clv: g.clv, beatClose: g.beatClose, hit, touchdowns, box: g.box, gradedAt: now };
  };
  const rows: (typeof grades.$inferInsert)[] = [
    ...records.map(({ r, touchdowns }) => ({ ...row('gem', r.decisionPrice, r.freezePrice, touchdowns), gemRecordId: r.id, selectionKey: r.selectionKey, gameId: r.gameId })),
    ...placed.map(({ bet, touchdowns }) => ({ ...row('bet', bet.priceDecimal, bet.closingPrice!, touchdowns), betId: bet.id, selectionKey: bet.selectionKey, gameId: bet.gameId })),
  ];
  const out = { gems: 0, bets: 0 };
  for (const batch of chunks(rows)) {
    for (const g of await db.insert(grades).values(batch).onConflictDoNothing().returning({ subject: grades.subject })) {
      if (g.subject === 'gem') out.gems++; else out.bets++;
    }
  }
  return out;
}
