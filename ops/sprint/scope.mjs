#!/usr/bin/env node
// Which review sections a sprint branch needs, from the paths it changes. No judgement: the paths decide.
// Usage: node ops/sprint/scope.mjs [base] [head]   (defaults origin/staging and HEAD)
import { execFileSync } from 'node:child_process';

const base = process.argv[2] || 'origin/staging';
const head = process.argv[3] || 'HEAD';
const files = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean);

const SECTIONS = [
  ['Words', [/\.(md|mdx)$/, /^apps\/web\/.*\.(tsx|ts)$/, /^packages\/facet\//]],
  ['Design', [/^apps\/web\/(app|components)\/.*\.(tsx|css)$/, /^apps\/web\/app\/.*\.css$/, /^packages\/facet\//]],
  ['Data safety', [/^packages\/db\//, /^packages\/ingest\//, /^apps\/web\/app\/api\//, /^apps\/web\/lib\//, /^apps\/web\/app\/.*actions\.ts$/, /^apps\/web\/vercel\.json$/, /\.env/]],
  ['Model', [/^packages\/core\//, /^packages\/ingest\/src\/jobs\/picks\.ts$/]],
];

const out = SECTIONS.map(([name, rules]) => [name, files.filter((f) => rules.some((r) => r.test(f)))]).filter(([, hit]) => hit.length);
if (!out.length) { console.log('No review sections apply.'); process.exit(0); }
for (const [name, hit] of out) console.log(`${name}: ${hit.length} file(s)\n  ${hit.slice(0, 12).join('\n  ')}${hit.length > 12 ? '\n  ...' : ''}`);
