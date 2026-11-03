#!/usr/bin/env node
// Bundles the specimen (preview/index.html, screens.html, content.html) into self-contained pages for the
// claude.ai specimen artifact (https://claude.ai/artifact/1JBqTw5d2DPmwRB91sEoUG):
//   node packages/facet/scripts/specimen.mjs [outDir]     -> <outDir>/index.html, screens.html, content.html
// CSS, fonts, scripts and team logos are inlined. index.html has no doctype or head wrapper because the
// artifact host adds one; the other two are full documents. The theme switcher is dropped (the host sets it).
// Every page carries <meta name="facet-source" content="sha256-..."> over the bundle, so a sync run can
// compare it with the published page and skip publishing when nothing changed. Prints that stamp last.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? join(root, 'dist/specimen');
const read = (p) => readFileSync(join(root, p), 'utf8');
const b64 = (p) => readFileSync(join(root, p)).toString('base64');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
// Function replacers throughout: inlined sources contain "$" sequences a string replacement would expand.
const swap = (s, from, to) => s.split(from).join(to);

const SHEETS = ['tokens', 'base', 'typography', 'materials', 'components', 'data', 'charts', 'lists', 'teams', 'forms', 'shell', 'settings', 'surfaces'];
let css = SHEETS.map((f) => read(`css/${f}.css`)).join('\n') + '\n';
for (const font of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2']) {
  css = swap(css, `url("../fonts/${font}")`, `url(data:font/woff2;base64,${b64(`fonts/${font}`)})`);
}
css += `
.fc-page{padding-left:max(var(--fc-page-margin),env(safe-area-inset-left,0px));padding-right:max(var(--fc-page-margin),env(safe-area-inset-right,0px))}
@media (max-width:600px){.fc-page{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
.sp-nav{top:env(safe-area-inset-top,0px)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--fc-surface-canvas)}
`;
css += read('preview/specimen.css');
css = stripComments(css);
// Font family names: the bundled faces are registered under Facet names, so no upstream name ships.
css = swap(css, 'var(--font-geist-sans, "Geist"), "Geist Fallback", ', '"Facet Sans", ');
css = swap(css, 'var(--font-geist-mono, "Geist Mono"), ', '"Facet Mono", ');
css = swap(css, 'font-family: "Geist Mono";', 'font-family: "Facet Mono";');
css = swap(css, 'font-family: "Geist";', 'font-family: "Facet Sans";');

const kitCss = stripComments(read('kits/nfl/teams.css')).replace(
  /url\("logos\/([a-z-]+)\.svg"\)/g,
  (_, id) => `url("data:image/svg+xml;base64,${b64(`kits/nfl/logos/${id}.svg`)}")`,
);

let specimenJs = read('preview/specimen.js');
specimenJs = specimenJs.replace(/const root = document\.documentElement;[\s\S]*?document\.getElementById\('theme'\)\.addEventListener\([^\n]*\n/, () => '');
specimenJs = swap(specimenJs, '.fc-segmented:not(#theme)', '.fc-segmented');

const SCRIPTS = ['semantic-map.js', 'field.js', 'forms.js', 'time.js', 'teams.js', 'tips.js'];
const STAMP = '<meta name="facet-source" content="@STAMP@">';

function bundle(page, main) {
  const html = read(`preview/${page}`);
  const title = html.match(/<title>.*?<\/title>/)[0];
  const desc = html.match(/<meta name="description"[^>]*>/)[0];
  let body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  body = body.replace(/<div class="fc-segmented" data-size="small" role="radiogroup" aria-label="Theme" id="theme">[\s\S]*?<\/div>/, () => '');
  for (const s of SCRIPTS) body = swap(body, `<script src="${s}"></script>`, `<script>${read(`preview/${s}`)}</script>`);
  body = swap(body, '<script src="specimen.js"></script>', `<script>${specimenJs}</script>`);
  const pageCss = html.includes('teams.js') ? `${css}\n${kitCss}` : css;
  const head = `${title}\n${desc}\n${STAMP}\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${pageCss}</style>\n`;
  const out = main
    ? head + body
    : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}</head>\n<body>${body}</body>\n</html>\n`;

  if (/<script src=/.test(out)) throw new Error(`${page}: a script was not inlined`);
  if (out.includes('applyTheme') || out.includes('id="theme"')) throw new Error(`${page}: theme switcher left in`);
  let low = out.toLowerCase();
  for (const ok of ['--font-geist-sans', '--font-geist-mono', '"geist"', '"geist mono"', 'geist-variable', 'geistmono-variable']) low = swap(low, ok, '');
  if (low.includes('geist')) throw new Error(`${page}: upstream name in output: ${low.match(/.{40}geist.{40}/)?.[0]}`);
  return out;
}

const pages = [['index.html', 'index.html', true], ['screens.html', 'screens.html', false], ['content.html', 'content.html', false]]
  .map(([src, name, main]) => [name, bundle(src, main)]);
const hash = createHash('sha256');
for (const [name, out] of pages) hash.update(name).update('\0').update(out).update('\0');
const stamp = `sha256-${hash.digest('hex').slice(0, 16)}`;

mkdirSync(outDir, { recursive: true });
for (const [name, out] of pages) {
  writeFileSync(join(outDir, name), swap(out, '@STAMP@', stamp));
  console.log(`${name} ${Math.round(out.length / 1024)} KB`);
}
console.log(stamp);
