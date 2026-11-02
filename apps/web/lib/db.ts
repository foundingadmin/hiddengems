import 'server-only';
import { createDb, type DbHandle, seedReference } from '@hiddengems/db';

// One handle per server process. Locally without DATABASE_URL this is PGlite, migrated and seeded on
// first use; with DATABASE_URL, migrations run explicitly (pnpm db:migrate), never on a request.
const g = globalThis as typeof globalThis & { __hgDb?: Promise<DbHandle> };

export function db(): Promise<DbHandle> {
  if (!g.__hgDb) {
    if (process.env.VERCEL && !process.env.DATABASE_URL) {
      throw new Error('Connect a Postgres database (Neon or Supabase in the Vercel Marketplace) so DATABASE_URL is set');
    }
    g.__hgDb = (async () => {
      const handle = createDb();
      if (handle.kind === 'pglite') {
        await handle.migrate();
        await seedReference(handle.db);
      }
      return handle;
    })();
  }
  return g.__hgDb;
}
