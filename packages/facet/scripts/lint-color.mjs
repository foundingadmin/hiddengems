#!/usr/bin/env node
// Facet color guard. Enforces the hue allocation in DESIGN.md:
// product code expresses color through the semantic token for its job (--fc-*),
// never through a hue primitive or a raw color value.
//
//   node packages/facet/scripts/lint-color.mjs [dir ...]     (default: apps)
//
// Flags, per line:
//   1. Hue primitives:   var(--ds-purple-700), --ds-green-900 ...  (gray is allowed)
//   2. Tailwind hue utilities: bg-purple-700, text-red-900, border-amber-400 ...
//   3. Raw colors: #hex, rgb(), rgba(), hsl(), hsla(), oklch(), lab()
// Purple is the strictest case: it is only reachable through --fc-gem-* / fc-gem-* utilities.
// Escape hatch for a reviewed exception: put `facet-allow-color: <reason>` on the same line.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['apps'];
const EXT = new Set(['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.html', '.svelte', '.vue', '.mdx']);
const SKIP = new Set(['node_modules', '.next', '.turbo', 'dist', 'build', '.vercel', 'coverage']);
const HUES = 'blue|red|amber|green|teal|purple|pink';
const rules = [
  { re: new RegExp(`--ds-(${HUES})-\\d{3,4}`, 'g'), why: 'hue primitive; use the semantic --fc-* token for this job' },
  { re: new RegExp(`\\b(?:bg|text|border|ring|outline|fill|stroke|decoration|from|via|to|shadow|accent|caret|divide|placeholder)-(${HUES})-\\d{3,4}\\b`, 'g'), why: 'Tailwind hue utility; use the fc-* semantic utility for this job' },
  { re: /(?<![\w-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g, why: 'raw hex color; use a token' },
  { re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g, why: 'raw color function; use a token' },
];

const files = [];
const walk = (p) => {
  let st;
  try { st = statSync(p); } catch { return; }
  if (st.isDirectory()) { for (const f of readdirSync(p)) if (!SKIP.has(f)) walk(join(p, f)); }
  else if (EXT.has(extname(p))) files.push(p);
};
roots.forEach(walk);

let problems = 0;
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('facet-allow-color')) return;
    for (const { re, why } of rules) {
      for (const m of line.matchAll(re)) {
        // An HTML entity or URL fragment like href="#top" is not a color.
        if (m[0].startsWith('#') && /(href|id|to)=["'][^"']*$/.test(line.slice(0, m.index))) continue;
        problems++;
        const purple = /purple/.test(m[0]) ? ' (purple is reserved for gems: use --fc-gem-*)' : '';
        console.log(`${relative(process.cwd(), f)}:${i + 1}  ${m[0]}  ${why}${purple}`);
      }
    }
  });
}
console.log(problems ? `\n${problems} color rule violation(s). See packages/facet/DESIGN.md, "Hue allocation".` : `Color guard: ${files.length} file(s) clean.`);
process.exit(problems ? 1 : 0);
