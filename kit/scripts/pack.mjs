#!/usr/bin/env node
// Zips the kit for handing to another project: `node scripts/pack.mjs` writes dist/facet-kit-<version>.zip.
// The zip always carries the neutral brand (defaults, no logo), whatever this copy is branded as, so every
// project starts from the same place. Zero dependencies: the zip is written here with node:zlib.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { DEFAULTS } from './brand-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const SKIP = new Set(['node_modules', 'dist', '.git', '.DS_Store']);

// A clean copy with the brand reset, rebuilt so its generated files match.
const stage = join(mkdtempSync(join(tmpdir(), 'facet-kit-')), 'facet-kit');
cpSync(root, stage, { recursive: true, filter: (src) => !SKIP.has(src.split(sep).pop()) });
for (const f of readdirSync(join(stage, 'brand'))) if (f.endsWith('.svg')) rmSync(join(stage, 'brand', f));
writeFileSync(join(stage, 'brand/brand.json'), JSON.stringify(DEFAULTS, null, 2) + '\n');
const built = spawnSync(process.execPath, [join(stage, 'scripts/build.mjs')], { encoding: 'utf8' });
if (built.status !== 0) { console.error(built.stdout + built.stderr); process.exit(1); }

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(stage);

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // fixed stamp, so the same kit always zips to the same bytes

const parts = [], central = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from('facet-kit/' + relative(stage, file).split(sep).join('/'));
  const data = readFileSync(file);
  const packed = deflateRawSync(data, { level: 9 });
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt16LE(DOS_TIME, 10); head.writeUInt16LE(DOS_DATE, 12); head.writeUInt32LE(crc32(data), 14);
  head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(DOS_TIME, 12); entry.writeUInt16LE(DOS_DATE, 14); entry.writeUInt32LE(crc32(data), 16);
  entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  parts.push(head, name, packed);
  central.push(entry, name);
  offset += head.length + name.length + packed.length;
}
const dir = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', `facet-kit-${version}.zip`);
writeFileSync(out, Buffer.concat([...parts, dir, end]));
rmSync(dirname(stage), { recursive: true, force: true });
console.log(`wrote dist/facet-kit-${version}.zip  (${files.length} files, ${(statSync(out).size / 1024).toFixed(0)} kB)`);
