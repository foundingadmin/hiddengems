// pull-odds: prices for upcoming games. Cron calls it every 5 minutes; each game is pulled on its own
// cadence (core oddsIntervalMinutes), so quiet games spend no quota. History is append-only
// (odds_snapshots); odds_latest holds the current price and marks what a book stopped offering.
import { type MarketId, gameId, isOddsPullDue, marketById, nameKey, selectionKey } from '@hiddengems/core';
import { games, oddsLatest, oddsSnapshots, players, providerRefs } from '@hiddengems/db';
import { and, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import type { Job } from '../runner';
import { chunks, plural, teamId } from './shared';

export const DEFAULT_MARKETS: MarketId[] = ['anytime_td', 'receptions'];

export function marketsFromEnv(value = process.env.ODDS_MARKETS): MarketId[] {
  if (!value) return DEFAULT_MARKETS;
  const ids = value.split(',').map((s) => s.trim()).filter((s): s is MarketId => Boolean(marketById(s)));
  return ids.length ? ids : DEFAULT_MARKETS;
}

export const pullOdds: Job = {
  name: 'pull-odds',
  provider: 'odds',
  then: ['build-picks'],
  async run(ctx) {
    const { db, now } = ctx;
    const markets = marketsFromEnv();
    const upcoming = await db.select().from(games).where(and(
      gt(games.kickoffAt, now),
      lt(games.kickoffAt, new Date(now.getTime() + 8 * 86_400_000)),
      or(eq(games.status, 'scheduled'), eq(games.status, 'in_progress')),
    ));
    if (!upcoming.length) return { skipped: 'No games in the next 8 days. Pull the schedule if that looks wrong.' };

    const due = ctx.force ? upcoming : upcoming.filter((g) => isOddsPullDue({ now, kickoffs: [g.kickoffAt], lastSuccessAt: g.oddsPulledAt }));
    if (!due.length) return { skipped: 'No game is due for a pull yet' };

    const provider = ctx.providers.odds;
    const pctx = ctx.using(provider);
    const events = await provider.events(pctx);
    const dueIds = new Set(due.map((g) => g.id));
    const matched = events
      .map((e) => {
        const away = teamId(e.awayTeam), home = teamId(e.homeTeam);
        return away && home ? { event: e, gameId: gameId(e.kickoff, away, home), teams: [away, home] } : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && dueIds.has(m.gameId));

    const teamIds = [...new Set(matched.flatMap((m) => m.teams))];
    const roster = teamIds.length ? await db.select({ id: players.id, nameKey: players.nameKey, teamId: players.teamId }).from(players).where(inArray(players.teamId, teamIds)) : [];
    const unmatched = new Set<string>();
    let written = 0, priced = 0, suspended = 0;
    const books = new Set<string>();

    for (const m of matched) {
      const quotes = await provider.eventOdds(pctx, m.event, markets);
      const pulledAt = ctx.now;
      const rows = quotes.map((q) => {
        let playerId: string | null = null;
        if (q.playerName) {
          const key = nameKey(q.playerName);
          const hits = roster.filter((p) => p.nameKey === key);
          if (hits.length === 1) playerId = hits[0]!.id;
          else unmatched.add(q.playerName);
        }
        books.add(q.bookId);
        const playerKey = playerId ?? (q.playerName ? `name:${nameKey(q.playerName)}` : null);
        return {
          runId: ctx.runId,
          selectionKey: selectionKey({ gameId: m.gameId, marketId: q.marketId, playerId: playerKey, side: q.side, line: q.line }),
          gameId: m.gameId, marketId: q.marketId, playerId, playerName: q.playerName, side: q.side, line: q.line,
          bookId: q.bookId, priceDecimal: q.priceDecimal, observedAt: q.observedAt, pulledAt,
        };
      });
      priced += rows.length;
      for (const batch of chunks(rows)) {
        const inserted = await db.insert(oddsSnapshots).values(batch).onConflictDoNothing().returning({ id: oddsSnapshots.id });
        written += inserted.length;
        await db.insert(oddsLatest).values(batch.map(({ runId: _r, ...r }) => ({ ...r, available: true }))).onConflictDoUpdate({
          target: [oddsLatest.selectionKey, oddsLatest.bookId],
          set: { priceDecimal: sql`excluded.price_decimal`, observedAt: sql`excluded.observed_at`, pulledAt: sql`excluded.pulled_at`, playerId: sql`excluded.player_id`, available: true },
        });
      }
      // Whatever this game's books no longer list in the pulled markets is suspended.
      const gone = await db.update(oddsLatest).set({ available: false })
        .where(and(eq(oddsLatest.gameId, m.gameId), inArray(oddsLatest.marketId, markets), lt(oddsLatest.pulledAt, pulledAt), eq(oddsLatest.available, true)))
        .returning({ key: oddsLatest.selectionKey });
      suspended += gone.length;
      await db.update(games).set({ oddsPulledAt: pulledAt }).where(eq(games.id, m.gameId));
      await db.insert(providerRefs).values({ provider: provider.id, entity: 'game', externalId: m.event.externalId, internalId: m.gameId })
        .onConflictDoUpdate({ target: [providerRefs.provider, providerRefs.entity, providerRefs.externalId], set: { internalId: m.gameId } });
    }

    const missing = due.filter((g) => !matched.some((m) => m.gameId === g.id));
    if (missing.length) ctx.log('warn', `${plural(missing.length, 'game')} on the schedule had no odds event`, { gameIds: missing.map((g) => g.id) });
    if (unmatched.size) ctx.log('warn', `${plural(unmatched.size, 'player')} did not match a roster. Pull rosters, or add an alias.`, { names: [...unmatched].slice(0, 25) });
    return {
      message: `Pulled ${plural(priced, 'price')} across ${plural(books.size, 'book')} for ${plural(matched.length, 'game')}, ${written} new, ${suspended} suspended`,
      rowsWritten: written,
      meta: { markets, games: matched.map((m) => m.gameId), unmatched: unmatched.size },
    };
  },
};
