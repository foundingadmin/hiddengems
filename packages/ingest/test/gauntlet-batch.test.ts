// The MOD8 to MOD15 rules batch (ops/gauntlet/batch.ts): the committed files are what seed 20261108 draws.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type Rules, SEED_IDS } from '../../../ops/gauntlet/contract';
import { BATCH_MODS, BATCH_SEED, RANGES, batchPath, drawBatch, serialize } from '../../../ops/gauntlet/batch';

const mod7 = JSON.parse(readFileSync(new URL('../../../ops/gauntlet/rules.json', import.meta.url), 'utf8')) as Rules;
const batch = drawBatch(mod7);

describe('rules batch', () => {
  it('matches the committed files, frozen aside', () => {
    expect(batch.map((r) => r.mod)).toEqual(BATCH_MODS.map((n) => `MOD${n}`));
    for (const r of batch) {
      const had = JSON.parse(readFileSync(batchPath(r.mod!), 'utf8')) as Rules;
      expect(serialize({ ...had, frozen: false })).toBe(serialize(r));
      expect(had.generator).toEqual({ seed: BATCH_SEED, draw: BATCH_MODS.indexOf(Number(r.mod!.slice(3)) as never) + 1 });
    }
  });

  it('draws every value inside its range and keeps the rest of MOD7, luckBandSd aside', () => {
    const inside = (x: number, [lo, hi]: readonly [number, number]) => x >= lo && x <= hi;
    for (const r of batch) {
      expect(Number.isInteger(r.picksPerWeek) && inside(r.picksPerWeek, RANGES.picksPerWeek)).toBe(true);
      expect(inside(r.minPrice, RANGES.minPrice) && inside(r.maxPrice, RANGES.maxPrice)).toBe(true);
      expect(inside(r.maxStep, RANGES.maxStep) && inside(r.poolingLines, RANGES.poolingLines)).toBe(true);
      expect(typeof r.vetoAsFilter).toBe('boolean');
      expect(typeof r.capByLines).toBe('boolean');
      expect(Object.keys(r.startWeights!).sort()).toEqual([...SEED_IDS].sort());
      expect(SEED_IDS.every((s) => r.startWeights![s] > 0)).toBe(true);
      expect(SEED_IDS.reduce((t, s) => t + r.startWeights![s], 0)).toBeCloseTo(1, 9);
      expect({ ...r.pass, luckBandSd: mod7.pass.luckBandSd }).toEqual(mod7.pass);
      expect(r.pass.luckBandSd).toBe(2.5);
      expect([r.warmup, r.stake, r.purse, r.perPlayer]).toEqual([mod7.warmup, mod7.stake, mod7.purse, mod7.perPlayer]);
    }
  });

  it('draws something else from another seed', () => {
    expect(serialize(drawBatch(mod7, BATCH_SEED + 1)[0]!)).not.toBe(serialize(batch[0]!));
  });
});
