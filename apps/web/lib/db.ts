import 'server-only';
import { createDb, type Db, type DbHandle, seedReference } from '@hiddengems/db';
import { BOOTSTRAP, jobs, providersFor, runJob } from '@hiddengems/ingest';

// One handle per server process. Locally without DATABASE_URL this is PGlite, migrated and seeded on
// first use; with DATABASE_URL, migrations run explicitly (pnpm db:migrate), never on a request.
// Previews (staging and every task branch) never change a real database (owner decisions, Nov 3 2026):
// with DATABASE_URL set they read production through `hiddengems_preview`, a login that can only select,
// and every action refuses to write; without it they build an in-memory fixture from the sample provider.
const g = globalThis as typeof globalThis & { __hgDb?: Promise<DbHandle> };
const preview = process.env.VERCEL_ENV === 'preview';

/** A preview reading production: shows real data, changes nothing. */
export const READ_ONLY = preview && Boolean(process.env.DATABASE_URL);
export const READ_ONLY_MESSAGE = 'Previews show production data and cannot change it';
/** What a refused action says in its toast: an error names the cause and the way forward. */
export const READ_ONLY_REFUSAL = 'Previews can’t save changes. Make it in the live app.';

export function db(): Promise<DbHandle> {
  if (!g.__hgDb) {
    if (process.env.VERCEL && !preview && !process.env.DATABASE_URL) {
      throw new Error('Connect a Postgres database (Neon or Supabase in the Vercel Marketplace) so DATABASE_URL is set');
    }
    g.__hgDb = (async () => {
      const handle = createDb(preview && !READ_ONLY ? 'memory://' : undefined);
      if (handle.kind === 'pglite') {
        await handle.migrate();
        await seedReference(handle.db);
        if (preview) await loadFixture(handle.db);
      }
      return handle;
    })();
    // A failed start must not stick for the life of the process.
    g.__hgDb.catch(() => { g.__hgDb = undefined; });
  }
  return g.__hgDb;
}

/** The sample week: schedule, rosters, results, usage and odds (which builds the board). */
async function loadFixture(db: Db): Promise<void> {
  const providers = providersFor();
  for (const job of BOOTSTRAP) await runJob(job, { db, providers, trigger: 'manual', force: true, registry: jobs });
}
