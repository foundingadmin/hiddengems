// Applies each week's read (experiments/backtest/reads/WK{n}.json, from the capsule-reader subagent) to MOD1q and
// MOD2, writing MOD1 and MOD3 ledgers. keep stays, cut leaves, downgrade lowers the level by one (GEM1 stays GEM1).
// Every pick must have a verdict; a missing one fails the run rather than defaulting to keep.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LEDGER_DIR, OUT_DIR, PLAN_PATH } from './paths';
import type { PlanWeek } from './plan';
import { type Ledger, resultOf } from './replay';
import { writeReadme } from './report';

export interface Verdict { selection_key: string; verdict: 'keep' | 'cut' | 'downgrade'; why: string }

const PAIRS = [['MOD1q', 'MOD1'], ['MOD2', 'MOD3']] as const;

if (import.meta.url === `file://${process.argv[1]}`) {
  const plan: PlanWeek[] = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
  for (const w of plan) {
    const readPath = `${OUT_DIR}/reads/WK${w.week}.json`;
    const reads: Verdict[] = existsSync(readPath) ? JSON.parse(readFileSync(readPath, 'utf8')) : [];
    const by = new Map(reads.map((r) => [r.selection_key, r]));
    for (const [from, to] of PAIRS) for (const seg of ['AM', 'PM', 'SNF'] as const) {
      const src: Ledger = JSON.parse(readFileSync(`${LEDGER_DIR}/${from}-WK${w.week}${seg}-back.json`, 'utf8'));
      const picks = src.picks.flatMap((p) => {
        const r = by.get(p.selection_key);
        if (!r) throw new Error(`Week ${w.week}: no read for ${p.selection_key}`);
        if (r.verdict === 'cut') return [];
        return [{ ...p, gem_level: r.verdict === 'downgrade' ? Math.max(1, p.gem_level - 1) : p.gem_level, reads: [`${r.verdict} · ${r.why}`] }];
      });
      const out: Ledger = { ...src, run: `${to}-WK${w.week}${seg}-back`, mod: to, picks, result: resultOf(picks) };
      writeFileSync(`${LEDGER_DIR}/${out.run}.json`, `${JSON.stringify(out, null, 2)}\n`);
    }
    const cut = reads.filter((r) => r.verdict === 'cut').length, down = reads.filter((r) => r.verdict === 'downgrade').length;
    console.log(`Week ${w.week}: ${reads.length} reads, ${cut} cut, ${down} downgraded`);
  }
  writeReadme();
}
