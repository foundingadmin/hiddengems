#!/usr/bin/env node
// House writing rules that a script can check (AGENTS.md, "Writing style"), on the lines a branch adds:
//   1. no em dashes, in any text file and in commit messages;
//   2. no colons in headings (Markdown headings and JSX <h1> to <h6>);
//   3. sentence case in headings: after the first word, only proper nouns, acronyms and code are capitalised.
// Usage: node ops/sprint/lint-words.mjs [base]   (base defaults to origin/staging; compares base...HEAD)
// Proper nouns live in ops/sprint/proper-nouns.txt, one per line.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] || 'origin/staging';
const here = dirname(fileURLToPath(import.meta.url));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const EM = '—';
const TEXT = /\.(md|mdx|ts|tsx|js|jsx|mjs|cjs|css|json|html|yml|yaml|txt|sql|py)$/;
const SKIP = [/^docs\/archive\//, /^packages\/facet\/reference\//, /^pnpm-lock\.yaml$/, /^packages\/db\/drizzle\/meta\//, /^ops\/sprint\/lint-words\.mjs$/];
const nouns = new Set(
  readFileSync(join(here, 'proper-nouns.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
);

const problems = [];
const add = (where, rule, text) => problems.push(`${where}  ${rule}: ${text.trim().slice(0, 120)}`);

// Strip what is not prose: inline code, JSX expressions, tags, links' targets.
const prose = (s) => s.replace(/`[^`]*`/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\]\([^)]*\)/g, ']');

function checkHeading(where, raw) {
  const text = prose(raw).replace(/[*_[\]]/g, ' ').trim();
  if (!text) return;
  if (/:(\s|$)/.test(text)) add(where, 'colon in heading', raw);
  const words = text.split(/\s+/).filter(Boolean);
  // Skip a leading number or step marker ("1.", "Step 2") when finding the first word.
  let first = words.findIndex((w) => /[A-Za-z]/.test(w) && !/^\d/.test(w));
  for (let i = first + 1; i < words.length; i++) {
    const w = words[i].replace(/^[("'‘“]+|[)"',.;!?’”]+$/g, '');
    if (!/^[A-Z]/.test(w)) continue;
    if (/^[A-Z0-9&/.-]+$/.test(w) && w.length > 1) continue; // acronym: API, CI, DS, NFL, TD
    if (/[0-9]/.test(w) || /[a-z][A-Z]/.test(w) || w.includes('.')) continue; // v3, GitHub, Next.js
    const bare = w.replace(/'s$|’s$/, '');
    if (nouns.has(w) || nouns.has(bare)) continue;
    if (/^[-–]+$/.test(words[i - 1] || '')) continue; // a new clause after a dash separator
    add(where, 'sentence case', `"${w}" in: ${raw}`);
    break;
  }
}

// 1. Commit messages.
for (const msg of git('log', `${base}..HEAD`, '--format=%H%x00%B%x01').split('\x01')) {
  const [sha, body] = msg.split('\x00');
  if (body && body.includes(EM)) add(`commit ${sha.trim().slice(0, 8)}`, 'em dash', body.split('\n').find((l) => l.includes(EM)) || '');
}

// 2. Added lines.
const diff = git('diff', '--unified=0', '--no-color', '--diff-filter=AM', `${base}...HEAD`);
let file = null;
let line = 0;
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ ')) {
    file = l.startsWith('+++ b/') ? l.slice(6) : null;
    if (file && (!TEXT.test(file) || SKIP.some((r) => r.test(file)))) file = null;
    continue;
  }
  const hunk = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunk) { line = Number(hunk[1]); continue; }
  if (!file || !l.startsWith('+') || l.startsWith('+++')) continue;
  const text = l.slice(1);
  const where = `${file}:${line}`;
  if (text.includes(EM)) add(where, 'em dash', text);
  if (/\.mdx?$/.test(file)) {
    const h = text.match(/^#{1,6}\s+(.*)$/);
    if (h) checkHeading(where, h[1]);
  }
  if (/\.(tsx|jsx|html)$/.test(file)) {
    for (const m of text.matchAll(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/g)) checkHeading(where, m[1]);
  }
  line++;
}

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} writing rule problem(s). See AGENTS.md, "Writing style". Proper nouns: ops/sprint/proper-nouns.txt`);
  process.exit(1);
}
