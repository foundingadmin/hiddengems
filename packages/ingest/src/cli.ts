// pnpm job <name> [--force]   runs one job against DATABASE_URL (or the local PGlite)
// pnpm job all                 runs the bootstrap order: schedule, rosters, odds (and picks), results
// pnpm job list                lists jobs
import { createDb, loadLocalEnv, seedReference } from '@hiddengems/db';
import { BOOTSTRAP, jobs } from './jobs';
import { dataMode, providersFor } from './providers';
import { type RunResult, runJob } from './runner';

const [name = 'list', ...flags] = process.argv.slice(2);
if (name === 'list') {
  console.log(Object.keys(jobs).join('\n'));
  process.exit(0);
}

loadLocalEnv();
const handle = createDb();
const print = (r: RunResult, indent = '') => {
  console.log(`${indent}${r.job}: ${r.status} in ${r.durationMs}ms. ${r.message}`);
  for (const f of r.followUps ?? []) print(f, `${indent}  `);
};
let failed = false;
try {
  await handle.migrate();
  await seedReference(handle.db);
  console.log(`Data mode: ${dataMode()}, database: ${handle.kind}`);
  const providers = providersFor();
  for (const job of name === 'all' ? BOOTSTRAP : [name]) {
    const result = await runJob(job, { db: handle.db, providers, trigger: 'cli', force: flags.includes('--force') || name === 'all', registry: jobs });
    print(result);
    if (result.status === 'failed') failed = true;
  }
} finally {
  await handle.close();
}
process.exit(failed ? 1 : 0);
