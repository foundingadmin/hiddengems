// Gem records, written by build-picks once a game's kickoff freeze is pulled and its board rebuilt: one row
// per appraised prop in that game (gem, Fool's Gold, no gem and unrated, kind stored), exactly once. Each
// keeps the board at the freeze, priced and fair at the decision price (core decisionSnapshot(): Sunday
// 8:43 AM, or the latest weekly snapshot before an earlier kickoff) and at the freeze, the New gems flag,
// and the estimate behind it. pull-results grades them once the game is final.
import { PURCHASE_BOOK, decisionSnapshot, fairChance, impliedFromDecimal, newGemReason, priceAsOf } from '@hiddengems/core';
import { estimates, gemMarks, gemRecords, games, isMissingTable, oddsSlots, oddsSnapshots, picks } from '@hiddengems/db';
import { and, eq, gte, inArray } from 'drizzle-orm';
import type { JobContext } from '../runner';
import { chunks, plural } from './shared';

/** Freezes older than this are not backfilled: the board and New gems marks have moved on since. */
const CATCH_UP_MS = 86_400_000;

export interface Recorded {
  written: number;
  games: string[];
}

/** Records every frozen game not recorded yet. Null until the gem records migration has run. */
export async function recordFrozenGames(ctx: Pick<JobContext, 'db' | 'now' | 'runId' | 'log'>): Promise<Recorded | null> {
  const { db, now } = ctx;
  let recorded: Set<string>;
  try {
    recorded = new Set((await db.selectDistinct({ id: gemRecords.gameId }).from(gemRecords)).map((r) => r.id));
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
  const slots = await db.select({ slot: oddsSlots.slot, pulledAt: oddsSlots.pulledAt }).from(oddsSlots);
  const frozen = new Map(slots.filter((s) => s.slot.startsWith('freeze:')).map((s) => [s.slot.slice('freeze:'.length), s.pulledAt]));
  const pendingIds = [...frozen.keys()].filter((id) => !recorded.has(id));
  if (!pendingIds.length) return { written: 0, games: [] };
  const pending = (await db.select().from(games).where(inArray(games.id, pendingIds)))
    .filter((g) => g.kickoffAt.getTime() > now.getTime() - CATCH_UP_MS);

  const rows: (typeof gemRecords.$inferInsert)[] = [];
  const done: string[] = [];
  const waiting: string[] = [];
  for (const game of pending) {
    const freezeAt = frozen.get(game.id)!;
    // The board rebuilt after the freeze pull; an older one would carry pre-freeze prices.
    const board = await db.select().from(picks).where(and(eq(picks.gameId, game.id), gte(picks.updatedAt, freezeAt)));
    if (!board.length) { waiting.push(game.id); continue; }
    done.push(game.id);

    const decision = decisionSnapshot(game.kickoffAt, slots);
    // Without a weekly snapshot (manual pulls only), the decision is the last price before the freeze.
    const decisionCutoff = decision?.pulledAt ?? new Date(freezeAt.getTime() - 1);
    const history = await db.select({ key: oddsSnapshots.selectionKey, price: oddsSnapshots.priceDecimal, pulledAt: oddsSnapshots.pulledAt, observedAt: oddsSnapshots.observedAt })
      .from(oddsSnapshots).where(and(eq(oddsSnapshots.gameId, game.id), eq(oddsSnapshots.bookId, PURCHASE_BOOK)));
    const historyBy = new Map<string, typeof history>();
    for (const h of history) historyBy.set(h.key, [...(historyBy.get(h.key) ?? []), h]);

    const runIds = [...new Set(board.map((p) => p.runId))];
    const estimateBy = new Map((await db.select({ id: estimates.id, runId: estimates.runId, key: estimates.selectionKey }).from(estimates)
      .where(and(eq(estimates.gameId, game.id), inArray(estimates.runId, runIds)))).map((e) => [`${e.runId}|${e.key}`, e.id]));
    const marks = new Map((await db.select().from(gemMarks).where(inArray(gemMarks.selectionKey, board.map((p) => p.selectionKey))))
      .map((m) => [m.selectionKey, m]));

    for (const p of board) {
      const taken = priceAsOf(historyBy.get(p.selectionKey) ?? [], decisionCutoff);
      const decisionPrice = taken?.price ?? p.price;
      const fresh = p.kind === 'gem' ? newGemReason(p.rating, marks.get(p.selectionKey) ?? null) : null;
      rows.push({
        runId: ctx.runId, selectionKey: p.selectionKey, gameId: p.gameId, marketId: p.marketId, playerId: p.playerId, playerName: p.playerName,
        side: p.side, line: p.line, bookId: p.bookId, kind: p.kind, rating: p.rating, hitChance: p.hitChance, clarity: p.clarity, carat: p.carat,
        decisionSlot: decision?.slot ?? null, decisionAt: taken?.pulledAt ?? freezeAt,
        decisionPrice, decisionPriced: impliedFromDecimal(decisionPrice), decisionFair: fairChance(decisionPrice),
        freezeAt, freezePrice: p.price, freezePriced: p.priced, freezeFair: p.fair,
        isNew: fresh !== null, newReason: fresh?.kind ?? null,
        estimateId: estimateBy.get(`${p.runId}|${p.selectionKey}`) ?? null, model: p.model, recordedAt: now,
      });
    }
  }

  let written = 0;
  for (const batch of chunks(rows)) {
    written += (await db.insert(gemRecords).values(batch).onConflictDoNothing().returning({ id: gemRecords.id })).length;
  }
  if (waiting.length) ctx.log('info', `${plural(waiting.length, 'frozen game')} had no DraftKings board after the freeze, so nothing was recorded`, { gameIds: waiting });
  return { written, games: done };
}
