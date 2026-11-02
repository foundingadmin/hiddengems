// pnpm job <name> [--force]   runs one job against DATABASE_URL (or the local PGlite)
// pnpm job all                 runs the bootstrap order: schedule, rosters, odds (and picks), results
// pnpm job snapshot [dir]      writes slate.json and health.json (the artifact host reads these)
// pnpm job list                lists jobs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb, type Db, loadLocalEnv, seedReference } from '@hiddengems/db';
import { BOOTSTRAP, jobs } from './jobs';
import { dataMode, providersFor } from './providers';
import { type RunResult, runJob } from './runner';
import { buildSnapshots } from './snapshot';

const [name = 'list', ...flags] = process.argv.slice(2);
if (name === 'list') {
  console.log(Object.keys(jobs).join('\n'));
  process.exit(0);
}

const print = (r: RunResult, indent = '') => {
  console.log(`${indent}${r.job}: ${r.status} in ${r.durationMs}ms. ${r.message}`);
  for (const f of r.followUps ?? []) print(f, `${indent}  `);
};

async function snapshot(db: Db, dir: string): Promise<void> {
  const { slate, health } = await buildSnapshots(db, dataMode());
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'slate.json'), JSON.stringify(slate));
  writeFileSync(join(dir, 'health.json'), JSON.stringify(health));
  console.log(`Wrote ${slate.picks.length} picks and ${health.runs.length} runs to ${dir}`);
}

async function runJobs(db: Db): Promise<boolean> {
  const providers = providersFor();
  let ok = true;
  for (const job of name === 'all' ? BOOTSTRAP : [name]) {
    const result = await runJob(job, { db, providers, trigger: 'cli', force: flags.includes('--force') || name === 'all', registry: jobs });
    print(result);
    if (result.status === 'failed') ok = false;
  }
  return ok;
}

loadLocalEnv();
const handle = createDb();
let ok = true;
try {
  await handle.migrate();
  await seedReference(handle.db);
  console.log(`Data mode: ${dataMode()}, database: ${handle.kind}`);
  if (name === 'snapshot') await snapshot(handle.db, flags[0] ?? '.data/snapshot');
  else ok = await runJobs(handle.db);
} finally {
  await handle.close();
}
process.exit(ok ? 0 : 1);
