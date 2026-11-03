// Sample data only (previews, local): the sample schedule starts with last week already final, so no freeze was
// ever pulled for it. Before pull-results settles and grades, this writes what the live pipeline would have: one
// gem record per sample player in each final game with none, and two placed slips for the latest of those weeks
// (a suggested parlay and your own single). pull-results then settles and grades them like any other.
import { PURCHASE_BOOK, appraise, fairChance, impliedFromDecimal, seasonOf, selectionKey } from '@hiddengems/core';
import { bets, gemRecords, games, isMissingTable, players, slipLegs, slips } from '@hiddengems/db';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { SAMPLE_PLAYERS, noise } from '../providers/sample';
import type { JobContext } from '../runner';
import { chunks } from './shared';

const round2 = (n: number) => Math.round(n * 100) / 100;
const MINUTE = 60_000;

/** Records and placed slips written; null until the gem records and slips migrations have run. */
export async function seedSampleHistory(ctx: Pick<JobContext, 'db' | 'now' | 'runId'>): Promise<{ records: number; slips: number } | null> {
  const { db, now } = ctx;
  try {
    const recorded = new Set((await db.selectDistinct({ id: gemRecords.gameId }).from(gemRecords)).map((r) => r.id));
    const finals = (await db.select().from(games)
      .where(and(eq(games.status, 'final'), eq(games.season, seasonOf(now)), lte(games.kickoffAt, now))))
      .filter((g) => g.week != null && !recorded.has(g.id));
    if (!finals.length) return { records: 0, slips: 0 };

    const teams = [...new Set(finals.flatMap((g) => [g.awayTeamId, g.homeTeamId]))];
    const roster = await db.select().from(players).where(inArray(players.teamId, teams));
    const rows: (typeof gemRecords.$inferInsert)[] = [];
    for (const game of finals) {
      for (const player of roster.filter((p) => p.teamId === game.awayTeamId || p.teamId === game.homeTeamId)) {
        const sample = SAMPLE_PLAYERS.find((s) => s.name === player.name);
        if (!sample) continue;
        const n = (what: string) => noise(`${game.id}:${sample.id}:${what}`);
        // The close carries the book's cut. The price taken a few hours earlier sits 2% to 18% above it, so about
        // half beat the fair close (core gradeTake()).
        const freezePrice = round2(1 / Math.min(0.95, sample.td * 1.08 * (1 + (n('close') - 0.5) * 0.16)));
        const decisionPrice = round2(freezePrice * (1.02 + n('took') * 0.16));
        const hitChance = Math.min(0.9, sample.td * (0.95 + n('read') * 0.25));
        const clarity = 45 + Math.round(n('clarity') * 45);
        const read = appraise({ hitChance, price: freezePrice, clarity, hasStats: true });
        const selection = { gameId: game.id, marketId: 'anytime_td', playerId: player.id, side: 'yes', line: null };
        rows.push({
          runId: ctx.runId, ...selection, selectionKey: selectionKey(selection), playerName: player.name, bookId: PURCHASE_BOOK,
          kind: read.kind, rating: read.rating, hitChance, clarity, carat: read.carat, decisionSlot: null,
          decisionAt: new Date(game.kickoffAt.getTime() - 300 * MINUTE), decisionPrice,
          decisionPriced: impliedFromDecimal(decisionPrice), decisionFair: fairChance(decisionPrice),
          freezeAt: new Date(game.kickoffAt.getTime() - 20 * MINUTE), freezePrice, freezePriced: read.priced, freezeFair: read.fair,
          isNew: false, newReason: null, estimateId: null, model: 'sample', recordedAt: now,
        });
      }
    }
    let records = 0;
    for (const batch of chunks(rows)) records += (await db.insert(gemRecords).values(batch).onConflictDoNothing().returning({ id: gemRecords.id })).length;

    // Two placed slips for the latest of these weeks, unless that week already has a placed slip.
    const season = finals[0]!.season;
    const week = Math.max(...finals.map((g) => g.week!));
    const [any] = await db.select({ id: slips.id }).from(slips)
      .where(and(eq(slips.season, season), eq(slips.week, week), eq(slips.state, 'placed'))).limit(1);
    const weekGames = new Set(finals.filter((g) => g.week === week).map((g) => g.id));
    const gems = rows.filter((r) => weekGames.has(r.gameId) && r.kind === 'gem').sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (any || !gems.length) return { records, slips: 0 };
    const parlay = [gems[0]!];
    const second = gems.find((g) => g.gameId !== gems[0]!.gameId);
    if (second) parlay.push(second);
    const single = gems.find((g) => !parlay.includes(g));
    const plan = [
      { legs: parlay, stake: 15, play: 'suggested', appraisal: 'Both legs clear the cut at these prices.' },
      ...(single ? [{ legs: [single], stake: 10, play: 'own', appraisal: null }] : []),
    ];
    await db.transaction(async (tx) => {
      for (const p of plan) {
        const at = new Date(Math.min(...p.legs.map((l) => (l.decisionAt as Date).getTime())));
        const stake = p.stake.toFixed(2);
        const [slip] = await tx.insert(slips).values({
          season, week, state: 'placed', play: p.play, bookId: PURCHASE_BOOK, stake, appraisal: p.appraisal,
          createdAt: at, updatedAt: at, sentAt: at, placedAt: at,
        }).returning({ id: slips.id });
        for (const l of p.legs) {
          const sel = { selectionKey: l.selectionKey, gameId: l.gameId, marketId: l.marketId, playerId: l.playerId, playerName: l.playerName, side: l.side, line: null };
          const [bet] = await tx.insert(bets).values({
            ...sel, placedAt: at, bookId: PURCHASE_BOOK, priceDecimal: l.decisionPrice, stake, closingPrice: l.freezePrice,
            note: p.legs.length > 1 ? `Leg of a ${p.legs.length} leg parlay` : null,
          }).returning({ id: bets.id });
          await tx.insert(slipLegs).values({ ...sel, slipId: slip!.id, bookId: PURCHASE_BOOK, priceDecimal: l.decisionPrice, addedAt: at, betId: bet!.id });
        }
      }
    });
    return { records, slips: plan.length };
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}
