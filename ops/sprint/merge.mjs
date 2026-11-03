#!/usr/bin/env node
// Builds the sprint branch: sprint/<id> from origin/staging, then every `ready` entry's branch merged in
// file-group order with a merge commit. A branch that conflicts is aborted and its entry marked `dropped`.
// Usage: node ops/sprint/merge.mjs <sprint-id>     Updates ops/sprint/sprints/<id>.json in place; does not push.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const id = process.argv[2];
if (!id) { console.error('Usage: node ops/sprint/merge.mjs <sprint-id>'); process.exit(2); }
const file = `ops/sprint/sprints/${id}.json`;
if (!existsSync(file)) { console.error(`No sprint file at ${file}`); process.exit(2); }

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sprintJson = readFileSync(file, 'utf8');
const sprint = JSON.parse(sprintJson);
const ready = sprint.entries.filter((e) => e.status === 'ready' && e.branch);
ready.sort((a, b) => String(a.fileGroup).localeCompare(String(b.fileGroup)) || String(a.id).localeCompare(String(b.id)));

git('fetch', 'origin', 'staging', ...ready.map((e) => e.branch));
git('checkout', '-B', `sprint/${id}`, 'origin/staging');

const lines = [];
for (const e of ready) {
  try {
    git('merge', '--no-ff', '-m', `Merge ${e.branch} (${e.id})`, `origin/${e.branch}`);
    e.merged = git('rev-parse', `origin/${e.branch}`);
    lines.push(`merged   ${e.id}  ${e.branch}`);
  } catch (err) {
    try { git('merge', '--abort'); } catch {}
    const files = String(err.stdout || '').split('\n').filter((l) => l.startsWith('CONFLICT')).join('; ');
    e.status = 'dropped';
    e.reason = `Merge conflict on the sprint branch${files ? `: ${files}` : ''}`;
    lines.push(`DROPPED  ${e.id}  ${e.branch}  (conflict)`);
  }
}

sprint.sprintBranch = `sprint/${id}`;
writeFileSync(file, JSON.stringify(sprint, null, 2) + '\n');
console.log(lines.join('\n') || 'No ready entries.');
console.log(`\nOn sprint/${id}. Commit ${file}, run the checks, then push.`);
