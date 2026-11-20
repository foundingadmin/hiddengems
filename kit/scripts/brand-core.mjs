// Facet brand layer: the rules that turn brand/brand.json into token changes.
// Pure and dependency-free, so the same code runs in the build (scripts/build.mjs), the CLI (scripts/brand.mjs)
// and the onboarding page (onboarding/index.html), and all three always agree.
//
// The layer is small on purpose. A brand may set: one accent color, the gray temperature, light and dark modes,
// corner radii for controls and for surfaces, depth, stroke weight, one of four type families, a name and a logo.
// It may never set: status, signal, delta or freshness hues, the type scale, spacing, control heights or row
// heights. Those carry the meaning and the density the system exists for.

export const VERSION = 1;

export const OPTIONS = {
  accentUse: ['auto', 'interactive', 'identity'],
  neutrals: ['neutral', 'cool', 'warm', 'tinted'],
  modes: ['both', 'light', 'dark'],
  controls: ['square', 'soft', 'round', 'pill'],
  surfaces: ['square', 'soft', 'round'],
  depth: ['flat', 'subtle', 'raised'],
  stroke: ['fine', 'defined'],
  type: ['geist', 'inter', 'plex', 'system'],
};

export const DEFAULTS = {
  version: VERSION,
  name: 'Acme',
  accent: null,
  accentUse: 'auto',
  neutrals: 'neutral',
  modes: 'both',
  controls: 'soft',
  surfaces: 'soft',
  depth: 'subtle',
  stroke: 'fine',
  type: 'geist',
  logo: null,
};

// What each choice means, in the words the onboarding page and the CLI both print.
export const LABELS = {
  neutrals: { neutral: 'Neutral gray', cool: 'Cool gray', warm: 'Warm gray', tinted: 'Tinted with the accent' },
  modes: { both: 'Light and dark', light: 'Light only', dark: 'Dark only' },
  controls: { square: 'Square', soft: 'Soft', round: 'Round', pill: 'Pill buttons' },
  surfaces: { square: 'Square', soft: 'Soft', round: 'Round' },
  depth: { flat: 'Flat', subtle: 'Subtle', raised: 'Raised' },
  stroke: { fine: 'Fine', defined: 'Defined' },
  type: { geist: 'Geist', inter: 'Inter', plex: 'IBM Plex', system: 'System UI' },
};

const RADII = {
  controls: {
    square: { xs: 2, sm: 2, md: 3 },
    soft: { xs: 4, sm: 6, md: 8 },
    round: { xs: 6, sm: 10, md: 12 },
    pill: { xs: 6, sm: 10, md: 12, button: 9999 },
  },
  surfaces: {
    square: { card: 2, lg: 4, xl: 6 },
    soft: { card: 6, lg: 12, xl: 16 },
    round: { card: 12, lg: 16, xl: 24 },
  },
};

const SYSTEM_SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
export const FONTS = {
  geist: {
    sans: `var(--font-geist-sans, "Geist"), "Geist Fallback", ${SYSTEM_SANS}`,
    mono: `var(--font-geist-mono, "Geist Mono"), ${SYSTEM_MONO}`,
    vendored: true,
    families: ['Geist', 'Geist Mono'],
    load: 'Vendored in fonts/. In Next.js prefer the geist package, which sets --font-geist-sans and --font-geist-mono.',
  },
  inter: {
    sans: `var(--font-sans, "Inter"), ${SYSTEM_SANS}`,
    mono: `var(--font-mono, "JetBrains Mono"), ${SYSTEM_MONO}`,
    vendored: false,
    families: ['Inter', 'JetBrains Mono'],
    load: 'Load Inter and JetBrains Mono in the app (next/font/google or a self-hosted @font-face) and expose them as --font-sans and --font-mono.',
  },
  plex: {
    sans: `var(--font-sans, "IBM Plex Sans"), ${SYSTEM_SANS}`,
    mono: `var(--font-mono, "IBM Plex Mono"), ${SYSTEM_MONO}`,
    vendored: false,
    families: ['IBM Plex Sans', 'IBM Plex Mono'],
    load: 'Load IBM Plex Sans and IBM Plex Mono in the app (next/font/google or a self-hosted @font-face) and expose them as --font-sans and --font-mono.',
  },
  system: { sans: SYSTEM_SANS, mono: SYSTEM_MONO, vendored: false, families: [], load: 'Nothing to load: the device font is used.' },
};

// ---------------------------------------------------------------- color math (sRGB, OKLCH, WCAG)
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(input) {
  const m = String(input ?? '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return '#' + h.toLowerCase();
}
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const hexOf = (rgb) => '#' + rgb.map((c) => Math.round(clamp(c, 0, 1) * 255).toString(16).padStart(2, '0')).join('');

function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
/** Hex to OKLCH: { L 0..1, C, h degrees }. */
export function oklchOf(hex) {
  const [L, a, b] = linearToOklab(rgbOf(hex).map(toLinear));
  const C = Math.hypot(a, b);
  return { L, C, h: C < 1e-4 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
}
const linOf = ({ L, C, h }) => oklabToLinear([L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)]);
const inGamut = (lin) => lin.every((c) => c >= -1e-4 && c <= 1 + 1e-4);
/** OKLCH to hex, lowering chroma (never lightness or hue) until the color fits sRGB. */
export function hexOfOklch({ L, C, h }) {
  L = clamp(L, 0, 1);
  let lin = linOf({ L, C, h });
  if (!inGamut(lin)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(linOf({ L, C: mid, h }))) lo = mid; else hi = mid;
    }
    lin = linOf({ L, C: lo, h });
  }
  return hexOf(lin.map((c) => toGamma(clamp(c, 0, 1))));
}
export function luminance(hex) {
  const [r, g, b] = rgbOf(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// ---------------------------------------------------------------- validation
const KEYS = Object.keys(DEFAULTS);

/** Checks a brand config. Returns { config, errors, warnings }; config is complete and safe when errors is empty. */
export function normalize(input) {
  const errors = [], warnings = [];
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (src !== input) errors.push('The brand config must be a JSON object.');
  const config = { ...DEFAULTS };
  for (const k of Object.keys(src)) {
    if (k.startsWith('$') || k === 'logoSvg') continue;
    if (!KEYS.includes(k)) errors.push(`Unknown option "${k}". The brand layer sets only: ${KEYS.filter((x) => x !== 'version').join(', ')}.`);
  }
  if (src.version != null && src.version !== VERSION) errors.push(`Brand config version ${src.version} is not supported (expected ${VERSION}).`);
  if (src.name != null) {
    const name = String(src.name).replace(/[\u0000-\u001f<>]/g, '').trim();
    if (!name || name.length > 40) errors.push('name must be 1 to 40 characters.');
    else config.name = name;
  }
  if (src.accent != null && src.accent !== '') {
    const hex = parseHex(src.accent);
    if (!hex) errors.push(`accent must be a hex color such as #2f6fed, got "${src.accent}".`);
    else config.accent = hex;
  }
  for (const k of Object.keys(OPTIONS)) {
    if (src[k] == null) continue;
    if (!OPTIONS[k].includes(src[k])) errors.push(`${k} must be one of ${OPTIONS[k].join(', ')}, got "${src[k]}".`);
    else config[k] = src[k];
  }
  if (src.logo != null && src.logo !== '') {
    const file = String(src.logo);
    if (!/^[a-z0-9][a-z0-9._-]*\.svg$/i.test(file)) errors.push('logo must be the name of an SVG file inside brand/, such as "logo.svg".');
    else config.logo = file;
  }
  if (config.accentUse === 'interactive' && config.accent) {
    const zone = signalZone(oklchOf(config.accent), null);
    if (zone) warnings.push(`accentUse is forced to "interactive", but this accent ${ZONE_WORDS[zone].clash}. Focus rings and checked controls can now be misread. "auto" keeps them safe.`);
  }
  return { config, errors, warnings };
}

// ---------------------------------------------------------------- accent
// Where a brand color would be misread as a status. Hues are OKLCH degrees, measured from the kit's own signal
// colors when the primitives are passed in, with these as the fallback.
const SIGNAL_HUES = { red: 22, amber: 75, green: 147 };
const ZONE_WORDS = {
  red: { clash: 'sits on the error and stop hue', name: 'red' },
  amber: { clash: 'sits on the warning and wait hue', name: 'amber' },
  green: { clash: 'sits on the success and go hue', name: 'green' },
  neutral: { clash: 'is close to gray', name: 'neutral' },
};
function signalZone({ C, h }, prim) {
  if (C < 0.04) return 'neutral';
  const hue = (scale) => {
    const t = prim?.color?.[scale]?.['700'];
    return t ? oklchOf(t.$value).h : SIGNAL_HUES[scale];
  };
  const red = hue('red'), amber = hue('amber'), green = hue('green');
  // Red through yellow is one warm band (red, orange, amber, yellow all read as trouble or caution).
  const warmFrom = (red - 20 + 360) % 360, warmTo = amber + 32;
  const inWarm = warmFrom <= warmTo ? h >= warmFrom && h <= warmTo : h >= warmFrom || h <= warmTo;
  if (inWarm) return hueGap(h, red) <= hueGap(h, amber) ? 'red' : 'amber';
  if (hueGap(h, green) <= 24) return 'green';
  return null;
}

const STEPS = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
const dk = (t) => (t.$extensions && t.$extensions.facet && t.$extensions.facet.dark) || t.$value;
const modeHex = (scale, mode) => Object.fromEntries(Object.entries(scale).map(([k, t]) => [k, mode === 'dark' ? dk(t) : t.$value]));

function buildAccent(config, prim) {
  const template = prim.color.purple;
  const tpl = { light: modeHex(template, 'light'), dark: modeHex(template, 'dark') };
  const surface = {
    light: { canvas: prim.color.background['100'].$value, onFg: prim.color.background['100'].$value },
    dark: { canvas: dk(prim.color.background['100']), onFg: dk(prim.color.gray['1000']) },
  };
  if (!config.accent) {
    return {
      source: 'default', hex: tpl.light['700'], role: 'interactive', zone: null, scale: tpl, p3: template,
      note: 'Default violet: the one hue with no other job in the system.',
    };
  }
  const brand = oklchOf(config.accent);
  const zone = signalZone(brand, prim);
  const role = config.accentUse === 'auto' ? (zone ? 'identity' : 'interactive') : config.accentUse;
  const ref = oklchOf(tpl.light['700']);
  // A near-gray brand keeps its own (tiny) chroma; any other brand lands within reach of the template's.
  const k = zone === 'neutral' ? brand.C / ref.C : clamp(brand.C / ref.C, 0.5, 1.25);
  // Interactive accents keep the template's lightness ladder (a small nudge toward the brand on the solid steps),
  // because marks are drawn on them. Identity accents carry no marks, so the solid step may be the brand itself.
  const reach = role === 'interactive' ? 0.08 : 0.34;
  const scale = { light: {}, dark: {} };
  for (const mode of ['light', 'dark']) {
    const solidStep = mode === 'light' ? '700' : '800';
    const shift = clamp(brand.L - oklchOf(tpl[mode][solidStep]).L, -reach, reach);
    for (const step of STEPS) {
      const t = oklchOf(tpl[mode][step]);
      const w = step === '700' || step === '800' ? 1 : step === '600' ? 0.5 : 0;
      scale[mode][step] = { L: clamp(t.L + shift * w, 0.12, 0.985), C: t.C * k, h: brand.h };
    }
    // Contrast is enforced, never assumed: nudge lightness until each pair passes.
    const fix = (step, against, min, dir) => {
      const c = scale[mode][step];
      for (let i = 0; i < 60 && contrast(hexOfOklch(c), against) < min; i++) c.L = clamp(c.L + dir * 0.01, 0.05, 0.99);
    };
    const away = mode === 'light' ? -1 : 1; // away from the canvas
    if (role === 'interactive') fix(solidStep, surface[mode].onFg, 3, mode === 'light' ? -1 : -1);
    fix('900', surface[mode].canvas, 4.5, away);
    fix('900', hexOfOklch(scale[mode]['200']), 4.5, away);
    for (const step of STEPS) scale[mode][step] = hexOfOklch(scale[mode][step]);
  }
  const words = zone ? ZONE_WORDS[zone] : null;
  const note = role === 'identity'
    ? `${config.accent} ${words ? words.clash : 'is set to identity only'}, so focus rings, checked controls and highlights stay blue. The brand color still carries text selection, marketing surfaces and dot illustrations.`
    : `${config.accent} drives focus rings, checked controls, highlights, text selection and marketing surfaces.`;
  return { source: 'custom', hex: config.accent, role, zone, scale, p3: null, note };
}

// ---------------------------------------------------------------- grays
const TINT = { cool: { h: 255, c: 0.011 }, warm: { h: 70, c: 0.009 } };
function buildGrays(config, prim, accent) {
  let tint = TINT[config.neutrals] || null;
  if (config.neutrals === 'tinted') {
    const a = oklchOf(accent.hex);
    tint = a.C >= 0.04 ? { h: a.h, c: 0.01 } : null;
  }
  if (!tint) return null;
  // Lightness never moves, so every contrast pair in the system holds; only a trace of hue is added.
  const tinted = (hex, weight = 1) => {
    const { L } = oklchOf(hex);
    const c = tint.c * weight * (L > 0.85 ? 0.5 : 1) * (L < 0.3 ? 0.7 : 1);
    return hexOfOklch({ L, C: c, h: tint.h });
  };
  const gray = { light: {}, dark: {} };
  for (const step of STEPS) {
    gray.light[step] = tinted(prim.color.gray[step].$value);
    gray.dark[step] = tinted(dk(prim.color.gray[step]));
  }
  const bg = prim.color.background;
  const background = {
    light: { 100: bg['100'].$value, 200: tinted(bg['200'].$value, 0.6) },
    dark: { 100: tinted(dk(bg['100']), 0.7), 200: dk(bg['200']) },
  };
  return { gray, background };
}

// ---------------------------------------------------------------- shadows
const splitLayers = (v) => {
  const out = []; let depth = 0, cur = '';
  for (const ch of v) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const isRing = (layer) => /^(inset )?0 0 0 1px /.test(layer);
const scaleAlpha = (layer, factor, cap) => layer.replace(/#([0-9a-f]{6})([0-9a-f]{2})$/i, (_, rgb, a) =>
  `#${rgb}${Math.min(cap, Math.round(parseInt(a, 16) * factor)).toString(16).padStart(2, '0')}`);
const OVERLAYS = new Set(['tooltip', 'menu', 'modal', 'fullscreen']);
const NO_SHADOW = '0 0 #0000'; // a layer that draws nothing; `none` is invalid inside a shadow list

function buildShadows(config, prim) {
  const out = {};
  for (const [name, t] of Object.entries(prim.shadow)) {
    out[name] = {};
    for (const mode of ['light', 'dark']) {
      let layers = splitLayers(mode === 'dark' ? dk(t) : t.$value);
      const ringBoost = (config.stroke === 'defined' ? 1.7 : 1) * (config.depth === 'flat' && OVERLAYS.has(name) ? 2 : 1);
      if (config.depth === 'flat') layers = layers.filter(isRing);
      layers = layers.map((l) => {
        if (isRing(l)) return ringBoost === 1 ? l : scaleAlpha(l, ringBoost, mode === 'dark' ? 0x66 : 0x3d);
        return config.depth === 'raised' ? scaleAlpha(l, mode === 'dark' ? 1.5 : 2.2, mode === 'dark' ? 0x99 : 0x3d) : l;
      });
      out[name][mode] = layers.length ? layers.join(', ') : NO_SHADOW;
    }
  }
  return out;
}

// ---------------------------------------------------------------- derive
/**
 * Turns a normalized config and the primitive tokens (tokens/primitives.tokens.json, or the subset the onboarding
 * page embeds: color.{gray,background,purple,blue,red,amber,green} and shadow) into everything that changes.
 */
export function derive(config, prim) {
  const accent = buildAccent(config, prim);
  const grays = buildGrays(config, prim, accent);
  const shadow = buildShadows(config, prim);
  const rc = RADII.controls[config.controls], rs = RADII.surfaces[config.surfaces];
  const radius = { xs: rc.xs, sm: rc.sm, md: rc.md, lg: rs.lg, xl: rs.xl, card: rs.card };
  if (rc.button) radius.button = rc.button;

  // Semantic tokens the brand may re-point. Everything else in tokens/facet.semantic.json is fixed.
  const semantic = {};
  if (accent.role === 'identity') {
    Object.assign(semantic, {
      'focus.color': { value: '{color.blue.700}' },
      'control.on': { value: '{color.blue.700}', dark: '{color.blue.800}' },
      'highlight.fg': { value: '{color.blue.900}' },
      'highlight.solid': { value: '{color.blue.700}' },
      'highlight.bg': { value: '{color.blue.200}' },
      'highlight.border': { value: '{color.blue.400}' },
      'badge.accent': { value: '{color.blue.800}' },
    });
  }
  if (config.stroke === 'defined') {
    Object.assign(semantic, {
      'border.default': { value: '{color.gray.500}' },
      'border.hover': { value: '{color.gray.600}' },
      'border.active': { value: '{color.gray.700}' },
    });
  }

  const font = FONTS[config.type];
  const scalars = {
    'elevation-card': config.depth === 'raised' ? 'var(--ds-shadow-border-small)' : 'var(--ds-shadow-border)',
    'icon-stroke': config.stroke === 'defined' ? '2' : '1.5',
  };

  // The pairs that must hold, measured on the result.
  const checks = [];
  for (const mode of ['light', 'dark']) {
    const canvas = grays ? grays.background[mode]['100'] : (mode === 'dark' ? dk(prim.color.background['100']) : prim.color.background['100'].$value);
    const gray = (s) => (grays ? grays.gray[mode][s] : (mode === 'dark' ? dk(prim.color.gray[s]) : prim.color.gray[s].$value));
    const onFg = mode === 'light' ? canvas : gray('1000');
    const add = (pair, a, b, min) => { const ratio = contrast(a, b); checks.push({ mode, pair, ratio: Math.round(ratio * 100) / 100, min, pass: ratio >= min }); };
    add('primary text on canvas', gray('1000'), canvas, 7);
    add('secondary text on canvas', gray('900'), canvas, 4.5);
    add('accent text on canvas', accent.scale[mode]['900'], canvas, 4.5);
    add('accent text on accent tint', accent.scale[mode]['900'], accent.scale[mode]['200'], 4.5);
    if (accent.role === 'interactive') add('mark on accent fill', onFg, accent.scale[mode][mode === 'light' ? '700' : '800'], 3);
  }

  return { config, accent, grays, shadow, radius, semantic, scalars, font, checks };
}

/** Flat custom property maps for a live preview: set `root` and one of `light` / `dark` on the previewed element. */
export function cssVars(d) {
  const out = { root: {}, light: {}, dark: {} };
  for (const mode of ['light', 'dark']) {
    for (const step of STEPS) out[mode][`--ds-accent-${step}`] = d.accent.scale[mode][step];
    if (d.grays) {
      for (const step of STEPS) out[mode][`--ds-gray-${step}`] = d.grays.gray[mode][step];
      out[mode]['--ds-background-100'] = d.grays.background[mode]['100'];
      out[mode]['--ds-background-200'] = d.grays.background[mode]['200'];
    }
    for (const [name, v] of Object.entries(d.shadow)) out[mode][`--ds-shadow-${name}`] = v[mode];
    for (const [path, v] of Object.entries(d.semantic)) {
      const val = (mode === 'dark' && v.dark) || v.value;
      out[mode][`--fc-${path.replace('.', '-')}`] = val.replace(/\{color\.([a-z-]+)\.(\d+)\}/, 'var(--ds-$1-$2)');
    }
  }
  for (const [k, v] of Object.entries(d.radius)) out.root[`--fc-radius-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(d.scalars)) out.root[`--fc-${k}`] = v;
  out.root['--fc-font-sans'] = d.font.sans;
  out.root['--fc-font-mono'] = d.font.mono;
  return out;
}

// ---------------------------------------------------------------- logo
/**
 * Makes an uploaded SVG safe to ship as an image: no scripts, no event handlers, no outside references.
 * Returns { ok, svg, errors, mono } where mono is true when the artwork paints with a single color, in which
 * case `monoSvg` is the same artwork drawn in currentColor so it can follow the theme when inlined.
 */
export function sanitizeSvg(text, maxBytes = 200_000) {
  const errors = [];
  let s = String(text ?? '').replace(/^﻿/, '').trim();
  if (s.length > maxBytes) errors.push(`The logo is ${Math.round(s.length / 1000)} kB. Keep it under ${Math.round(maxBytes / 1000)} kB (outline the type, remove embedded images).`);
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) errors.push('The logo must be a single SVG file.');
  if (errors.length) return { ok: false, svg: '', errors, mono: false, monoSvg: '' };
  s = s
    .replace(/<(script|foreignObject|iframe|embed|object|audio|video|animate|set)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|foreignObject|iframe|embed|object|audio|video|animate|set)\b[^>]*\/?>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, (m) => (/@import|url\s*\(|expression\s*\(/i.test(m) ? '' : m))
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, (m, v) => (/^["']\s*(#|data:image\/(png|jpeg|gif|webp);)/i.test(v) ? m : ''))
    .replace(/(javascript|vbscript)\s*:/gi, '');
  if (!/viewBox\s*=/.test(s)) errors.push('The logo has no viewBox, so it cannot scale. Export it again with a viewBox.');
  const paints = new Set();
  for (const m of s.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)/gi)) {
    const v = m[1].toLowerCase();
    if (v !== 'none' && v !== 'transparent' && v !== 'inherit') paints.add(v === 'currentcolor' ? v : v);
  }
  const real = [...paints].filter((p) => p !== 'currentcolor');
  const mono = real.length <= 1 && !/<(linearGradient|radialGradient|image|pattern)\b/i.test(s);
  let monoSvg = '';
  if (mono) {
    monoSvg = real.length ? s.split(real[0]).join('currentColor').replace(new RegExp(real[0], 'gi'), 'currentColor') : s;
    if (!/fill\s*=/.test(monoSvg.match(/^<svg[^>]*>/i)[0]) && !real.length) monoSvg = monoSvg.replace(/^<svg/i, '<svg fill="currentColor"');
  }
  return { ok: !errors.length, svg: s, errors, mono, monoSvg };
}

/** A plain-text summary of what a config does, for the CLI and for an agent to relay. */
export function report(d) {
  const c = d.config, L = LABELS;
  const lines = [
    `Brand: ${c.name}`,
    `Accent: ${d.accent.note}`,
    `Neutrals: ${L.neutrals[c.neutrals]}${c.neutrals === 'tinted' && !d.grays ? ' (accent is near gray, so grays stay neutral)' : ''}`,
    `Modes: ${L.modes[c.modes]}`,
    `Corners: controls ${L.controls[c.controls].toLowerCase()}, surfaces ${L.surfaces[c.surfaces].toLowerCase()}`,
    `Depth: ${L.depth[c.depth]}. Stroke: ${L.stroke[c.stroke]}`,
    `Type: ${L.type[c.type]}. ${d.font.load}`,
    `Logo: ${c.logo ? `brand/${c.logo}` : 'none yet (add an SVG to brand/ and set "logo")'}`,
  ];
  const failed = d.checks.filter((x) => !x.pass);
  lines.push(failed.length
    ? `Contrast: ${failed.length} pair(s) below target: ${failed.map((x) => `${x.pair} in ${x.mode} ${x.ratio}:1 (needs ${x.min}:1)`).join('; ')}`
    : `Contrast: all ${d.checks.length} checked pairs pass.`);
  return lines.join('\n');
}
