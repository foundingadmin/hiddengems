#!/usr/bin/env node
// Builds Facet as a claude.ai Design System (the account's Design System artifact type) from this repo:
//   node packages/facet/scripts/design-system.mjs [outDir]       -> <outDir>/project/... (default dist/design-system)
//   node packages/facet/scripts/design-system.mjs index <uploads.json> [outDir]
//        writes project/design-system.json once logos are uploaded ({ "<group>/<file>": {blob,size} })
// Tokens come from css/tokens.css (the generated source of truth), type roles from tokens/typography.tokens.json,
// usage notes from the token JSON, component guidelines from components/*.md. Re-run to re-sync.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const [mode, a1, a2] = process.argv.slice(2);
const outDir = mode === 'index' ? (a2 ?? join(root, 'dist/design-system')) : (mode ?? join(root, 'dist/design-system'));
const proj = join(outDir, 'project');
const write = (p, s) => { mkdirSync(dirname(join(proj, p)), { recursive: true }); writeFileSync(join(proj, p), s); };
const TITLE = 'Facet';

if (mode === 'index') { writeIndex(JSON.parse(readFileSync(a1, 'utf8'))); process.exit(0); }

// ------------------------------------------------------------------ tokens.json
const css = read('css/tokens.css');
const block = (start, end) => css.slice(css.indexOf(start), css.indexOf(end));
const decls = (b) => [...b.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, n, v]) => [n.slice(2), v.trim()]);
const light = decls(block(':root, .light-theme, [data-theme="light"] {', '.dark-theme, [data-theme="dark"] {'));
const dark = new Map(decls(block('.dark-theme, [data-theme="dark"] {', '@media (prefers-color-scheme: dark)')));
const lightMap = new Map(light);

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const VAR = /^var\(--([\w-]+)\)$/;
const isColor = new Map();
const colorOf = (name, seen = new Set()) => {
  if (isColor.has(name)) return isColor.get(name);
  if (seen.has(name)) return false;
  seen.add(name);
  const v = lightMap.get(name);
  const r = v != null && (HEX.test(v) || (VAR.test(v) && colorOf(v.match(VAR)[1], seen)));
  isColor.set(name, r);
  return r;
};
const toValue = (v) => (VAR.test(v) ? `{${v.match(VAR)[1]}}` : v.toLowerCase());

// Usage notes: semantic $description, primitive scale descriptions.
const sem = json('tokens/facet.semantic.json');
const notes = new Map();
(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && '$value' in v) notes.set(`fc-${[...path, k].join('-')}`, v.$description ?? '');
    else if (v && typeof v === 'object') walk(v, [...path, k]);
  }
})(sem, []);
const prim = json('tokens/primitives.tokens.json');
const HUES = {
  gray: 'Neutral ramp. Text, surfaces and borders reach it through --fc-text-*, --fc-surface-* and --fc-border-*.',
  'gray-alpha': 'Translucent neutral. Hairlines and overlays that sit on any surface.',
  background: 'Page and raised backgrounds.',
  blue: 'Information only: links, info notes, chart series 2.',
  red: 'Stop and bad for the bettor: errors, negative edge, destructive actions.',
  amber: 'Wait and caution: warnings, stale data.',
  green: 'Go and good for the bettor: success, positive edge, live data.',
  teal: 'Chart series 3 only.',
  purple: 'Gems and the brand accent only (focus, selection, checked controls).',
  pink: 'Chart series 4 only.',
};
const primNote = (name) => {
  const m = name.match(/^ds-([a-z-]+?)-(\d+)$/);
  if (!m) return null;
  return `Primitive step ${m[2]}. ${HUES[m[1]] ?? ''} Product code uses the semantic token for the job, never this step.`.trim();
};

const colors = [];
for (const [name, v] of light) {
  if (!colorOf(name)) continue;
  const d = dark.get(name);
  const value = d && d !== v ? { light: toValue(v), dark: toValue(d) } : toValue(v);
  const usage = notes.get(name) || primNote(name)
    || (name === 'ds-white' || name === 'ds-black' ? 'Absolute white or black, for ink on solid fills.' : name.startsWith('ds-focus') ? 'Focus color, follows --fc-focus-color (the brand accent).' : name.startsWith('ds-overlay') ? 'Modal and sheet backdrop.' : '');
  colors.push({ name, value, usage });
}
const exported = new Set(colors.map((c) => c.name));

const lengthFamily = (prefix, describe) => light
  .filter(([n, v]) => n.startsWith(prefix) && /^-?[\d.]+(px|rem|em|%)?$/.test(v))
  .map(([n, v]) => { exported.add(n); return { name: n, value: v, usage: describe(n, v) }; });
const spaceDesc = (k) => prim.space?.[k.replace('fc-space-', '').replace('_', '.')]?.$description;
const spacing = lengthFamily('fc-space-', (n, v) => spaceDesc(n) || `${v} step of the spacing scale. Gaps between siblings use it through flex or grid gap.`);
const radiusUse = { xs: 'Small marks: team marks, pills inside tables.', sm: 'Controls, tooltips, small surfaces.', md: 'Menus, cards, player tiles.', lg: 'Modals, sheets, large surfaces.', xl: 'Full-screen surfaces.', full: 'Pills, dots, avatars.' };
const radius = lengthFamily('fc-radius-', (n) => prim.radius?.[n.replace('fc-radius-', '')]?.$description || radiusUse[n.replace('fc-radius-', '')] || 'Corner radius.');
const sizeNames = ['fc-control-tiny', 'fc-control-small', 'fc-control-medium', 'fc-control-large', 'fc-row-header', 'fc-row-body', 'fc-row-compact', 'fc-row-list', 'fc-row-list-single', 'fc-meter-height', 'fc-chart-height', 'fc-chart-height-small', 'fc-page-width', 'fc-page-margin', 'fc-sheet-width', 'fc-shell-sidenav-width', 'fc-shell-topbar-height'];
const sizeUse = {
  'fc-control-tiny': 'Icon-only buttons.', 'fc-control-small': 'Small buttons, inputs and selects; table toolbars.', 'fc-control-medium': 'Default control height.', 'fc-control-large': 'Large controls, hero actions.',
  'fc-row-header': 'Table header row.', 'fc-row-body': 'Table body row.', 'fc-row-compact': 'Compact table rows (25+ rows).', 'fc-row-list': 'Two-line list rows.', 'fc-row-list-single': 'One-line list rows.',
  'fc-meter-height': 'Every meter and progress bar, fully rounded.', 'fc-chart-height': 'Chart card plot height.', 'fc-chart-height-small': 'Small chart plots.',
  'fc-page-width': 'Maximum page content width.', 'fc-page-margin': 'Page side gutter on wide screens.', 'fc-sheet-width': 'Side sheet width.', 'fc-shell-sidenav-width': 'App shell side navigation.', 'fc-shell-topbar-height': 'App shell top bar.',
};
const size = sizeNames.filter((n) => lightMap.has(n)).map((n) => { exported.add(n); return { name: n, value: lightMap.get(n), usage: sizeUse[n] ?? '' }; });
const zIndex = light.filter(([n]) => n.startsWith('fc-z-')).map(([n, v]) => { exported.add(n); return { name: n, value: v, usage: `Stacking order for ${n.replace('fc-z-', '')}s.` }; });
const shadow = light.filter(([n, v]) => n.startsWith('ds-shadow-') && !/var\(|color-mix/.test(v)).map(([n, v]) => {
  exported.add(n);
  const d = dark.get(n);
  return { name: n, value: d && d !== v ? { light: v, dark: d } : v, usage: n.includes('border') ? 'A hairline drawn as a shadow, so it never shifts layout.' : 'Elevation for floating surfaces: menus, popovers, modals.' };
});

const typeTokens = json('tokens/typography.tokens.json').typography;
const GROUPS = { heading: 'Headings', button: 'Buttons', label: 'Labels', copy: 'Copy' };
const typeUse = {
  heading: 'Headings. Sections at 32, subsections at 20, rows at 14 to 16.',
  button: 'Button labels, matched to control size.',
  label: 'Single-line UI text: labels, table cells, metadata.',
  copy: 'Running text and multi-line descriptions.',
};
const groups = Object.entries(GROUPS).map(([key, name]) => ({
  name,
  family: 'sans',
  styles: Object.entries(typeTokens).filter(([k]) => k.startsWith(`${key}-`)).map(([k, t]) => {
    const v = t.$value;
    return {
      name: `text-${k}`,
      ...(k.endsWith('-mono') ? { family: 'mono' } : {}),
      fontSize: v.fontSize, lineHeight: v.lineHeight, fontWeight: v.fontWeight,
      ...(v.letterSpacing && v.letterSpacing !== '0px' ? { letterSpacing: v.letterSpacing } : {}),
      usage: k.endsWith('-mono') ? `${typeUse[key]} Mono: clock times, ids, code.` : typeUse[key],
    };
  }),
}));

const tokens = {
  name: TITLE,
  version: 1,
  meta: { source: 'github', repo: 'foundingadmin/hiddengems', package: 'packages/facet', paths: { tokens: ['packages/facet/css/tokens.css', 'packages/facet/tokens'], fonts: ['packages/facet/fonts'], assets: ['packages/facet/kits/nfl/logos'], docs: ['packages/facet/DESIGN.md', 'packages/facet/components', 'packages/facet/patterns', 'packages/facet/foundations'] }, synced: new Date().toISOString().slice(0, 10) },
  color: { themes: [{ id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }], tokens: colors },
  type: {
    fonts: [
      { family: 'Facet Sans', file: 'fonts/Geist-Variable.woff2', weight: '100 900', style: 'normal' },
      { family: 'Facet Mono', file: 'fonts/GeistMono-Variable.woff2', weight: '100 900', style: 'normal' },
    ],
    families: { sans: '"Facet Sans", system-ui, -apple-system, "Segoe UI", sans-serif', mono: '"Facet Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
    groups,
  },
  spacing: { tokens: spacing },
  radius: { tokens: radius },
  shadow: { tokens: shadow },
  size: { note: 'Fixed sizes for controls, rows and layout.', tokens: size },
  zIndex: { tokens: zIndex },
};
write('tokens.json', `${JSON.stringify(tokens, null, 2)}\n`);

// ------------------------------------------------------------------ tokens.css (first copy; the page owns it after a save)
const resolveCss = (v) => (typeof v === 'string' && v.startsWith('{') ? `var(--${v.slice(1, -1)})` : v);
const themeVal = (t, id) => (typeof t.value === 'string' ? (id === 'light' ? t.value : null) : t.value[id] ?? null);
const decl = (n, v) => `  --${n.replace(/\./g, '\\.')}: ${resolveCss(v)};`;
const tcss = [`/* ${TITLE} - generated from tokens.json */`];
tcss.push(`:root, [data-theme="light"] {\n${[...colors, ...shadow].map((t) => decl(t.name, themeVal(t, 'light'))).join('\n')}\n}`);
tcss.push(`[data-theme="dark"] {\n${[...colors, ...shadow].filter((t) => themeVal(t, 'dark')).map((t) => decl(t.name, themeVal(t, 'dark'))).join('\n')}\n}`);
tcss.push(`:root {\n${[...spacing, ...radius, ...size, ...zIndex].map((t) => decl(t.name, t.value)).join('\n')}\n${Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`).join('\n')}\n}`);
for (const g of groups) for (const s of g.styles) {
  tcss.push(`.${s.name} { font-family: var(--font-${s.family ?? g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''} }`);
}
for (const f of tokens.type.fonts) tcss.push(`@font-face { font-family: "${f.family}"; src: url("${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`);
write('tokens.css', `${tcss.join('\n')}\n`);

// ------------------------------------------------------------------ components/bundle.css
// Facet's component CSS plus the variables tokens.json cannot hold (font stacks, motion, composite focus rings).
// Values that live in tokens.json are left out, so an edit on the page wins.
const rest = light.filter(([n]) => !exported.has(n));
const restDark = [...dark].filter(([n]) => !exported.has(n) && !colorOf(n));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripFontFace = (s) => s.replace(/@font-face\s*\{[^}]*\}/g, '');
const typographyModifiers = stripComments(read('css/typography.css')).replace(/\.text-[\w-]+\s*\{[^}]*\}/g, '');
const logo = (f) => `data:image/svg+xml;base64,${readFileSync(join(root, 'kits/nfl/logos', f)).toString('base64')}`;
const kit = stripComments(read('kits/nfl/teams.css')).replace(/url\("logos\/([a-z-]+\.svg)"\)/g, (_, f) => `url("${logo(f)}")`);
const bundle = [
  `:root {\n${rest.filter(([n]) => !n.startsWith('fc-font-')).map(([n, v]) => `  --${n}: ${v};`).join('\n')}\n  --fc-font-sans: var(--font-sans);\n  --fc-font-mono: var(--font-mono);\n}`,
  `[data-theme="dark"] {\n${restDark.map(([n, v]) => `  --${n}: ${v};`).join('\n')}\n  color-scheme: dark;\n}`,
  '[data-theme="light"] { color-scheme: light; }',
  'body { margin: 0; background: var(--fc-surface-canvas); color: var(--fc-text-primary); font-family: var(--fc-font-sans); }',
  stripFontFace(stripComments(read('css/base.css'))),
  typographyModifiers,
  ...['materials', 'components', 'data', 'charts', 'lists', 'forms', 'shell', 'settings', 'surfaces', 'teams'].map((f) => stripComments(read(`css/${f}.css`))),
  kit,
].join('\n').replace(/\n{3,}/g, '\n\n');
if (/<\/style/i.test(bundle)) throw new Error('bundle.css contains </style');
write('components/bundle.css', bundle);

// ------------------------------------------------------------------ fonts
mkdirSync(join(proj, 'fonts'), { recursive: true });
for (const f of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2', 'OFL-LICENSE.txt']) copyFileSync(join(root, 'fonts', f), join(proj, 'fonts', f));

// ------------------------------------------------------------------ components: guidelines and previews
const icon = (d) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const info = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="7" opacity=".25"/><path d="M7.25 7h1.5v5h-1.5zM7.25 4h1.5v1.5h-1.5z"/></svg>';
const GEM_SVG = '<svg viewBox="0 0 24 22" aria-hidden="true"><path class="fc-gem-fill" d="M6 1h12l5 7-11 13L1 8Z"/><path class="fc-gem-cut" d="M1 8h22M8.5 1 6.5 8l5.5 13 5.5-13-2-7"/></svg>';
const gem = (r) => (r == null
  ? `<span class="fc-gem" data-fools aria-label="Fool's Gold">${GEM_SVG}</span><span class="fc-gem-fools text-label-12">Fool's Gold</span>`
  : `<span class="fc-gem" style="--rating: ${r}" aria-label="Gem rating ${r}">${GEM_SVG}<span>${r}</span></span>`);
const row = (inner, gap = 12) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:${gap}px;padding:16px">${inner}</div>`;
const stack = (inner, gap = 12) => `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:${gap}px;padding:16px">${inner}</div>`;
const player = (team, name, num, detail) => `<span class="fc-player"><span class="fc-player-avatar" data-team="${team}" role="img" aria-label="${team}"></span><span class="fc-player-main"><span class="fc-player-line"><span class="fc-player-name">${name}</span><span class="fc-player-number">#${num}</span></span><span class="fc-player-meta">${detail}</span></span></span>`;
const team = (id, nameText, extra = '') => `<span class="fc-team" data-team="${id}"${extra}><span class="fc-team-mark" aria-hidden="true">${extra.includes('abbr') ? id.toUpperCase() : ''}</span><span class="fc-team-name">${nameText}</span></span>`;

const COMPONENTS = [
  { name: 'Button', spec: 'button', group: 'Actions', height: 120, html: row(['', 'secondary', 'tertiary', 'error'].map((v) => `<button class="fc-button"${v ? ` data-variant="${v}"` : ''}>${v ? v[0].toUpperCase() + v.slice(1) : 'Primary'}</button>`).join('') + '<button class="fc-button" data-size="small" data-variant="secondary">Small</button>') },
  { name: 'LinkAction', spec: 'link-action', group: 'Actions', height: 88, html: row('<a class="fc-link-action" href="#">View runs</a><a class="fc-link-action" data-external href="#">Provider status</a><a class="fc-link-action" data-tone="quiet" href="#">Edit</a>', 24) },
  { name: 'Badge', spec: 'badge', group: 'Status', height: 120, html: stack(row(['gray', 'blue', 'green', 'amber', 'red', 'purple'].map((v) => `<span class="fc-badge" data-variant="${v}">${v}</span>`).join(''), 8).replace('padding:16px', 'padding:0') + row(['gray', 'blue', 'green', 'amber', 'red', 'purple'].map((v) => `<span class="fc-badge" data-contrast="low" data-variant="${v}">${v}</span>`).join(''), 8).replace('padding:16px', 'padding:0'), 8) },
  { name: 'Note', spec: 'note', group: 'Status', height: 220, html: stack([['', 'Estimates use the last 3 to 7 games, so treat small gaps as directional.'], ['info', 'Odds are pulled every 5 minutes on game days.'], ['warning', 'Gesicki depends on Chase and Higgins playing.'], ['error', 'FanDuel rejected the key, so its odds are 3 hours old.']].map(([t, s]) => `<div class="fc-note"${t ? ` data-type="${t}"` : ''} style="width:100%">${info}<span>${s}</span></div>`).join(''), 8) },
  { name: 'Signal', spec: 'status-dot', group: 'Hidden Gems', height: 88, html: row([['go', 'Go'], ['wait', 'Wait'], ['stop', 'Stop'], ['none', 'Unchecked']].map(([s, w]) => `<span class="fc-signal" data-signal="${s}">${w}</span>`).join(''), 20), readme: '# Signal\n\nThe verdict on a pick, as a dot plus a word: Go, Wait, Stop or Unchecked. Color is never the only cue.\n\n- Markup: `<span class="fc-signal" data-signal="go|wait|stop|none">Go</span>`.\n- The verdict is a conclusion, so it is one word; the signal strip is its evidence.\n- Unchecked is its own state, never counted as a pass or a fail.\n- Colors come from `--fc-signal-go-*`, `--fc-signal-wait-*`, `--fc-signal-stop-*`, `--fc-signal-none-*`.\n' },
  { name: 'SignalStrip', group: 'Hidden Gems', height: 88, html: row([['go', 'go', 'wait', 'go', 'go', 'go'], ['none', 'go', 'wait', 'go', 'wait', 'go'], ['wait', 'go', 'stop', 'go', 'stop', 'wait']].map((s) => `<span class="fc-signal-strip" role="img" aria-label="${s.join(', ')}">${s.map((x) => `<i data-signal="${x}"></i>`).join('')}</span>`).join(''), 24), readme: '# SignalStrip\n\nThe six signals behind a verdict, as dots in a fixed order: setup, track record, sample, price gap, matchup, market.\n\n- Markup: `<span class="fc-signal-strip" role="img" aria-label="5 go, 1 wait">` with six `<i data-signal="go|wait|stop|none">`.\n- A hollow ring means unchecked.\n- Always give the strip an `aria-label` summary ("5 go, 1 wait").\n' },
  { name: 'Delta', group: 'Hidden Gems', height: 88, html: row('<span class="fc-delta" data-direction="positive">+13 pts</span><span class="fc-delta" data-direction="negative">−3 pts</span><span class="fc-delta" data-direction="neutral">0 pts</span>', 24), readme: '# Delta\n\nThe gap (edge) between our estimate and the priced chance, in percentage points: sign plus arrow plus color.\n\n- Markup: `<span class="fc-delta" data-direction="positive|negative|neutral">+13 pts</span>`.\n- Points, not percent. Use U+2212 for the minus sign.\n- Colors: `--fc-edge-positive`, `--fc-edge-negative`.\n' },
  { name: 'Gem', group: 'Hidden Gems', height: 120, html: stack(row([38, 64, 81, 92].map(gem).join('') + `<span style="display:inline-flex;gap:8px;align-items:center">${gem(null)}</span>`, 24).replace('padding:16px', 'padding:0') + gem(92).replace('class="fc-gem"', 'class="fc-gem" data-size="lg"'), 16), readme: "# Gem\n\nThe gem rating: one 0 to 100 number per gem, with purple that deepens as it rises. No tiers.\n\n- Markup: `<span class=\"fc-gem\" style=\"--rating: 92\" aria-label=\"Gem rating 92\">` with the gem SVG (`.fc-gem-fill`, `.fc-gem-cut`) and the number in a `<span>`.\n- The number is always beside the gem. Glow starts above 60.\n- A prop is a gem only if it clears the posted price. Otherwise it is Fool's Gold: `data-fools`, a hollow dashed gem in gray, with `.fc-gem-fools` reading \"Fool's Gold\". Never purple.\n- `data-live` adds the glint; `--fc-gem-delay` cascades it up a ranked table so the top gem lands last. Reduced motion stops it.\n- The rating is edge times clarity (docs/prd.md section 8). It comes from the model, never from CSS.\n" },
  { name: 'Freshness', spec: 'freshness', group: 'Hidden Gems', height: 88, html: row('<p class="fc-status" style="margin:0"><span class="fc-status-dot" data-state="live"></span>Odds updated 2m ago</p><p class="fc-status" style="margin:0"><span class="fc-status-dot" data-state="stale"></span>3h ago</p><p class="fc-status" style="margin:0"><span class="fc-status-dot" data-state="failed"></span>Pull failed</p>', 24) },
  { name: 'TeamMark', spec: 'team', group: 'Teams', height: 140, html: stack(row(`${team('kc', 'Chiefs')}${team('sea', 'Seahawks', ' data-mark="mono"')}${team('buf', 'Bills', ' data-mark="abbr"')}`, 24).replace('padding:16px', 'padding:0') + row(`<span class="fc-team" data-team="kc" data-size="sm"><span class="fc-team-mark" aria-hidden="true"></span><span class="fc-team-name">KC</span></span><span class="fc-team" data-team="kc" data-size="lg"><span class="fc-team-mark" aria-hidden="true"></span><span class="fc-team-name"><span class="fc-team-city">Kansas City</span>Chiefs</span></span>`, 24).replace('padding:16px', 'padding:0'), 16) },
  { name: 'Matchup', group: 'Teams', height: 120, html: stack(`<span class="fc-matchup">${team('buf', 'BUF')}<span class="fc-matchup-sep">@</span>${team('kc', 'KC')}</span><span class="fc-matchup">${team('min', 'Vikings')}<span class="fc-matchup-sep">vs</span>${team('pit', 'Steelers')}</span>`), readme: '# Matchup\n\nTwo teams in one game: away first, home second, joined by `@` (screen readers hear "at"); a neutral site reads "vs".\n\n- Markup: `<span class="fc-matchup">` with two `.fc-team` and a `.fc-matchup-sep` between them.\n- Scoreboard: `data-layout="stack"` puts away over home with value columns; set `--fc-matchup-values` to their count and put values in `.fc-matchup-value`.\n- Guidelines for marks: TeamMark.\n' },
  { name: 'Player', group: 'Teams', height: 200, html: stack(player('sea', 'Jaxon Smith-Njigba', 11, 'WR · 8 TDs') + player('cin', "Ja'Marr Chase", 1, 'WR · Anytime TD scorer') + player('kc', 'Travis Kelce', 87, 'TE · Receptions, over 4.5'), 16), readme: '# Player\n\nA player: the team logo tile once, then the name with the jersey number trailing it (#88) in secondary, then a detail line.\n\n- Markup: `.fc-player` > `.fc-player-avatar[data-team]` + `.fc-player-main` > `.fc-player-line` (`.fc-player-name`, `.fc-player-number`) + `.fc-player-meta`.\n- The logo appears once; the detail line does not repeat the team.\n- Tile sizes: `data-size="sm"` 32px in tables, default 40px, `lg` 56px.\n- The name truncates before the number does. Screen readers hear "number 88".\n' },
  { name: 'Table', spec: 'table', group: 'Data', height: 260, html: `<div class="fc-table-wrap" style="padding:16px"><table class="fc-table" data-interactive><thead><tr><th scope="col" data-grow>Pick<span class="fc-th-count">3</span></th><th scope="col">Kickoff</th><th scope="col" data-align="numeric">Odds</th><th scope="col" data-align="numeric">Edge</th><th scope="col" data-align="numeric">Clarity</th><th scope="col">Rating</th></tr></thead><tbody>${[['cin', 'Mike Gesicki', 88, 'TE · CIN @ BAL', '3.20', '+13 pts', 78, 78], ['ne', 'Stefon Diggs', 8, 'WR · NE @ SEA', '3.00', '+9 pts', 70, 63], ['buf', 'James Cook', 4, 'RB · MIA @ BUF', '2.65', '\u22122 pts', 82, null]].map(([t, n, no, d, o, g, cl, r]) => `<tr><th scope="row">${player(t, n, no, d).replace('class="fc-player-avatar"', 'class="fc-player-avatar" data-size="sm"')}</th><td><time>Sun 1:00 PM</time></td><td data-align="numeric">${o}</td><td data-align="numeric"><span class="fc-delta" data-direction="${r == null ? 'negative' : 'positive'}">${g}</span></td><td data-align="numeric">${cl}</td><td>${gem(r)}</td></tr>`).join('')}</tbody></table></div>` },
  { name: 'Stat', spec: 'stat', group: 'Data', height: 150, html: `<div style="padding:16px"><div class="fc-stat-strip" data-variant="cells" role="group" aria-label="Track record"><div class="fc-stat"><p class="fc-stat-label">Return on stake</p><p class="fc-stat-figure"><span class="fc-stat-value">+6.2%</span></p><p class="fc-stat-basis">41 picks, Weeks 1 to 8</p></div><div class="fc-stat"><p class="fc-stat-label">Hit rate</p><p class="fc-stat-figure"><span class="fc-stat-value">55%</span><span class="fc-stat-qualifier">23 of 42</span></p><p class="fc-stat-basis">Settled picks only</p></div><div class="fc-stat"><p class="fc-stat-label">Beat the closing line</p><p class="fc-stat-figure"><span class="fc-stat-value">29</span><span class="fc-stat-qualifier">of 41</span></p><p class="fc-stat-basis">Price moved our way before kickoff</p></div></div></div>` },
  { name: 'Progress', spec: 'progress', group: 'Data', height: 88, html: stack('<div class="fc-progress" role="progressbar" aria-label="Scoring markets" aria-valuemin="0" aria-valuemax="412" aria-valuenow="182" aria-valuetext="Step 3 of 4, scoring 182 of 412 markets" style="width:320px"><span class="fc-progress-fill" style="--value:61"></span><span class="fc-progress-stop" style="--at:25"></span><span class="fc-progress-stop" style="--at:50"></span><span class="fc-progress-stop" style="--at:75"></span></div>') },
  { name: 'Input', spec: 'input', group: 'Forms', height: 120, html: stack('<input class="fc-input" placeholder="Search players…" aria-label="Search players" style="width:280px"><input class="fc-input" data-size="small" value="Gesicki" aria-label="Player" style="width:280px">', 8) },
  { name: 'Select', spec: 'select', group: 'Forms', height: 88, html: row('<select class="fc-select" aria-label="Book" style="width:200px"><option>All books</option><option>DraftKings</option><option>FanDuel</option></select>') },
  { name: 'Checkbox', spec: 'checkbox', group: 'Forms', height: 88, html: row('<label style="display:inline-flex;gap:8px;align-items:center"><input type="checkbox" class="fc-check" checked> Anytime TD</label><label style="display:inline-flex;gap:8px;align-items:center"><input type="checkbox" class="fc-check"> First TD</label>', 24) },
  { name: 'Tabs', spec: 'tabs', group: 'Navigation', height: 88, html: `<div style="padding:0 16px"><nav class="fc-tabs" aria-label="Sections"><a class="fc-tab" href="#" aria-current="page">Slate</a><a class="fc-tab" href="#">History</a><a class="fc-tab" href="#">Data</a></nav></div>` },
  { name: 'PageHeader', spec: 'page-header', group: 'Navigation', height: 120, html: `<div style="padding:16px"><div class="fc-page-header"><div class="fc-page-header-text"><h1 class="text-heading-32">Odds pulls</h1><p class="fc-page-header-description text-copy-16">Every scheduled and manual pull, newest first.</p></div><div class="fc-page-header-actions"><button class="fc-button" data-variant="secondary" data-size="small">Pull now</button></div></div></div>` },
  { name: 'EmptyState', spec: 'empty-state', group: 'Feedback', height: 220, html: `<div class="fc-empty"><strong>No gems yet for Week 9</strong><span class="text-copy-14">Odds open Tuesday. The slate fills in as lines post.</span><button class="fc-button" data-variant="secondary" data-size="small">Notify me</button></div>` },
];

const firstSentence = (md) => (md.replace(/^#.*$/m, '').replace(/^>.*$/gm, '').trim().split('\n\n')[0] ?? '').replace(/\s+/g, ' ');
for (const c of COMPONENTS) {
  const md = c.readme ?? read(`components/${c.spec}.md`).replace(/^# .*$/m, `# ${c.name}`);
  write(`components/${c.name}/README.md`, md);
  write(`components/${c.name}/preview.html`, `<!-- @dsCard group="${c.group}" height=${c.height} -->\n<div>${c.html}</div>\n`);
  c.summary = firstSentence(md);
}

// ------------------------------------------------------------------ README and sections
const design = read('DESIGN.md');
const section = (title) => {
  const i = design.indexOf(`## ${title}`);
  if (i < 0) return '';
  const j = design.indexOf('\n## ', i + 3);
  return design.slice(i, j < 0 ? undefined : j).replace(/ `\[F\]`/g, '').trim();
};
const readme = `Facet is the design system behind Hidden Gems, a private research tool that ranks NFL bets. It is built for dense, decision-grade data: gray by default, one job per hue, numbers that line up, and every state said in words as well as color.

## Using it

- Reach color through semantic tokens first (\`--fc-text-primary\`, \`--fc-surface-canvas\`, \`--fc-border-default\`), primitives second (\`--ds-gray-1000\`), raw values never.
- Set type with the role classes only: \`text-heading-32\` for sections, \`text-heading-20\` for subsections, \`text-label-14\` for single-line UI text, \`text-copy-14\` for running text, the \`-mono\` roles for clock times and ids.
- Lay out siblings with flex or grid \`gap\` on the spacing scale (\`fc-space-2\` 8px, \`fc-space-4\` 16px, \`fc-space-8\` 32px).
- Controls are 32 (\`fc-control-small\`), 36 (\`fc-control-medium\`, default) or 40 (\`fc-control-large\`) tall. Table rows are \`fc-row-header\` 36 and \`fc-row-body\` 40.
- Corners: \`fc-radius-sm\` 6px on controls, \`fc-radius-md\` 8px on menus and cards, \`fc-radius-lg\` 12px on modals and sheets, \`fc-radius-full\` on pills.
- Focus is the brand accent: \`--fc-focus-color\` rings every focused control. Checked and on controls use \`--fc-control-on\`.
- Components are CSS classes (\`.fc-button\`, \`.fc-table\`, \`.fc-note\`): \`components/bundle.css\` holds them all. Each card shows the markup.

${section('Hue allocation (hard rule)')}

${section('Hidden Gems semantic language')}

## Content fundamentals

- Sentence case for every heading and label. No colons in titles, headings or nav labels.
- Say it once: never repeat what a tab, heading, column header or control already says.
- Earn every line: cut ledes that describe the layout, selling lines and restated sentences.
- Headlines name the purpose ("Odds pulls"), specifics live in the content.
- Messages carry their numbers: "Pulled 386 prices across 3 books for 5 games, 12 suspended".
- Errors say whose move it is: ours to fix ("Failed", with a fix action) or out of our hands ("Provider down", with a follow link).
- One word family per action: pull, not refresh, fetch or sync. "Ran 4.1s", "in 5m", "3h ago".
- No em dashes, no semicolons in UI copy.

## Visual foundations

- **Gray first.** Surfaces are \`--fc-surface-canvas\` and \`--fc-surface-subtle\`; text is \`--fc-text-primary\` on them, \`--fc-text-secondary\` for metadata. Borders are \`--fc-border-default\`; hairlines that sit on any surface use \`--fc-border-alpha\`.
- **Numbers.** Tabular figures everywhere digits line up. Odds as decimals (\`3.20\`), chances as whole percents (\`31%\`), gaps as signed points (\`+13 pts\`).
- **Times.** Clock and calendar times in mono (\`11:00 AM\`), relative times in sans (\`4m ago\`). Paired, the clock time leads in primary and the relative time sits under it in secondary.
- **Elevation.** Shadows only on floating surfaces: \`ds-shadow-border-base\` hairlines, \`ds-shadow-*\` for menus and modals. Never on cards in flow.
- **Motion.** Popovers 200ms, overlays 300ms, controls 150ms. The gem glint is the one sanctioned loop. Respect reduced motion.
- **Teams.** Team colors and logos live only inside team marks and player tiles, never in rows, text, charts or status.

## Iconography

Lucide icons at a 1.5 stroke, 16px in controls and 24px in tiles, drawn in \`currentColor\`. A dotted underline always opens a helper; it replaces info icons. Chevrons advance within the current space (expand, open a menu); arrows leave it: \`→\` stays in the app, \`↗\` opens a new tab. Team logos are the NFL's own marks (in the Teams asset group), used because Hidden Gems is private.
`;
write('README.md', readme);
write('Hidden Gems patterns.md', read('patterns/hidden-gems.md').replace(/ `\[F\]`/g, ''));
write('Writing.md', read('foundations/content.md'));

// ------------------------------------------------------------------ assets to upload
const gemMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="${lightMap.get('ds-purple-700')}" opacity=".35"/><path d="M12 21 7.5 9h9z" fill="${lightMap.get('ds-purple-700')}"/></svg>\n`;
mkdirSync(join(outDir, 'uploads/Logos'), { recursive: true });
mkdirSync(join(outDir, 'uploads/Teams'), { recursive: true });
writeFileSync(join(outDir, 'uploads/Logos/facet-mark.svg'), gemMark);
const teamsData = json('kits/nfl/teams.json').teams;
for (const t of teamsData) copyFileSync(join(root, 'kits/nfl/logos', `${t.id}.svg`), join(outDir, 'uploads/Teams', `${t.id}.svg`));
write('assets/Logos/README.md', '# Logos\n\n`facet-mark.svg` is the Facet gem mark in `ds-purple-700` (single ink; an `<img>` cannot recolor it). Pair it with the name set in `text-label-16`.\n');
write('assets/Teams/README.md', `# Teams\n\nThe 32 NFL team logos on their team-color tiles, from the NFL Colors community kit (Figma). Use them only inside team marks (\`.fc-team-mark\`) and player tiles (\`.fc-player-avatar\`); \`components/bundle.css\` already sets each by \`data-team\`. They are NFL trademarks, used here because Hidden Gems is private. Files are named by team id: ${teamsData.map((t) => `${t.id} (${t.abbr})`).join(', ')}.\n`);

// ------------------------------------------------------------------ cover
write('components/Cover/preview.html', `<!-- @dsCard height=300 -->
<div class="cover">
  <style>
    .cover { position: relative; width: 960px; height: 300px; overflow: hidden; background: var(--fc-surface-canvas); }
    .cover svg { position: absolute; left: 480px; top: 0; width: 480px; height: 300px; }
    .cover .ink { fill: var(--ds-gray-1000); }
    .cover .brand { fill: var(--fc-brand-solid); }
    .cover .go { fill: var(--fc-signal-go-solid); }
    .cover .wait { fill: var(--fc-signal-wait-solid); }
    .cover .tint { fill: var(--ds-purple-500); }
    .cover .muted { fill: var(--ds-gray-400); }
    .cover .t { rx: var(--fc-radius-md); }
    .cover h1 { position: absolute; left: 40px; bottom: 72px; margin: 0; font: 600 120px/0.92 var(--fc-font-sans); letter-spacing: -6px; color: var(--fc-text-primary); }
    .cover p { position: absolute; left: 40px; bottom: 40px; margin: 0; max-width: 440px; font: 400 14px/20px var(--fc-font-sans); color: var(--fc-text-secondary); }
  </style>
  <!-- blocks: ds-gray-1000 slab 192x300 (bleeds top and bottom), fc-brand-solid 144x144, ds-purple-500 tint 144x96, fc-signal-go-solid 96x48, fc-signal-wait-solid 48x48
       arrangement: one tall ink slab with satellites on a 48px (fc-space-12) module, flush right
       pattern: a dot grid at fc-space-6 pitch, "dense, decision-grade data on a 4px grid" picks the precise-technical row
       steps and radii: fc-space-6 24px pitch, fc-space-12 48px module, fc-radius-md 8px tile corners -->
  <svg viewBox="0 0 480 300" aria-hidden="true">
    <g class="muted">${Array.from({ length: 7 }, (_, r) => Array.from({ length: 6 }, (_, c) => `<circle cx="${36 + c * 24}" cy="${36 + r * 36}" r="2"/>`).join('')).join('')}</g>
    <rect class="ink" x="288" y="0" width="192" height="300"/>
    <rect class="brand t" x="192" y="48" width="144" height="144"/>
    <rect class="tint t" x="192" y="204" width="144" height="96"/>
    <rect class="go t" x="336" y="216" width="96" height="48"/>
    <rect class="wait t" x="384" y="48" width="48" height="48"/>
  </svg>
  <h1>Facet</h1>
  <p>Dense, decision-grade data: gray by default, one job per hue.</p>
</div>
`);

// manifest of what was written, for the publish step
const files = [];
(function list(dir, prefix) {
  for (const name of readdirSafe(dir)) {
    const p = join(dir, name), rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(p).isDirectory()) list(p, rel); else files.push(`project/${rel}`);
  }
})(proj, '');
function readdirSafe(d) { try { return readdirSync(d); } catch { return []; } }
writeFileSync(join(outDir, 'files.json'), JSON.stringify(Object.fromEntries(files.filter((f) => f !== 'project/design-system.json').map((f) => [f, f])), null, 2));
console.log(`wrote ${files.length} files to ${proj}: ${colors.length} colors, ${groups.reduce((n, g) => n + g.styles.length, 0)} type styles, ${spacing.length} spacing, ${radius.length} radii, ${shadow.length} shadows, ${COMPONENTS.length} components`);
console.log(JSON.stringify(COMPONENTS.map((c) => c.name)));

// ------------------------------------------------------------------ index (after uploads)
function writeIndex(uploads) {
  const groupsOrder = ['Logos', 'Teams'];
  const assetGroups = {};
  for (const g of groupsOrder) {
    const entries = Object.entries(uploads).filter(([k]) => k.startsWith(`${g}/`));
    assetGroups[g] = {
      name: g, tile: g === 'Logos' ? 'l' : 's',
      order: entries.map(([k]) => k.slice(g.length + 1)),
      files: Object.fromEntries(entries.map(([k, u]) => [k.slice(g.length + 1), { name: k.slice(g.length + 1), blob: u.blob, size: u.size, type: 'image/svg+xml' }])),
    };
  }
  const index = {
    v: 3, layout: 'files', createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') },
    title: TITLE, namespace: 'Facet', libraries: [], sections: {}, groups: groupsOrder, assetGroups, blobs: {},
    docs: { readme: 'project/README.md', sections: [] },
    lastChange: { by: 'Titus', at: new Date().toISOString(), via: 'GitHub · foundingadmin/hiddengems', note: 'Built from packages/facet: tokens, type roles, fonts, component CSS, 21 component cards, team logos.' },
  };
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, 'design-system.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log('wrote project/design-system.json');
}
