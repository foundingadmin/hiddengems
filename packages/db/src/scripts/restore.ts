// pnpm db:restore <backup.json.gz>: loads a nightly backup into the database at DATABASE_URL (or local
// PGlite). Migrate an empty database first (the Supabase setup script, or pnpm db:migrate locally).
import { readFileSync } from 'node:fs';
import { createDb, loadLocalEnv } from '../client';
import { restoreDatabase, unpackBackup } from '../backup';

loadLocalEnv();
const file = process.argv[2];
if (!file) { console.error('Usage: pnpm db:restore <backup.json.gz>'); process.exit(1); }
const handle = createDb();
try {
  const backup = unpackBackup(readFileSync(file));
  const counts = await restoreDatabase(handle.db, backup);
  console.log(`Restored backup taken ${backup.takenAt}:`, counts);
} finally {
  await handle.close();
}
