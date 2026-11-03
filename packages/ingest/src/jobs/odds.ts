// pull-odds: anytime TD prices, only on the snapshot schedule (core snapshots.ts): the opening line,
// Saturday 7:47 PM, Sunday 8:43 AM (Denver), and a freeze just before each kickoff. Cron calls it every
// 5 minutes; outside those times it returns without calling the provider, so the free plan's 500 credits
// a month hold (about 1 credit per game per pull). History is append-only (odds_snapshots); odds_latest
// holds the current price and marks what a book stopped offering.
import { type MarketId, dueFreezes, dueSnapshot, gameId, nameKey, selectionKey } from '@hiddengems/core';
import { games, oddsLatest, oddsSlots, oddsSnapshots, players, providerRefs, providerUsage } from '@hiddengems/db';
import { and, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import { ours } from '../errors';
import type { Job } from '../runner';
import { chunks, plural, teamId } from './shared';

export const MARKETS: MarketId[] = ['anytime_td'];
const DAY = 86_400_000;
// Team defenses are priced like players by some books but are not on any roster.
const isTeamDefense = (name: string) => /\b(D\/ST|Defense)$/i.test(name.trim());

export const pullOdds: Job = {
  name: 'pull-odds',
  provider: 'odds',
  // A pull that took a snapshot or a freeze rebuilds the board, then refreshes kickoff weather (free).
  then: ['build-picks', 'pull-weather'],
  async run(ctx) {
    const { db, now } = ctx;
    const provider = ctx.providers.odds;
    const upcoming = await db.select().from(games).where(and(
      gt(games.kickoffAt, now),
      lt(games.kickoffAt, new Date(now.getTime() + 8 * DAY)),
      or(eq(games.status, 'scheduled'), eq(games.status, 'in_progress')),
    ));
    if (!upcoming.length) return { skipped: 'No games in the next 8 days. Pull the schedule if that looks wrong.' };

    // What is due. A manual pull bypasses the schedule for the sample provider, which costs nothing, or when
    // the owner confirmed the credits it spends (Data health shows the cost first).
    const taken = new Set((await db.select({ slot: oddsSlots.slot }).from(oddsSlots)).map((r) => r.slot));
    const freezes = dueFreezes(now, upcoming.map((g) => ({ id: g.id, kickoff: g.kickoffAt })), taken).map((g) => g.id);
    const snap = dueSnapshot(now, taken);
    const manual = ctx.force && (provider.id === 'sample' || ctx.spendCredits);
    const horizon = manual ? 7 : snap?.horizonDays ?? 0;
    const due = new Set([...freezes, ...upcoming.filter((g) => g.kickoffAt.getTime() - now.getTime() <= horizon * DAY).map((g) => g.id)]);
    if (!due.size) return { skipped: 'No odds snapshot or kickoff freeze is due' };

    // Never start a pull the month's credits cannot finish.
    const [usage] = await db.select().from(providerUsage).where(eq(providerUsage.provider, provider.id));
    if (usage?.remaining != null && usage.remaining < due.size) {
      throw ours('quota', `${usage.remaining} odds credits left this month, ${due.size} needed for this pull`, { provider: provider.id });
    }

    const pctx = ctx.using(provider);
    const events = await provider.events(pctx);
    const matched = events
      .map((e) => {
        const away = teamId(e.awayTeam), home = teamId(e.homeTeam);
        return away && home ? { event: e, gameId: gameId(e.kickoff, away, home), teams: [away, home] } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && due.has(m.gameId));

    const teamIds = [...new Set(matched.flatMap((m) => m.teams))];
    const roster = teamIds.length ? await db.select({ id: players.id, nameKey: players.nameKey, teamId: players.teamId }).from(players).where(inArray(players.teamId, teamIds)) : [];
    // Rows the live roster provider vouches for win when a name key is shared (sample rows beside nflverse ones).
    const rostered = new Set(roster.length
      ? (await db.select({ id: providerRefs.internalId }).from(providerRefs).where(and(
          eq(providerRefs.provider, ctx.providers.rosters.id), eq(providerRefs.entity, 'player'), inArray(providerRefs.internalId, roster.map((p) => p.id)),
        ))).map((r) => r.id)
      : []);
    const unmatched = new Set<string>();
    const duplicated = new Set<string>();
    let written = 0, priced = 0, suspended = 0;
    const books = new Set<string>();
    const pulledAt = now;

    for (const m of matched) {
      const quotes = await provider.eventOdds(pctx, m.event, MARKETS);
      const rows = quotes.map((q) => {
        let playerId: string | null = null;
        if (q.playerName && !isTeamDefense(q.playerName)) {
          // Only the two teams in this game: a namesake on a team in another game of the pull is someone else.
          const hits = roster.filter((p) => p.nameKey === nameKey(q.playerName!) && p.teamId != null && m.teams.includes(p.teamId));
          const live = hits.length > 1 ? hits.filter((p) => rostered.has(p.id)) : hits;
          if (live.length === 1) playerId = live[0]!.id;
          else if (hits.length > 1) duplicated.add(q.playerName);
          else unmatched.add(q.playerName);
        }
        books.add(q.bookId);
        const playerKey = playerId ?? (q.playerName ? `name:${nameKey(q.playerName)}` : null);
        return {
          runId: ctx.runId,
          selectionKey: selectionKey({ gameId: m.gameId, marketId: q.marketId, playerId: playerKey, side: q.side, line: q.line }),
          gameId: m.gameId, marketId: q.marketId, playerId, playerName: q.playerName, side: q.side, line: q.line,
          bookId: q.bookId, priceDecimal: q.priceDecimal, observedAt: q.observedAt, pulledAt, link: q.link,
        };
      });
      priced += rows.length;
      for (const batch of chunks(rows)) {
        const inserted = await db.insert(oddsSnapshots).values(batch.map(({ link: _l, ...r }) => r)).onConflictDoNothing().returning({ id: oddsSnapshots.id });
        written += inserted.length;
        await db.insert(oddsLatest).values(batch.map(({ runId: _r, ...r }) => ({ ...r, available: true }))).onConflictDoUpdate({
          target: [oddsLatest.selectionKey, oddsLatest.bookId],
          set: { priceDecimal: sql`excluded.price_decimal`, observedAt: sql`excluded.observed_at`, pulledAt: sql`excluded.pulled_at`, playerId: sql`excluded.player_id`, link: sql`excluded.link`, available: true },
        });
      }
      // Whatever this game's books no longer list is suspended.
      const gone = await db.update(oddsLatest).set({ available: false })
        .where(and(eq(oddsLatest.gameId, m.gameId), inArray(oddsLatest.marketId, MARKETS), lt(oddsLatest.pulledAt, pulledAt), eq(oddsLatest.available, true)))
        .returning({ key: oddsLatest.selectionKey });
      suspended += gone.length;
      await db.insert(providerRefs).values({ provider: provider.id, entity: 'game', externalId: m.event.externalId, internalId: m.gameId })
        .onConflictDoUpdate({ target: [providerRefs.provider, providerRefs.entity, providerRefs.externalId], set: { internalId: m.gameId } });
    }

    // Record the slots so none repeats, matched or not: a game with no odds event costs nothing to skip.
    const slots = [
      ...(snap ? [{ slot: snap.slot, runId: ctx.runId, games: matched.length, pulledAt }] : []),
      ...freezes.map((id) => ({ slot: `freeze:${id}`, runId: ctx.runId, games: 1, pulledAt })),
    ];
    if (slots.length) await db.insert(oddsSlots).values(slots).onConflictDoNothing();

    const missing = [...due].filter((id) => !matched.some((m) => m.gameId === id));
    if (missing.length) ctx.log('warn', `${plural(missing.length, 'game')} on the schedule had no odds event`, { gameIds: missing });
    if (duplicated.size) ctx.log('warn', `${plural(duplicated.size, 'player')} matched more than one roster row. Remove the duplicate rows.`, { names: [...duplicated].slice(0, 25) });
    if (unmatched.size) ctx.log('warn', `${plural(unmatched.size, 'player')} did not match a roster. Pull rosters, or add an alias.`, { names: [...unmatched].slice(0, 25) });
    const what = [snap?.slot.split(':')[0], freezes.length ? `${plural(freezes.length, 'freeze')}` : null, manual ? 'manual' : null].filter(Boolean).join(' and ');
    return {
      message: `Pulled ${plural(priced, 'price')} across ${plural(books.size, 'book')} for ${plural(matched.length, 'game')} (${what}), ${written} new, ${suspended} suspended`,
      rowsWritten: written,
      meta: { slots: slots.map((s) => s.slot), games: matched.map((m) => m.gameId), unmatched: unmatched.size, duplicated: duplicated.size },
    };
  },
};
