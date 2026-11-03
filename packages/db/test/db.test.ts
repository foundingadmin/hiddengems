import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq, sql } from 'drizzle-orm';
import { books, createDb, games, markets, oddsSnapshots, seedReference, teams } from '../src';

const handle = createDb('memory://');

beforeAll(async () => {
  await handle.migrate();
  await seedReference(handle.db);
});
afterAll(() => handle.close());

describe('database', () => {
  it('migrates and seeds reference data', async () => {
    const [t] = await handle.db.select({ n: count() }).from(teams);
    const [b] = await handle.db.select({ n: count() }).from(books);
    const [m] = await handle.db.select({ n: count() }).from(markets);
    expect(t?.n).toBe(32);
    expect(b?.n).toBe(5);
    expect(m?.n).toBe(1); // anytime TD only this season
  });
  it('seeds idempotently', async () => {
    await seedReference(handle.db);
    const [t] = await handle.db.select({ n: count() }).from(teams);
    expect(t?.n).toBe(32);
  });

  it('refuses to update, delete or truncate history', async () => {
    const at = new Date('2026-11-08T18:00:00Z');
    await handle.db.insert(games).values({ id: '2026-11-08-mia-buf', season: 2026, week: 10, kickoffAt: at, awayTeamId: 'mia', homeTeamId: 'buf' });
    await handle.db.insert(oddsSnapshots).values({
      runId: 'r1', selectionKey: 'k', gameId: '2026-11-08-mia-buf', marketId: 'anytime_td', side: 'yes', bookId: 'draftkings', priceDecimal: 2.6, observedAt: at, pulledAt: at,
    });
    await expect(handle.db.update(oddsSnapshots).set({ priceDecimal: 9 })).rejects.toThrow();
    await expect(handle.db.delete(oddsSnapshots).where(eq(oddsSnapshots.selectionKey, 'k'))).rejects.toThrow();
    await expect(handle.db.execute(sql`truncate odds_snapshots`)).rejects.toThrow();
    const [n] = await handle.db.select({ n: count() }).from(oddsSnapshots);
    expect(n?.n).toBe(1);
  });
});
