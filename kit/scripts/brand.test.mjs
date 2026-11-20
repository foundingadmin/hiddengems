// The brand layer's promises, tested: `node --test scripts/*.test.mjs`
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, derive, cssVars, sanitizeSvg, oklchOf, hexOfOklch, contrast, DEFAULTS, OPTIONS } from './brand-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const prim = JSON.parse(readFileSync(join(root, 'tokens/primitives.tokens.json'), 'utf8'));
const brand = (over) => derive(normalize(over).config, prim);

test('color math round-trips and matches the captured wide-gamut values', () => {
  for (const hex of ['#8e4ec6', '#ffffff', '#0a0a0a', '#0072f5', '#ffb224']) assert.equal(hexOfOklch(oklchOf(hex)), hex);
  const p = oklchOf('#8e4ec6'); // the reference lists this step as oklch(55.5% ... 306.12)
  assert.ok(Math.abs(p.L - 0.555) < 0.002 && Math.abs(p.h - 306.12) < 0.5);
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
});

test('the default brand leaves the captured tokens untouched', () => {
  const d = brand({});
  assert.equal(d.grays, null);
  for (const [step, t] of Object.entries(prim.color.purple)) {
    assert.equal(d.accent.scale.light[step], t.$value);
    assert.equal(d.accent.scale.dark[step], t.$extensions.facet.dark);
  }
  for (const [name, t] of Object.entries(prim.shadow)) {
    assert.equal(d.shadow[name].light, t.$value);
    assert.equal(d.shadow[name].dark, t.$extensions.facet.dark);
  }
  assert.deepEqual(d.radius, { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, card: 6 });
  assert.deepEqual(d.semantic, {});
});

test('every hue passes contrast, in every combination that touches color', () => {
  for (let h = 0; h < 360; h += 6) {
    for (const [L, C] of [[0.25, 0.08], [0.45, 0.2], [0.6, 0.25], [0.75, 0.16], [0.9, 0.12]]) {
      const accent = hexOfOklch({ L, C, h });
      for (const neutrals of OPTIONS.neutrals) for (const stroke of OPTIONS.stroke) for (const accentUse of OPTIONS.accentUse) {
        const d = brand({ accent, neutrals, stroke, accentUse });
        const failed = d.checks.filter((c) => !c.pass);
        assert.deepEqual(failed, [], `${accent} ${neutrals} ${stroke} ${accentUse}`);
      }
    }
  }
});

test('a brand color near a status hue, or near gray, is kept for identity only', () => {
  const role = (accent) => brand({ accent }).accent.role;
  for (const hex of ['#e11d48', '#ef4444', '#ff5a1f', '#f59e0b', '#facc15', '#16a34a', '#22c55e', '#111111', '#6b7280']) assert.equal(role(hex), 'identity', hex);
  for (const hex of ['#2f6fed', '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#0284c7', '#0d9488', '#0a2540']) assert.equal(role(hex), 'interactive', hex);
  const d = brand({ accent: '#e11d48' });
  assert.equal(d.semantic['focus.color'].value, '{color.blue.700}');
  assert.equal(d.semantic['control.on'].value, '{color.blue.700}');
  assert.equal(d.accent.scale.light['700'], '#e11d48'); // identity keeps the brand color itself
  assert.ok(normalize({ accent: '#e11d48', accentUse: 'interactive' }).warnings.length === 1);
});

test('status, verdict, delta and freshness are never re-pointed', () => {
  for (const accent of [null, '#2f6fed', '#e11d48', '#111111']) {
    const d = brand({ accent, stroke: 'defined', neutrals: 'tinted', depth: 'raised', controls: 'pill', surfaces: 'round' });
    for (const path of Object.keys(d.semantic)) assert.match(path, /^(focus|control|highlight|badge)\./);
    const vars = cssVars(d);
    for (const name of [...Object.keys(vars.light), ...Object.keys(vars.root)]) {
      assert.doesNotMatch(name, /--ds-(red|amber|green|blue|teal|pink)-|--fc-(status|signal|delta|freshness|chart)-/);
    }
  }
});

test('grays keep their lightness, so text contrast cannot drift', () => {
  for (const neutrals of ['cool', 'warm', 'tinted']) {
    const d = brand({ accent: '#2f6fed', neutrals });
    for (const [step, t] of Object.entries(prim.color.gray)) {
      assert.ok(Math.abs(oklchOf(d.grays.gray.light[step]).L - oklchOf(t.$value).L) < 0.006, `${neutrals} ${step}`);
    }
  }
  const d = brand({ stroke: 'defined' });
  for (const step of ['100', '200', '300', '700', '800', '900', '1000']) assert.equal(d.grays.gray.light[step], prim.color.gray[step].$value);
  assert.equal(d.grays.gray.light['400'], prim.color.gray['500'].$value);
});

test('flat removes every drop shadow and keeps the hairline', () => {
  const d = brand({ depth: 'flat' });
  for (const [name, v] of Object.entries(d.shadow)) {
    for (const mode of ['light', 'dark']) {
      for (const layer of v[mode].split(/,(?![^(]*\))/).map((l) => l.trim())) {
        assert.ok(/^(inset )?0 0 0 1px /.test(layer) || layer === '0 0 #0000', `${name} ${mode}: ${layer}`);
      }
    }
  }
});

test('the config is strict', () => {
  assert.deepEqual(normalize({}).config, DEFAULTS);
  assert.equal(normalize({ accent: '#ABC' }).config.accent, '#aabbcc');
  for (const bad of [{ accent: 'blue' }, { controls: 'blob' }, { type: 'comic-sans' }, { fontSize: 18 }, { success: '#00ff00' }, { logo: '../x.svg' }, { name: '' }, { version: 2 }]) {
    assert.ok(normalize(bad).errors.length > 0, JSON.stringify(bad));
  }
});

test('an uploaded logo is cleaned', () => {
  const r = sanitizeSvg('<?xml version="1.0"?><svg viewBox="0 0 10 10" onload="x()"><script>alert(1)</script><a href="https://example.com"><path fill="#123456" d="M0 0h10v10z" onclick="y()"/></a><image href="javascript:alert(1)"/></svg>');
  assert.ok(r.ok);
  assert.doesNotMatch(r.svg, /script|onload|onclick|example\.com|javascript/i);
  assert.ok(sanitizeSvg('<svg viewBox="0 0 1 1"><path fill="#000" d="M0 0h1v1z"/></svg>').monoSvg.includes('currentColor'));
  assert.equal(sanitizeSvg('<html></html>').ok, false);
  assert.equal(sanitizeSvg('<svg><path d="M0 0"/></svg>').ok, false); // no viewBox
});
