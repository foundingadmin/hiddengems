// build-picks: turns current prices into the slate. For every selection two or more books price, takes
// the best price, estimates the chance (model/consensus.ts), and records the gap, tier, signals and
// verdict. Estimates are appended (history); the picks table is replaced for the games it covers.
import { type Signals, UNCHECKED, gapPoints, impliedFromDecimal, tierOf, verdictOf } from '@hiddengems/core';
import { estimates, games, oddsLatest, picks } from '@hiddengems/db';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { type BookPrice, MODEL, estimate } from '../model/consensus';
import type { Job } from '../runner';
import { chunks, plural } from './shared';

const OPPOSITE: Record<string, string> = { over: 'under', under: 'over' };

export const buildPicks: Job = {
  name: 'build-picks',
  async run(ctx) {
    const { db, now } = ctx;
    const rows = await db.select({ o: oddsLatest }).from(oddsLatest)
      .innerJoin(games, eq(games.id, oddsLatest.gameId))
      .where(and(eq(oddsLatest.available, true), gt(games.kickoffAt, now)));
    if (!rows.length) return { skipped: 'No current prices to rank' };

    const bySelection = new Map<string, (typeof rows)[number]['o'][]>();
    const sideIndex = new Map<string, number>(); // "<market line player game>|<side>|<book>" -> price
    for (const { o } of rows) {
      bySelection.set(o.selectionKey, [...(bySelection.get(o.selectionKey) ?? []), o]);
      sideIndex.set(`${o.gameId}|${o.marketId}|${o.playerId ?? o.playerName}|${o.line}|${o.side}|${o.bookId}`, o.priceDecimal);
    }

    const pickRows: (typeof picks.$inferInsert)[] = [];
    const estimateRows: (typeof estimates.$inferInsert)[] = [];
    for (const [key, quotes] of bySelection) {
      if (quotes.length < 2) continue;
      const best = quotes.reduce((a, b) => (b.priceDecimal > a.priceDecimal ? b : a));
      const others: BookPrice[] = quotes.filter((q) => q.bookId !== best.bookId).map((q) => {
        const opp = OPPOSITE[q.side];
        const opposite = opp ? sideIndex.get(`${q.gameId}|${q.marketId}|${q.playerId ?? q.playerName}|${q.line}|${opp}|${q.bookId}`) : undefined;
        return { bookId: q.bookId, price: q.priceDecimal, opposite };
      });
      const est = estimate(others);
      if (!est) continue;
      const priced = impliedFromDecimal(best.priceDecimal);
      const gap = gapPoints(est.probability, priced);
      const signals: Signals = {
        ...UNCHECKED,
        priceGap: gap >= 6 ? 'go' : gap >= 1 ? 'wait' : 'stop',
        market: quotes.length >= 3 ? 'go' : 'wait',
      };
      const selection = { selectionKey: key, gameId: best.gameId, marketId: best.marketId, playerId: best.playerId, playerName: best.playerName, side: best.side, line: best.line };
      estimateRows.push({ ...selection, runId: ctx.runId, probability: est.probability, model: MODEL, computedAt: now, inputs: { books: others.map((o) => o.bookId), devigged: est.devigged } });
      pickRows.push({
        ...selection, bestBookId: best.bookId, bestPrice: best.priceDecimal, priced, estimate: est.probability, model: MODEL,
        gapPts: gap, tier: tierOf(gap), signals, verdict: verdictOf(signals), runId: ctx.runId, updatedAt: now,
      });
    }

    const gameIds = [...new Set(rows.map((r) => r.o.gameId))];
    await db.transaction(async (tx) => {
      for (const batch of chunks(estimateRows)) await tx.insert(estimates).values(batch);
      await tx.delete(picks).where(inArray(picks.gameId, gameIds));
      for (const batch of chunks(pickRows)) await tx.insert(picks).values(batch);
    });
    const gems = pickRows.filter((p) => p.tier === 'cut' || p.tier === 'polished' || p.tier === 'flawless').length;
    return {
      message: `Ranked ${plural(pickRows.length, 'pick')} for ${plural(gameIds.length, 'game')}, ${gems} cut or better`,
      rowsWritten: pickRows.length,
      meta: { model: MODEL },
    };
  },
};
