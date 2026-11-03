// One client for every environment:
// - DATABASE_URL set (Neon, Supabase, any Postgres): postgres.js, with prepared statements off so
//   transaction-mode poolers work.
// - DATABASE_URL unset: PGlite, Postgres compiled to WebAssembly, stored in <repo>/.data/pglite.
//   PGlite allows one process at a time, so stop `pnpm dev` before running CLI jobs against it.
// - 'memory://': an in-memory PGlite for tests.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Db;
  kind: 'postgres' | 'pglite';
  migrate(): Promise<void>;
  close(): Promise<void>;
}

/** Walks up from the working directory to the repo root (the folder with pnpm-workspace.yaml). */
// Local-only paths (PGlite data, migrations): turbopackIgnore keeps Next from tracing the whole repo into the server bundle.
export function repoRoot(from = process.cwd()): string {
  let dir = resolve(/*turbopackIgnore: true*/ from);
  while (!existsSync(join(/*turbopackIgnore: true*/ dir, 'pnpm-workspace.yaml'))) {
    const up = dirname(dir);
    if (up === dir) return resolve(/*turbopackIgnore: true*/ from);
    dir = up;
  }
  return dir;
}

/** For CLI scripts: loads apps/web/.env.local, then .env at the repo root, without overriding real env vars. */
export function loadLocalEnv(): void {
  for (const file of ['apps/web/.env.local', '.env']) {
    const path = join(/*turbopackIgnore: true*/ repoRoot(), file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

export function migrationsFolder(): string {
  return join(/*turbopackIgnore: true*/ repoRoot(), 'packages/db/drizzle');
}

export function createDb(url = process.env.DATABASE_URL): DbHandle {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const sql = postgres(url, { prepare: false, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    const db = drizzlePostgres(sql, { schema, casing: 'snake_case' });
    return {
      db: db as unknown as Db,
      kind: 'postgres',
      migrate: () => migratePostgres(db, { migrationsFolder: migrationsFolder() }),
      close: () => sql.end(),
    };
  }
  const dataDir = url === 'memory://' ? undefined : (url?.replace(/^file:\/\//, '') || join(/*turbopackIgnore: true*/ repoRoot(), '.data/pglite'));
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema, casing: 'snake_case' });
  return {
    db: db as unknown as Db,
    kind: 'pglite',
    migrate: () => migratePglite(db, { migrationsFolder: migrationsFolder() }),
    close: () => client.close(),
  };
}

/**
 * Whether a query failed because its table does not exist yet (Postgres 42P01): a migration the owner has
 * not run on Supabase. Callers that read or write a new table skip it instead of failing.
 */
export function isMissingTable(err: unknown): boolean {
  for (let e = err as { code?: unknown; cause?: unknown } | undefined, depth = 0; e && depth < 5; e = e.cause as typeof e, depth++) {
    if (e.code === '42P01') return true;
  }
  return false;
}
