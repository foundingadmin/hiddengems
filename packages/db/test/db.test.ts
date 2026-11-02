import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count } from 'drizzle-orm';
import { books, createDb, markets, seedReference, teams } from '../src';

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
    expect(b?.n).toBeGreaterThanOrEqual(3);
    expect(m?.n).toBeGreaterThanOrEqual(5);
  });
  it('seeds idempotently', async () => {
    await seedReference(handle.db);
    const [t] = await handle.db.select({ n: count() }).from(teams);
    expect(t?.n).toBe(32);
  });
});
