#!/usr/bin/env node
// Fails when a migration could destroy data: dropping a table, column, schema or database, truncating,
// or deleting rows. A deliberate one passes only with `-- destructive-approved: <reason>` on its line,
// so it is visible in review. Runs in `pnpm check` and CI.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../drizzle');
const DESTRUCTIVE = /\bDROP\s+(TABLE|SCHEMA|DATABASE|COLUMN|OWNED)\b|\bALTER\s+TABLE\s+\S+\s+DROP\b|(^|;)\s*(TRUNCATE|DELETE\s+FROM)\b/i;
const problems = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  readFileSync(join(dir, file), 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/--.*$/, '');
    if (DESTRUCTIVE.test(code) && !/--\s*destructive-approved:\s*\S/.test(line)) problems.push(`${file}:${i + 1}  ${line.trim()}`);
  });
}
if (problems.length) {
  console.error(`Destructive migration statement(s). Rewrite them, or mark a reviewed one with "-- destructive-approved: <reason>":\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('Migration guard: no destructive statements.');
