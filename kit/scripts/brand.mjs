#!/usr/bin/env node
// Facet brand CLI. The one supported way to change how Facet looks in a project.
//
//   node scripts/brand.mjs show                         what the current brand does
//   node scripts/brand.mjs options                      every option and its allowed values
//   node scripts/brand.mjs set accent=#2f6fed controls=round depth=flat
//   node scripts/brand.mjs apply packet.json            a config exported by onboarding/index.html (may carry the logo)
//   node scripts/brand.mjs logo path/to/logo.svg        clean an SVG and install it as the logo
//   node scripts/brand.mjs check [file.json]            validate without writing
//   node scripts/brand.mjs reset                        back to the defaults
//
// set, apply, logo and reset write brand/brand.json and rebuild the generated CSS. Nothing is written when the
// config is invalid or fails contrast. Rules live in scripts/brand-core.mjs.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { normalize, derive, report, sanitizeSvg, DEFAULTS, OPTIONS, LABELS } from './brand-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandPath = join(root, 'brand/brand.json');
const prim = JSON.parse(readFileSync(join(root, 'tokens/primitives.tokens.json'), 'utf8'));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const current = () => (existsSync(brandPath) ? readJson(brandPath) : { ...DEFAULTS });
const fail = (msg) => { console.error(msg); process.exit(1); };

function validated(raw) {
  const { config, errors, warnings } = normalize(raw);
  if (errors.length) fail('Not applied. Fix these first:\n  ' + errors.join('\n  '));
  const d = derive(config, prim);
  const failing = d.checks.filter((c) => !c.pass);
  if (failing.length) fail('Not applied. Contrast would fail:\n  ' + failing.map((c) => `${c.pair} (${c.mode}): ${c.ratio}:1, needs ${c.min}:1`).join('\n  '));
  for (const w of warnings) console.warn('Warning: ' + w);
  return config;
}
function installLogo(svgText, name = 'logo.svg') {
  const logo = sanitizeSvg(svgText);
  if (!logo.ok) fail('Logo not installed:\n  ' + logo.errors.join('\n  '));
  mkdirSync(join(root, 'brand'), { recursive: true });
  writeFileSync(join(root, 'brand', name), logo.svg + '\n');
  console.log(`wrote brand/${name}` + (logo.mono ? ' (one color: the build also writes brand/logo.mono.svg in currentColor)' : ''));
  return name;
}
function save(config) {
  writeFileSync(brandPath, JSON.stringify(config, null, 2) + '\n');
  console.log('wrote brand/brand.json');
  const r = spawnSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

const [cmd = 'show', ...args] = process.argv.slice(2);
if (cmd === 'show') {
  console.log(report(derive(validated(current()), prim)));
} else if (cmd === 'options') {
  console.log('name      1 to 40 characters');
  console.log('accent    a hex color (#2f6fed), or null for the default violet');
  for (const [k, vals] of Object.entries(OPTIONS)) console.log(`${k.padEnd(9)} ${vals.map((v) => (v === DEFAULTS[k] ? `${v} (default)` : v)).join(' | ')}`);
  console.log('logo      the name of an SVG inside brand/ (use the logo command to install one)');
} else if (cmd === 'set') {
  if (!args.length) fail('Usage: node scripts/brand.mjs set accent=#2f6fed controls=round ...');
  const next = current();
  for (const a of args) {
    const i = a.indexOf('=');
    if (i < 1) fail(`"${a}" is not key=value.`);
    const k = a.slice(0, i), v = a.slice(i + 1);
    next[k] = v === 'null' || v === 'default' || v === '' ? null : v;
    if (next[k] === null && k !== 'accent' && k !== 'logo') delete next[k];
  }
  save(validated(next));
} else if (cmd === 'apply' || cmd === 'check') {
  const file = args[0];
  if (cmd === 'apply' && !file) fail('Usage: node scripts/brand.mjs apply packet.json');
  const raw = file ? readJson(resolve(file)) : current();
  const { logoSvg, ...rest } = raw;
  if (cmd === 'check') {
    if (logoSvg) { const l = sanitizeSvg(logoSvg); if (!l.ok) fail('Logo:\n  ' + l.errors.join('\n  ')); }
    console.log(report(derive(validated(rest), prim)));
  } else {
    const config = validated(logoSvg ? { ...rest, logo: 'logo.svg' } : rest);
    if (logoSvg) installLogo(logoSvg);
    save(config);
  }
} else if (cmd === 'logo') {
  if (!args[0]) fail('Usage: node scripts/brand.mjs logo path/to/logo.svg');
  const name = installLogo(readFileSync(resolve(args[0]), 'utf8'));
  save(validated({ ...current(), logo: name }));
} else if (cmd === 'reset') {
  save(validated({ ...DEFAULTS }));
} else {
  fail(`Unknown command "${cmd}". Try: show, options, set, apply, logo, check, reset.`);
}
