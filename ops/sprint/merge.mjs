#!/usr/bin/env node
// Builds the sprint branch: sprint/<id> from origin/staging, then every `ready` entry's branch merged in
// file-group order with a merge commit. A branch that conflicts is aborted and its entry marked `dropped`.
// Usage: node ops/sprint/merge.mjs <sprint-id> [--drop <entry-id>[,<entry-id>] --reason "<why>"]
// --drop marks those entries dropped first, so the sprint branch is rebuilt without them.
// --branch <name> builds under another name (sprint/<id>-2) when the first one was already pushed.
// Updates ops/sprint/sprints/<id>.json in place; does not push.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const id = args[0];
const flag = (name) => { const i = args.indexOf(name); return i > 0 ? args[i + 1] : undefined; };
const toDrop = (flag('--drop') || '').split(',').map((x) => x.trim()).filter(Boolean);
const dropReason = flag('--reason') || 'Dropped by the sprint session';
const branch = flag('--branch') || `sprint/${id}`;
if (!id) { console.error('Usage: node ops/sprint/merge.mjs <sprint-id>'); process.exit(2); }
const file = `ops/sprint/sprints/${id}.json`;
if (!existsSync(file)) { console.error(`No sprint file at ${file}`); process.exit(2); }

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sprintJson = readFileSync(file, 'utf8');
const sprint = JSON.parse(sprintJson);
for (const e of sprint.entries) {
  if (toDrop.includes(e.id)) { e.status = 'dropped'; e.reason = dropReason; }
}
const unknown = toDrop.filter((d) => !sprint.entries.some((e) => e.id === d));
if (unknown.length) { console.error(`No entry ${unknown.join(', ')} in ${file}`); process.exit(2); }
const ready = sprint.entries.filter((e) => e.status === 'ready' && e.branch);
ready.sort((a, b) => String(a.fileGroup).localeCompare(String(b.fileGroup)) || String(a.id).localeCompare(String(b.id)));

git('fetch', 'origin', 'staging', ...ready.map((e) => e.branch));
git('checkout', '-B', branch, 'origin/staging');

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

sprint.sprintBranch = branch;
writeFileSync(file, JSON.stringify(sprint, null, 2) + '\n');
console.log(lines.join('\n') || 'No ready entries.');
console.log(`\nOn ${branch}. Commit ${file}, run the checks, then push.`);
