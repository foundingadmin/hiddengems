#!/usr/bin/env node
// Re-sync Facet's primitive layer from the live reference design system on vercel.com.
//
//   node scripts/sync-primitives.mjs        (needs `playwright` + a Chromium)
//   node scripts/build.mjs
//
// What it does:
//   1. Opens https://vercel.com/geist/colors in light and dark color schemes.
//   2. Reads the computed value of every --ds-* color (sRGB), shadow and
//      the P3 oklch overrides from the production stylesheets.
//   3. Reads the .text-* type roles from the same stylesheets.
//   4. Writes reference/geist-computed-<date>.json, reference/geist-p3-oklch-<date>.json
//      and regenerates tokens/primitives.tokens.json (colors + shadows only; it keeps the
//      hand-curated font/space/radius/size/z/motion sections) and tokens/typography.tokens.json.
// Review the git diff afterwards: an upstream change is a design decision, not a silent update.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);
import { createRequire } from 'node:module';
// createRequire also finds a globally installed playwright, which ESM import() does not.
const { chromium } = createRequire(import.meta.url)('playwright');

const browser = await chromium.launch();
const capture = {};
let cssText = '';
let p3 = { light: {}, dark: {} };
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto('https://vercel.com/geist/colors', { waitUntil: 'networkidle', timeout: 60000 });
  const res = await page.evaluate(() => {
    const names = new Set();
    let text = '';
    for (const sh of document.styleSheets) {
      try {
        for (const r of sh.cssRules) {
          text += r.cssText + '\n';
          (r.cssText.match(/--ds-[a-z0-9-]+(?=\s*:)/g) || []).forEach((n) => names.add(n));
        }
      } catch {}
    }
    const cs = getComputedStyle(document.documentElement);
    const raw = {};
    [...names].forEach((n) => (raw[n] = cs.getPropertyValue(n).trim()));
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const rgb = {};
    [...names]
      .filter((n) => /-(gray|blue|red|amber|green|teal|purple|pink|background)(-alpha)?-\d+$/.test(n))
      .forEach((n) => { probe.style.color = `var(${n})`; rgb[n] = getComputedStyle(probe).color; });
    // P3 overrides: walk @media (color-gamut: p3) > @supports > style rules.
    const p3 = { light: {}, dark: {} };
    const walk = (rules, inP3) => {
      for (const r of rules) {
        const isP3 = inP3 || (r.conditionText || r.media?.mediaText || '').includes('color-gamut');
        if (r.cssRules && !r.selectorText) walk(r.cssRules, isP3);
        else if (isP3 && r.selectorText && r.style) {
          const mode = r.selectorText.trim().startsWith('.dark') ? 'dark' : 'light';
          for (const prop of r.style) if (/^--ds-[a-z]+-\d+$/.test(prop)) p3[mode][prop] = r.style.getPropertyValue(prop).trim();
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch {} }
    return { raw, rgb, text, p3 };
  });
  capture[scheme] = { ...res.raw, __rgb: res.rgb };
  if (scheme === 'light') { cssText = res.text; p3 = res.p3; }
  await ctx.close();
}
await browser.close();

writeFileSync(join(root, `reference/geist-computed-${today}.json`), JSON.stringify(capture, null, 1));
writeFileSync(join(root, `reference/geist-p3-oklch-${today}.json`), JSON.stringify(p3, null, 1));

const hex = (s) => {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return s;
  const h = '#' + m.slice(1, 4).map((x) => (+x | 0).toString(16).padStart(2, '0')).join('');
  return m[4] !== undefined ? h + Math.round(+m[4] * 255).toString(16).padStart(2, '0') : h;
};
const L = capture.light, D = capture.dark;
const tokPath = join(root, 'tokens/primitives.tokens.json');
const tok = JSON.parse(readFileSync(tokPath, 'utf8'));
for (const scale of ['gray', 'blue', 'red', 'amber', 'green', 'teal', 'purple', 'pink']) {
  for (let s = 100; s <= 1000; s += 100) {
    const n = `--ds-${scale}-${s}`;
    const t = { $type: 'color', $value: hex(L.__rgb[n]), $extensions: { facet: { dark: hex(D.__rgb[n]) } } };
    if (p3.light[n]) Object.assign(t.$extensions.facet, { p3: p3.light[n], p3Dark: p3.dark[n] });
    tok.color[scale][String(s)] = t;
  }
}
for (let s = 100; s <= 1000; s += 100) {
  const n = `--ds-gray-alpha-${s}`;
  tok.color['gray-alpha'][String(s)] = { $type: 'color', $value: L[n], $extensions: { facet: { dark: D[n] } } };
}
for (const s of [100, 200]) {
  const n = `--ds-background-${s}`;
  tok.color.background[String(s)] = { $type: 'color', $value: hex(L.__rgb[n]), $extensions: { facet: { dark: hex(D.__rgb[n]) } } };
}
const bgRef = (v) => v.replace(/hsla\(0, 0%, (98|0)%, 1\)/g, 'var(--ds-background-200)');
for (const k of Object.keys(tok.shadow)) {
  const n = `--ds-shadow-${k}`;
  if (L[n]) tok.shadow[k] = { $type: 'shadow', $value: bgRef(L[n]), $extensions: { facet: { dark: bgRef(D[n]) } } };
}
writeFileSync(tokPath, JSON.stringify(tok, null, 2));

// Typography roles
const W = { 'var(--font-weight-normal)': 400, 'var(--font-weight-medium)': 500, 'var(--font-weight-semibold)': 600 };
const typo = {}, strong = {};
for (const m of cssText.matchAll(/\.text-((?:heading|label|copy|button)-\d+(?:-mono)?)( > strong)?\s*\{([^}]*)\}/g)) {
  const [, name, st, body] = m;
  const d = Object.fromEntries([...body.matchAll(/(?<![-\w])(font-size|line-height|font-weight|letter-spacing|font-family|color):\s*([^;]+)/g)].map((x) => [x[1], x[2].trim()]));
  if (st) { strong[name] ??= { fontWeight: W[d['font-weight']] ?? +d['font-weight'], color: d.color }; continue; }
  if (typo[name] || !d['font-size']) continue;
  typo[name] = { $type: 'typography', $value: {
    fontFamily: /mono/.test(d['font-family'] || '') ? '{font.family.mono}' : '{font.family.sans}',
    fontSize: d['font-size'], lineHeight: d['line-height'], fontWeight: W[d['font-weight']] ?? +d['font-weight'],
    letterSpacing: d['letter-spacing'] || '0px' } };
}
for (const [k, v] of Object.entries(strong)) if (typo[k]) typo[k].$extensions = { facet: { strong: v } };
if (Object.keys(typo).length >= 20) {
  const typePath = join(root, 'tokens/typography.tokens.json');
  const cur = JSON.parse(readFileSync(typePath, 'utf8'));
  const order = (k) => [['heading', 'button', 'label', 'copy'].indexOf(k.split('-')[0]), -parseInt(k.split('-')[1]), k];
  const cmp = (a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };
  cur.typography = Object.fromEntries(Object.keys(typo).sort(cmp).map((k) => [k, typo[k]]));
  writeFileSync(typePath, JSON.stringify(cur, null, 2));
} else {
  console.warn('Type roles not found in stylesheet text; typography.tokens.json left unchanged.');
}
console.log(`Captured the vercel.com reference on ${today}. Now run: node scripts/build.mjs && git diff tokens/`);
