import { PGlite } from '@electric-sql/pglite';
import { afterAll, describe, expect, it, vi } from 'vitest';

// Each test boots one or two in-memory Postgres databases and migrates them, which is slow under load.
vi.setConfig({ testTimeout: 30_000 });
import { count, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import {
  bets, buildSupabaseSql, createDb, dumpDatabase, games, migrationSql, migrationStatements, migrationsFolder, oddsSnapshots, packBackup, restoreDatabase, seedReference, teams, unpackBackup,
} from '../src';

const handles: ReturnType<typeof createDb>[] = [];
const fresh = () => { const h = createDb('memory://'); handles.push(h); return h; };
afterAll(async () => { for (const h of handles) await h.close(); });

describe('Supabase setup script', () => {
  it('builds the same database as pnpm db:migrate, and migrate agrees nothing is left to run', async () => {
    const client = new PGlite();
    await client.exec(migrationSql());
    await client.exec(migrationSql()); // safe to run again
    const db = drizzle(client, { casing: 'snake_case' });
    await migrate(db, { migrationsFolder: migrationsFolder() }); // drizzle sees every migration as applied
    const [t] = await db.select({ n: count() }).from(teams);
    expect(t!.n).toBe(32);
    const recorded = await client.query<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations');
    expect(recorded.rows[0]!.n).toBe(migrationStatements().length);
    await client.close();
  });

  it('only takes a password that needs no escaping, and never prints it without asking', () => {
    expect(() => buildSupabaseSql({ appPassword: "short'" })).toThrow();
    const plain = buildSupabaseSql();
    expect(plain).not.toContain('CREATE ROLE hiddengems_app');
    expect(plain).not.toMatch(/PASSWORD '/);
    // The preview login exists without a password and can only read.
    expect(plain).toContain('CREATE ROLE hiddengems_preview NOLOGIN');
    expect(plain).toContain('ALTER ROLE hiddengems_preview SET default_transaction_read_only = on');
    expect(plain).not.toMatch(/GRANT (?!USAGE ON SCHEMA|SELECT ON)[^;]*TO hiddengems_preview/);
    const withRole = buildSupabaseSql({ appPassword: 'A'.repeat(32) });
    expect(withRole).toContain('CREATE ROLE hiddengems_app LOGIN');
    expect(withRole).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated');
    expect(withRole).not.toMatch(/GRANT[^;]*(TRUNCATE|ALL PRIVILEGES)/);
  });
});

describe('backup and restore', () => {
  it('round-trips every table into an empty database', async () => {
    const src = fresh();
    await src.migrate();
    await seedReference(src.db);
    const at = new Date('2026-11-08T18:00:00Z');
    await src.db.insert(games).values({ id: '2026-11-08-mia-buf', season: 2026, week: 10, kickoffAt: at, awayTeamId: 'mia', homeTeamId: 'buf' });
    await src.db.insert(oddsSnapshots).values({ runId: 'r', selectionKey: 'k', gameId: '2026-11-08-mia-buf', marketId: 'anytime_td', side: 'yes', bookId: 'draftkings', priceDecimal: 2.6, observedAt: at, pulledAt: at });
    await src.db.insert(bets).values({ selectionKey: 'k', gameId: '2026-11-08-mia-buf', marketId: 'anytime_td', side: 'yes', bookId: 'draftkings', priceDecimal: 2.6, stake: '10.00', placedAt: at } as typeof bets.$inferInsert);

    const backup = unpackBackup(packBackup(await dumpDatabase(src.db)));
    const dst = fresh();
    await dst.migrate();
    const restored = await restoreDatabase(dst.db, backup);
    expect(restored.teams).toBe(32);
    const [s] = await dst.db.select().from(oddsSnapshots);
    expect(s!.observedAt.toISOString()).toBe(at.toISOString());
    const [b] = await dst.db.select({ n: count() }).from(bets);
    expect(b!.n).toBe(1);
  });

  it('keeps backing up before the owner runs a migration that adds a table', async () => {
    const src = fresh();
    await src.migrate();
    await seedReference(src.db);
    await src.db.execute(sql`drop table provider_caps`); // as if migration 0006 had not run yet
    const backup = await dumpDatabase(src.db);
    expect(backup.tables.teams).toHaveLength(32);
    expect(backup.tables).not.toHaveProperty('provider_caps');
    const dst = fresh();
    await dst.migrate();
    expect((await restoreDatabase(dst.db, backup)).provider_caps).toBe(0);
  });
});
