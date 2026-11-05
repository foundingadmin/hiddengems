// The slip store (docs/prd.md F3.1): one open slip per week, built from gems, sent through the book's slip link,
// then marked placed, which writes one bet per leg so pull-results settles and grades it. Every read and write
// survives a database that has not run the slips migration yet: reads come back empty, writes say so.
import { PURCHASE_BOOK, type SlipPlay, type SlipState, seasonOf } from '@hiddengems/core';
import { and, asc, desc, eq, gt, inArray, lte, ne, sql } from 'drizzle-orm';
import { type Db, isMissingTable } from './client';
import { bets, games, oddsSnapshots, picks, players, slipLegs, slips } from './schema';

export interface SlipLegView {
  selectionKey: string;
  gameId: string;
  marketId: string;
  side: string;
  line: number | null;
  playerId: string | null;
  name: string;
  teamId: string | null;
  number: number | null;
  position: string | null;
  awayTeamId: string;
  homeTeamId: string;
  kickoffAt: Date;
  /** The posted price when the leg was added. */
  addedPrice: number;
  /** The posted price now, or the added price once the board no longer lists it. */
  price: number;
  /** The current read; null once the board no longer lists the prop. */
  hitChance: number | null;
  rating: number | null;
  kind: string | null;
  /** The book's slip link for this pick, when the odds feed sent one. */
  link: string | null;
  betId: string | null;
}

export interface SlipView {
  id: string;
  season: number;
  week: number;
  /** Its order among the week's slips, from 1 ("Slip 1"). */
  number: number;
  state: SlipState;
  play: SlipPlay;
  bookId: string;
  stake: number | null;
  appraisal: string | null;
  createdAt: Date;
  sentAt: Date | null;
  placedAt: Date | null;
  legs: SlipLegView[];
}

/** confirm 'change': the slip is a suggested play, so changing its legs needs the Change slip confirmation first. */
export type SlipResult = { ok: true; slipId: string } | { ok: false; error: string } | { ok: false; confirm: 'change'; slipId: string };

/** What removeLeg() took off a slip, so Undo can put the same leg back (restoreLeg()). */
export interface RemovedLeg {
  selectionKey: string;
  /** The posted price when the leg was first added. */
  price: number;
  /** When it was first added, ISO. Legs in one game sort by it. */
  addedAt: string;
}

const NOT_READY = 'Slips start once the database update runs';
const OPEN: SlipState[] = ['draft', 'assessed', 'sent'];

/** Runs a slip read or write; a missing slips table (migration not run yet) returns the fallback. */
async function guard<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingTable(err)) return fallback;
    throw err;
  }
}

async function legsOf(db: Db, slipId: string): Promise<SlipLegView[]> {
  const rows = await db.select({ leg: slipLegs, game: games, player: players, pick: picks })
    .from(slipLegs)
    .innerJoin(games, eq(games.id, slipLegs.gameId))
    .leftJoin(players, eq(players.id, slipLegs.playerId))
    .leftJoin(picks, and(eq(picks.selectionKey, slipLegs.selectionKey), eq(picks.bookId, slipLegs.bookId)))
    .where(eq(slipLegs.slipId, slipId))
    .orderBy(asc(games.kickoffAt), asc(slipLegs.addedAt));
  return rows.map(({ leg, game, player, pick }) => ({
    selectionKey: leg.selectionKey, gameId: leg.gameId, marketId: leg.marketId, side: leg.side, line: leg.line, playerId: leg.playerId,
    name: player?.name ?? leg.playerName ?? 'Unknown player', teamId: player?.teamId ?? null, number: player?.jerseyNumber ?? null,
    position: player?.position ?? null, awayTeamId: game.awayTeamId, homeTeamId: game.homeTeamId, kickoffAt: game.kickoffAt,
    addedPrice: leg.priceDecimal, price: pick?.price ?? leg.priceDecimal, hitChance: pick?.hitChance ?? null, rating: pick?.rating ?? null,
    kind: pick?.kind ?? null, link: pick?.link ?? null, betId: leg.betId,
  }));
}

async function view(db: Db, row: typeof slips.$inferSelect): Promise<SlipView> {
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(slips)
    .where(and(eq(slips.season, row.season), eq(slips.week, row.week), lte(slips.createdAt, row.createdAt)));
  return {
    id: row.id, season: row.season, week: row.week, number: Math.max(1, n?.n ?? 1), state: row.state as SlipState, play: row.play as SlipPlay,
    bookId: row.bookId, stake: row.stake == null ? null : Number(row.stake), appraisal: row.appraisal, createdAt: row.createdAt,
    sentAt: row.sentAt, placedAt: row.placedAt, legs: await legsOf(db, row.id),
  };
}

/** The week's open slip (draft, assessed or sent), newest first. */
async function openRow(db: Db, season: number, week: number) {
  const [row] = await db.select().from(slips)
    .where(and(eq(slips.season, season), eq(slips.week, week), inArray(slips.state, OPEN)))
    .orderBy(desc(slips.createdAt)).limit(1);
  return row ?? null;
}

/** The slip in progress for a week, or null. What the rail slip and the Add / On slip buttons read. */
export function openSlip(db: Db, season: number, week: number): Promise<SlipView | null> {
  return guard(null, async () => {
    const row = await openRow(db, season, week);
    return row ? view(db, row) : null;
  });
}

/** What Slips, This week shows: the open slip, else the last one placed that week, else null. */
export function slipForWeek(db: Db, season: number, week: number): Promise<SlipView | null> {
  return guard(null, async () => {
    const row = await openRow(db, season, week) ?? (await db.select().from(slips)
      .where(and(eq(slips.season, season), eq(slips.week, week))).orderBy(desc(slips.createdAt)).limit(1))[0];
    return row ? view(db, row) : null;
  });
}

export function getSlip(db: Db, id: string): Promise<SlipView | null> {
  return guard(null, async () => {
    const [row] = await db.select().from(slips).where(eq(slips.id, id));
    return row ? view(db, row) : null;
  });
}

/** An open slip by id, or the reason it cannot change. */
async function editable(db: Db, slipId: string): Promise<typeof slips.$inferSelect | string> {
  const [row] = await db.select().from(slips).where(eq(slips.id, slipId));
  if (!row) return 'That slip no longer exists';
  if (row.state === 'placed') return 'This slip is already placed';
  return row;
}

/** A change to the legs: the appraisal no longer covers the slip, so it is a draft and your own play. */
const legsChanged = (now: Date) => ({ state: 'draft', play: 'own', appraisal: null, updatedAt: now }) as const;

/**
 * Adds a gem to its week's open slip, starting a draft when there is none. A suggested play is not changed here:
 * it asks for the Change slip confirmation (changeToOwnPlay()) first.
 */
export function addLeg(db: Db, selectionKey: string, now = new Date()): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    const [found] = await db.select({ pick: picks, game: games }).from(picks).innerJoin(games, eq(games.id, picks.gameId))
      .where(eq(picks.selectionKey, selectionKey));
    if (!found) return { ok: false, error: 'That prop is no longer on the board' };
    const { pick, game } = found;
    if (pick.kind !== 'gem') return { ok: false, error: 'Only gems go on a slip' };
    if (game.kickoffAt <= now) return { ok: false, error: 'Its game has kicked off' };
    if (game.week == null) return { ok: false, error: 'Its game has no week yet' };
    return db.transaction(async (tx) => {
      const t = tx as unknown as Db;
      let slip = await openRow(t, game.season, game.week!);
      if (!slip) {
        slip = (await tx.insert(slips).values({ season: game.season, week: game.week!, bookId: pick.bookId, createdAt: now, updatedAt: now }).returning())[0]!;
      } else if (slip.play === 'suggested') {
        const [on] = await tx.select({ key: slipLegs.selectionKey }).from(slipLegs)
          .where(and(eq(slipLegs.slipId, slip.id), eq(slipLegs.selectionKey, selectionKey)));
        if (!on) return { ok: false, confirm: 'change', slipId: slip.id };
      }
      const inserted = await tx.insert(slipLegs).values({
        slipId: slip.id, selectionKey, gameId: pick.gameId, marketId: pick.marketId, playerId: pick.playerId, playerName: pick.playerName,
        side: pick.side, line: pick.line, bookId: pick.bookId, priceDecimal: pick.price, addedAt: now,
      }).onConflictDoNothing().returning({ key: slipLegs.selectionKey });
      if (inserted.length) await tx.update(slips).set(legsChanged(now)).where(eq(slips.id, slip.id));
      return { ok: true, slipId: slip.id };
    });
  });
}

/**
 * Removes a leg; a suggested play asks for the Change slip confirmation first, as addLeg() does. removed is what
 * Undo needs to put the same leg back (restoreLeg()); absent when the leg was already gone.
 */
export function removeLeg(db: Db, slipId: string, selectionKey: string, now = new Date()): Promise<SlipResult & { removed?: RemovedLeg }> {
  return guard<SlipResult & { removed?: RemovedLeg }>({ ok: false, error: NOT_READY }, async () => {
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    if (slip.play === 'suggested') return { ok: false, confirm: 'change', slipId };
    const [gone] = await db.delete(slipLegs).where(and(eq(slipLegs.slipId, slipId), eq(slipLegs.selectionKey, selectionKey)))
      .returning({ key: slipLegs.selectionKey, price: slipLegs.priceDecimal, addedAt: slipLegs.addedAt });
    if (!gone) return { ok: true, slipId };
    await db.update(slips).set(legsChanged(now)).where(eq(slips.id, slipId));
    return { ok: true, slipId, removed: { selectionKey: gone.key, price: gone.price, addedAt: gone.addedAt.toISOString() } };
  });
}

/**
 * Undo for removeLeg(): puts the same leg back on the same slip with the price and the added time it had, so it
 * returns to its place. Those two come back from the client, so they are checked: the price stands only if
 * odds_snapshots saw the book post it for this selection at or before the added time (read only), else the
 * board's price now; an added time outside the slip's life takes now. Otherwise it refuses what addLeg() refuses:
 * a pick that is not a gem, a game that has kicked off, and a game from another week than the slip's. Restoring a
 * leg already on the slip changes nothing. The slip stays a draft of your own play, as the remove left it.
 */
export function restoreLeg(db: Db, slipId: string, leg: RemovedLeg, now = new Date()): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    if (slip.play === 'suggested') return { ok: false, confirm: 'change', slipId };
    const found = await db.select({ pick: picks, game: games }).from(picks).innerJoin(games, eq(games.id, picks.gameId))
      .where(eq(picks.selectionKey, leg.selectionKey));
    const hit = found.find((f) => f.pick.bookId === slip.bookId) ?? found[0];
    if (!hit) return { ok: false, error: 'That prop is no longer on the board' };
    const { pick, game } = hit;
    if (pick.kind !== 'gem') return { ok: false, error: 'Only gems go on a slip' };
    if (game.kickoffAt <= now) return { ok: false, error: 'Its game has kicked off' };
    if (game.season !== slip.season || game.week !== slip.week) return { ok: false, error: 'Its game is in another week' };
    const at = new Date(leg.addedAt);
    const addedAt = Number.isNaN(at.getTime()) || at < slip.createdAt || at > now ? now : at;
    const price = Number.isFinite(leg.price) && await posted(db, pick.selectionKey, pick.bookId, leg.price, addedAt) ? leg.price : pick.price;
    const inserted = await db.insert(slipLegs).values({
      slipId, selectionKey: pick.selectionKey, gameId: pick.gameId, marketId: pick.marketId, playerId: pick.playerId, playerName: pick.playerName,
      side: pick.side, line: pick.line, bookId: pick.bookId, priceDecimal: price, addedAt,
    }).onConflictDoNothing().returning({ key: slipLegs.selectionKey });
    if (inserted.length) await db.update(slips).set(legsChanged(now)).where(eq(slips.id, slipId));
    return { ok: true, slipId };
  });
}

/** True when the book posted this price for the selection at or before at, per odds_snapshots (a read). */
async function posted(db: Db, selectionKey: string, bookId: string, price: number, at: Date): Promise<boolean> {
  const [row] = await db.select({ id: oddsSnapshots.id }).from(oddsSnapshots).where(and(
    eq(oddsSnapshots.selectionKey, selectionKey), eq(oddsSnapshots.bookId, bookId), lte(oddsSnapshots.observedAt, at),
    sql`abs(${oddsSnapshots.priceDecimal} - ${price}) < 1e-9`,
  )).limit(1);
  return Boolean(row);
}

/** Sets the stake in dollars (validated by the caller with core parseStake()). */
export function setStake(db: Db, slipId: string, stake: number, now = new Date()): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    if (!(stake > 0)) return { ok: false, error: 'Enter a stake above zero' };
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    await db.update(slips).set({ stake: stake.toFixed(2), updatedAt: now }).where(eq(slips.id, slipId));
    return { ok: true, slipId };
  });
}

/** Change slip, from the confirmation dialog: the suggested play becomes your own play, with no appraisal. */
export function changeToOwnPlay(db: Db, slipId: string, now = new Date()): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    await db.update(slips).set(legsChanged(now)).where(eq(slips.id, slipId));
    return { ok: true, slipId };
  });
}

/** The slip link was opened: the slip is sent. Placing it is still Josh's tap in the book. */
export function markSent(db: Db, slipId: string, now = new Date()): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    await db.update(slips).set({ state: 'sent', sentAt: now, updatedAt: now }).where(and(eq(slips.id, slipId), ne(slips.state, 'placed')));
    return { ok: true, slipId };
  });
}

/**
 * Marks the slip placed, as it stands ('slip') or as something else ('other', which makes it your own play), and
 * writes one open bet per leg at the posted price now, so pull-results records the close, settles and grades it.
 */
export function markPlaced(db: Db, slipId: string, as: 'slip' | 'other', now = new Date(), stake?: number): Promise<SlipResult> {
  return guard<SlipResult>({ ok: false, error: NOT_READY }, async () => {
    const slip = await editable(db, slipId);
    if (typeof slip === 'string') return { ok: false, error: slip };
    const amount = stake ?? (slip.stake == null ? null : Number(slip.stake));
    if (amount == null || !(amount > 0)) return { ok: false, error: 'Set the stake first' };
    const legs = await legsOf(db, slipId);
    if (!legs.length) return { ok: false, error: 'Add a gem first' };
    return db.transaction(async (tx) => {
      // Claims the slip first, so a double submit or a second tab writes no second set of bets.
      const claimed = await tx.update(slips).set({ state: 'placed' }).where(and(eq(slips.id, slipId), ne(slips.state, 'placed'))).returning({ id: slips.id });
      if (!claimed.length) return { ok: false, error: 'This slip is already placed' };
      for (const l of legs) {
        const [bet] = await tx.insert(bets).values({
          placedAt: now, selectionKey: l.selectionKey, gameId: l.gameId, marketId: l.marketId, playerId: l.playerId, playerName: l.name,
          side: l.side, line: l.line, bookId: slip.bookId, priceDecimal: l.price, stake: amount.toFixed(2),
          note: legs.length > 1 ? `Leg of a ${legs.length} leg parlay` : null,
        }).returning({ id: bets.id });
        await tx.update(slipLegs).set({ betId: bet!.id }).where(and(eq(slipLegs.slipId, slipId), eq(slipLegs.selectionKey, l.selectionKey)));
      }
      await tx.update(slips).set({
        placedAt: now, updatedAt: now, stake: amount.toFixed(2), ...(as === 'other' ? { play: 'own', appraisal: null } : {}),
      }).where(eq(slips.id, slipId));
      return { ok: true, slipId };
    });
  });
}

/**
 * Bets that are legs of a parlay (a placed slip with two or more legs). Their own payout means nothing: the slip
 * pays only if every leg hits. Empty until the slips migration has run.
 */
export function parlayLegBets(db: Db, betIds: string[]): Promise<Set<string>> {
  return guard(new Set<string>(), async () => {
    if (!betIds.length) return new Set();
    const rows = await db.select({ betId: slipLegs.betId, slipId: slipLegs.slipId }).from(slipLegs).where(inArray(slipLegs.betId, betIds));
    if (!rows.length) return new Set();
    const counts = await db.select({ slipId: slipLegs.slipId, n: sql<number>`count(*)::int` }).from(slipLegs)
      .where(inArray(slipLegs.slipId, [...new Set(rows.map((r) => r.slipId))])).groupBy(slipLegs.slipId);
    const parlays = new Set(counts.filter((c) => c.n > 1).map((c) => c.slipId));
    return new Set(rows.filter((r) => r.betId && parlays.has(r.slipId)).map((r) => r.betId!));
  });
}

/**
 * Sample mode only (previews, local): a draft slip from the week's two top gems in different games, so Slips has
 * something to show. Written once per week, and never once any slip exists for it. Your own play: nothing
 * suggested it.
 */
export function seedSampleSlip(db: Db, now = new Date()): Promise<string | null> {
  return guard(null, async () => {
    const gems = await db.select({ pick: picks, game: games }).from(picks).innerJoin(games, eq(games.id, picks.gameId))
      .where(and(eq(picks.kind, 'gem'), eq(picks.bookId, PURCHASE_BOOK), gt(games.kickoffAt, now), eq(games.season, seasonOf(now))))
      .orderBy(asc(games.kickoffAt));
    const first = gems.find((g) => g.game.week != null);
    if (!first) return null;
    const week = first.game.week!;
    const [any] = await db.select({ id: slips.id }).from(slips).where(and(eq(slips.season, first.game.season), eq(slips.week, week))).limit(1);
    if (any) return null;
    const ranked = gems.filter((g) => g.game.week === week).sort((a, b) => (b.pick.recommended ?? 0) - (a.pick.recommended ?? 0));
    const legs: typeof ranked = [];
    for (const g of ranked) if (legs.length < 2 && !legs.some((l) => l.game.id === g.game.id)) legs.push(g);
    if (!legs.length) return null;
    return db.transaction(async (tx) => {
      const [slip] = await tx.insert(slips).values({ season: first.game.season, week, stake: '15.00', createdAt: now, updatedAt: now }).returning();
      await tx.insert(slipLegs).values(legs.map(({ pick }) => ({
        slipId: slip!.id, selectionKey: pick.selectionKey, gameId: pick.gameId, marketId: pick.marketId, playerId: pick.playerId,
        playerName: pick.playerName, side: pick.side, line: pick.line, bookId: pick.bookId, priceDecimal: pick.price, addedAt: now,
      })));
      return slip!.id;
    });
  });
}
