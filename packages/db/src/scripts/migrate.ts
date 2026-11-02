// pnpm db:migrate: applies migrations, then upserts reference data. Safe to run repeatedly.
import { createDb, loadLocalEnv } from '../client';
import { seedReference } from '../seed';

loadLocalEnv();
const handle = createDb();
const target = handle.kind === 'postgres' ? 'Postgres (DATABASE_URL)' : 'PGlite (.data/pglite)';
try {
  await handle.migrate();
  await seedReference(handle.db);
  console.log(`Migrated and seeded ${target}`);
} finally {
  await handle.close();
}
