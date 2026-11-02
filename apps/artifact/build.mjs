#!/usr/bin/env node
// Builds the artifact page: node apps/artifact/build.mjs  ->  apps/artifact/dist/hidden-gems.html
// Inlines the Facet CSS it uses, the fonts and the NFL kit's logos as data URIs, plus team names,
// because an artifact page loads nothing from other hosts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const facet = join(here, '../../packages/facet');
const read = (p) => readFileSync(p, 'utf8');
const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;

const sheets = ['tokens', 'base', 'typography', 'components', 'data', 'charts', 'shell', 'teams'];
let css = sheets.map((s) => read(join(facet, 'css', `${s}.css`))).join('\n');
css = css.replace(/url\("\.\.\/fonts\/([^"]+\.woff2)"\)/g, (_, f) => `url("${dataUri(join(facet, 'fonts', f), 'font/woff2')}")`);
const kit = read(join(facet, 'kits/nfl/teams.css'))
  .replace(/url\("logos\/([a-z-]+\.svg)"\)/g, (_, f) => `url("${dataUri(join(facet, 'kits/nfl/logos', f), 'image/svg+xml')}")`);
css = `${css}\n${kit}`.replace(/\/\*[\s\S]*?\*\//g, '');

const teams = JSON.parse(read(join(facet, 'kits/nfl/teams.json'))).teams;
const names = Object.fromEntries(teams.map((t) => [t.id, `${t.city} ${t.name}`]));

const page = read(join(here, 'src/page.html'))
  .replace('/*__FACET__*/', () => css)
  .replace('/*__DATA__*/', () => `const TEAM_NAMES = ${JSON.stringify(names)};`)
  .replace('/*__APP__*/', () => read(join(here, 'src/app.js')));

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/hidden-gems.html'), page);
console.log(`wrote apps/artifact/dist/hidden-gems.html (${Math.round(page.length / 1024)} KB)`);
