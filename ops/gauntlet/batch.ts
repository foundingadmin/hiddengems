// The random rules batch, MOD8 to MOD15 (approved by Josh, Nov 8 2026). One seeded generator draws every value
// uniformly from its range, in a fixed order, so the same seed always writes the same eight files:
//
//   per MOD, in order 8 to 15: ten start weights, picksPerWeek, minPrice, maxPrice, maxStep, poolingLines,
//   vetoAsFilter, capByLines
//
// Start weights are uniform over every way to split 1 ten ways (ten exponential draws, each divided by their sum),
// the same for the shared set and every bet type. Everything else, warm-up weeks and money included, is MOD7's, and
// so is every pass bar except luckBandSd, 2.5 for the whole batch. Files are written unfrozen; freezing is its own
// commit, after which nothing here may change them.
//
// Write:  packages/ingest/node_modules/.bin/tsx ops/gauntlet/batch.ts
// Check:  packages/ingest/node_modules/.bin/tsx ops/gauntlet/batch.ts --check   (the files match the seed, frozen aside)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Rules, SEED_IDS, type SeedId } from './contract';

const HERE = dirname(fileURLToPath(import.meta.url));
export const BATCH_SEED = 20261108;
export const BATCH_MODS = [8, 9, 10, 11, 12, 13, 14, 15] as const;
export const BATCH_DIR = join(HERE, 'rules');
export const RANGES = {
  picksPerWeek: [4, 12], minPrice: [1.3, 2], maxPrice: [3, 8], maxStep: [0.1, 0.4], poolingLines: [250, 4000],
} as const;
export const LUCK_BAND_SD = 2.5;

/** mulberry32: a small, well-known 32-bit generator. Floats in [0, 1). */
export function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

/** Ten shares adding to exactly 1 at six places: the rounding remainder goes to the largest share. */
function shares(next: () => number): Record<SeedId, number> {
  const raw = SEED_IDS.map(() => -Math.log(1 - next()));
  const total = raw.reduce((a, b) => a + b, 0);
  const micro = raw.map((x) => Math.round((x / total) * 1e6));
  const big = micro.indexOf(Math.max(...micro));
  micro[big]! += 1e6 - micro.reduce((a, b) => a + b, 0);
  return Object.fromEntries(SEED_IDS.map((s, i) => [s, micro[i]! / 1e6])) as Record<SeedId, number>;
}

export function drawBatch(base: Rules, seed = BATCH_SEED): Rules[] {
  const next = generator(seed);
  const between = ([lo, hi]: readonly [number, number]) => lo + next() * (hi - lo);
  return BATCH_MODS.map((n, i) => {
    const startWeights = shares(next);
    const picksPerWeek = RANGES.picksPerWeek[0] + Math.floor(next() * (RANGES.picksPerWeek[1] - RANGES.picksPerWeek[0] + 1));
    const minPrice = round(between(RANGES.minPrice), 2);
    const maxPrice = round(between(RANGES.maxPrice), 2);
    const maxStep = round(between(RANGES.maxStep), 3);
    const poolingLines = Math.round(between(RANGES.poolingLines));
    const vetoAsFilter = next() < 0.5;
    const capByLines = next() < 0.5;
    return {
      frozen: false,
      mod: `MOD${n}`,
      generator: { seed, draw: i + 1 },
      picksPerWeek, minPrice, maxPrice,
      perPlayer: base.perPlayer,
      maxStep, poolingLines, vetoAsFilter, capByLines, startWeights,
      warmup: base.warmup,
      stake: base.stake,
      purse: base.purse,
      pass: { ...base.pass, luckBandSd: LUCK_BAND_SD },
    };
  });
}

export const batchPath = (mod: string) => join(BATCH_DIR, `${mod}.json`);
export const serialize = (rules: Rules) => `${JSON.stringify(rules, null, 2)}\n`;
const mod7 = () => JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8')) as Rules;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const batch = drawBatch(mod7());
  if (process.argv.includes('--check')) {
    const off = batch.filter((r) => {
      const had = JSON.parse(readFileSync(batchPath(r.mod!), 'utf8')) as Rules;
      return serialize({ ...had, frozen: false }) !== serialize(r);
    });
    if (off.length) { console.error(`Not what seed ${BATCH_SEED} draws: ${off.map((r) => r.mod).join(', ')}`); process.exit(1); }
    console.log(`All ${batch.length} files match seed ${BATCH_SEED}`);
  } else {
    for (const r of batch) writeFileSync(batchPath(r.mod!), serialize(r));
    console.log(batch.map((r) => `${r.mod} ppw ${r.picksPerWeek} price ${r.minPrice}-${r.maxPrice} step ${r.maxStep} pool ${r.poolingLines} veto ${r.vetoAsFilter} cap ${r.capByLines}`).join('\n'));
  }
}
