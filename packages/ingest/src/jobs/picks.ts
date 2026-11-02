// build-picks: appraises every anytime TD prop at the purchase book's posted price (core appraise()):
// gem with its 0 to 100 rating, Fool's Gold, no gem, or unrated without 2026 stats. Estimates are
// appended (history); the picks table is replaced for the games it covers.
import { PURCHASE_BOOK, appraise, clarityScore, fairChance, recommendedScore, seasonOf } from '@hiddengems/core';
import { estimates, games, oddsLatest, picks, playerGameStats, players } from '@hiddengems/db';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { MODEL, estimate, spread } from '../model/consensus';
import type { Job } from '../runner';
import { chunks, plural } from './shared';

type StatGame = { kickoff: Date; touchdowns: number };

/**
 * clarity-v0, from what the app has until the v3.0 model lands (section 11.7's four parts):
 * sample: games played this season, full marks at 8. consistency: how steady the TD rate is between
 * the first and second half of those games, from 4 games. books agree: the spread of the books' fair
 * chances, full marks within 1 point. setup: active on the roster.
 */
export function clarityV0(statGames: StatGame[], bookFairs: number[], status: string | null) {
  const n = statGames.length;
  const sorted = [...statGames].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  const rate = (g: StatGame[]) => (g.length ? g.filter((x) => x.touchdowns > 0).length / g.length : 0);
  const half = Math.floor(n / 2);
  const parts = {
    sample: 40 * Math.min(1, n / 8),
    consistency: n >= 4 ? 30 * (1 - Math.abs(rate(sorted.slice(0, half)) - rate(sorted.slice(half)))) : 0,
    booksAgree: 15 * Math.max(0, 1 - Math.max(0, spread(bookFairs) - 0.01) / 0.04),
    setup: status === 'ACT' || status === 'Active' ? 15 : 0,
  };
  return { clarity: clarityScore(parts), parts };
}

export const buildPicks: Job = {
  name: 'build-picks',
  async run(ctx) {
    const { db, now } = ctx;
    const rows = await db.select({ o: oddsLatest }).from(oddsLatest)
      .innerJoin(games, eq(games.id, oddsLatest.gameId))
      .where(and(eq(oddsLatest.available, true), gt(games.kickoffAt, now)));
    if (!rows.length) return { skipped: 'No current prices to appraise' };

    const bySelection = new Map<string, (typeof rows)[number]['o'][]>();
    for (const { o } of rows) bySelection.set(o.selectionKey, [...(bySelection.get(o.selectionKey) ?? []), o]);

    // This season's stat lines per player, and roster status, for the stats gate and clarity.
    const playerIds = [...new Set(rows.map((r) => r.o.playerId).filter((id): id is string => Boolean(id)))];
    const statRows = playerIds.length ? await db.select({ playerId: playerGameStats.playerId, touchdowns: playerGameStats.touchdowns, kickoff: games.kickoffAt })
      .from(playerGameStats).innerJoin(games, eq(games.id, playerGameStats.gameId))
      .where(and(inArray(playerGameStats.playerId, playerIds), eq(games.season, seasonOf(now)))) : [];
    const statsBy = new Map<string, StatGame[]>();
    for (const s of statRows) statsBy.set(s.playerId, [...(statsBy.get(s.playerId) ?? []), s]);
    const statusBy = new Map((playerIds.length ? await db.select({ id: players.id, status: players.status }).from(players).where(inArray(players.id, playerIds)) : []).map((p) => [p.id, p.status]));

    const pickRows: (typeof picks.$inferInsert)[] = [];
    const estimateRows: (typeof estimates.$inferInsert)[] = [];
    const counts = { gem: 0, 'fools-gold': 0, none: 0, unrated: 0 };
    let noPosted = 0;
    for (const [key, quotes] of bySelection) {
      const posted = quotes.find((q) => q.bookId === PURCHASE_BOOK);
      if (!posted) { noPosted++; continue; }
      const others = quotes.filter((q) => q.bookId !== PURCHASE_BOOK).map((q) => q.priceDecimal);
      const hitChance = estimate(others);
      if (hitChance === null) continue;
      const statGames = posted.playerId ? statsBy.get(posted.playerId) ?? [] : [];
      const { clarity, parts } = clarityV0(statGames, quotes.map((q) => fairChance(q.priceDecimal)), posted.playerId ? statusBy.get(posted.playerId) ?? null : null);
      const read = appraise({ hitChance, price: posted.priceDecimal, clarity, hasStats: statGames.length > 0 });
      counts[read.kind]++;
      const selection = { selectionKey: key, gameId: posted.gameId, marketId: posted.marketId, playerId: posted.playerId, playerName: posted.playerName, side: posted.side, line: posted.line };
      estimateRows.push({ ...selection, runId: ctx.runId, probability: hitChance, model: MODEL, computedAt: now, inputs: { books: quotes.map((q) => q.bookId), clarity: parts } });
      pickRows.push({
        ...selection, bookId: posted.bookId, price: posted.priceDecimal, priced: read.priced, fair: read.fair, hitChance, clarity,
        carat: read.carat, gapToPosted: read.gapToPosted, kind: read.kind, rating: read.rating,
        recommended: recommendedScore({ kind: read.kind, hitChance, clarity }), model: MODEL, link: posted.link, runId: ctx.runId, updatedAt: now,
      });
    }

    const gameIds = [...new Set(rows.map((r) => r.o.gameId))];
    await db.transaction(async (tx) => {
      for (const batch of chunks(estimateRows)) await tx.insert(estimates).values(batch);
      await tx.delete(picks).where(inArray(picks.gameId, gameIds));
      for (const batch of chunks(pickRows)) await tx.insert(picks).values(batch);
    });
    if (noPosted) ctx.log('info', `${plural(noPosted, 'prop')} had no DraftKings price yet`);
    return {
      message: `Appraised ${plural(pickRows.length, 'prop')} for ${plural(gameIds.length, 'game')}: ${plural(counts.gem, 'gem')}, ${counts['fools-gold']} Fool's Gold, ${counts.unrated} unrated`,
      rowsWritten: pickRows.length,
      meta: { model: MODEL, ...counts },
    };
  },
};
