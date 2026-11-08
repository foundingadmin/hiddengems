// The MOD4, MOD5 and MOD6 harness: tailoring runs on Weeks 2 to 6, and one sealed run on Weeks 7 and 8.
//
//   tsx ops/backtest/mods/harness.ts --mod MOD4              one tailoring run (Weeks 2 to 6) of the card as it stands
//   tsx ops/backtest/mods/harness.ts --mod MOD4 --count      gem counts only (no outcomes), not a run
//   tsx ops/backtest/mods/harness.ts --sealed --hash MOD4=<sha256>,MOD5=<sha256>,MOD6=<sha256>
//                                                            the one run on Weeks 7 and 8, MOD2 alongside as the control
//
// Rules the harness enforces:
// - A tailoring run needs a pending line ("- Run N · what changes and why") at the end of experiments/mods/MODn-log.md,
//   written before the run. The harness appends the result under it. At most 15 runs per MOD.
// - Weeks 7 and 8 open only for --sealed, and only when every card is frozen and its sha256 matches the hash given.
//   Nothing from Weeks 7 or 8 is read, graded or printed otherwise.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { ROOT } from '../paths';
import { type Card, type Gem, type ModId, type Mod4Params, type Mod5Params, type Mod6Params, mod4, mod5, mod6 } from './models';
import { STATS, type World, buildWorld } from './world';

export const TUNING_WEEKS = [2, 3, 4, 5, 6];
export const SEALED_WEEKS = [7, 8];
export const MAX_RUNS = 15;
export const MODS_DIR = `${ROOT}/experiments/mods`;
const MODS: ModId[] = ['MOD4', 'MOD5', 'MOD6'];

export const cardPath = (m: ModId) => `${MODS_DIR}/${m}-card.json`;
const logPath = (m: ModId) => `${MODS_DIR}/${m}-log.md`;
export const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** The seal. Weeks 7 and 8 need every card frozen and hashed as given. */
export function openWorld(week: number, seal: Record<string, string> | null): World {
  if (SEALED_WEEKS.includes(week)) {
    if (!seal) throw new Error(`Week ${week} is sealed. Freeze the cards and run --sealed with their hashes.`);
    for (const m of MODS) {
      const card = JSON.parse(readFileSync(cardPath(m), 'utf8'));
      if (!card.frozen) throw new Error(`Seal: ${m} card is not frozen`);
      if (seal[m] !== sha256(cardPath(m))) throw new Error(`Seal: ${m} card hash ${sha256(cardPath(m))} does not match ${seal[m] ?? 'none given'}`);
    }
  } else if (!TUNING_WEEKS.includes(week)) throw new Error(`Week ${week} is outside the backtest`);
  return buildWorld(week);
}

export function runMod(m: ModId, w: World, params: unknown): Gem[] {
  if (m === 'MOD4') return mod4(w, params as Mod4Params);
  if (m === 'MOD5') return mod5(w, params as Mod5Params);
  return mod6(w, params as Mod6Params);
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
export interface Summary { gems: number; graded: number; hits: number; expected: number; z: number | null; roi: number | null; rawClv: number | null; perWeek: number; mainShare: number }
export function summarize(gems: Gem[], weeks: number): Summary {
  const g = gems.filter((x) => x.hit !== null);
  const expected = g.reduce((s, x) => s + x.implied, 0);
  const variance = g.reduce((s, x) => s + x.implied * (1 - x.implied), 0);
  const hits = g.filter((x) => x.hit).length;
  const clv = gems.map((x) => x.rawClv).filter((c): c is number => c !== null);
  return {
    gems: gems.length, graded: g.length, hits, expected: round(expected, 1), z: variance ? round((hits - expected) / Math.sqrt(variance), 2) : null,
    roi: g.length ? round(g.reduce((s, x) => s + (x.hit ? x.price - 1 : -1), 0) / g.length) : null,
    rawClv: clv.length ? round(clv.reduce((a, b) => a + b, 0) / clv.length, 4) : null,
    perWeek: round(gems.length / weeks, 1), mainShare: gems.length ? round(gems.filter((x) => x.position === 'MAIN').length / gems.length, 2) : 0,
  };
}
export const line = (s: Summary) => `gems ${s.gems} (${s.perWeek} a week, ${Math.round(s.mainShare * 100)}% main) · hits ${s.hits} vs ${s.expected} expected of ${s.graded} graded · z ${s.z ?? 'n/a'} · ROI ${s.roi === null ? 'n/a' : `${(s.roi * 100).toFixed(1)}%`} · raw CLV ${s.rawClv === null ? 'n/a' : `${(s.rawClv * 100).toFixed(2)}%`}`;

/** Share of the smaller MOD's gems that the other also took (same game, player and stat). */
export function overlap(a: Gem[], b: Gem[]): number {
  const k = (g: Gem) => `${g.gameId}|${g.playerId}|${g.stat}`;
  const sb = new Set(b.map(k));
  const shared = a.filter((g) => sb.has(k(g))).length;
  return Math.min(a.length, b.length) ? shared / Math.min(a.length, b.length) : 0;
}

function pendingRun(m: ModId): number {
  const text = existsSync(logPath(m)) ? readFileSync(logPath(m), 'utf8').trimEnd().split('\n') : [];
  const runs = text.map((l, i) => ({ i, n: Number(/^- Run (\d+) · /.exec(l)?.[1] ?? NaN) })).filter((r) => !Number.isNaN(r.n));
  const last = runs.at(-1);
  if (!last || text.slice(last.i + 1).some((l) => l.startsWith('  - Result'))) throw new Error(`Write the next run's line in ${logPath(m)} first ("- Run N · what changes and why").`);
  if (last.n > MAX_RUNS) throw new Error(`${m} has used its ${MAX_RUNS} runs.`);
  if (runs.length !== last.n) throw new Error(`${m} log numbering is off: run ${last.n} is line ${runs.length}`);
  return last.n;
}

const worlds = new Map<number, World>();
const world = (week: number, seal: Record<string, string> | null) => { if (!worlds.has(week)) worlds.set(week, openWorld(week, seal)); return worlds.get(week)!; };

function tune(m: ModId) {
  const n = pendingRun(m);
  const card: Card<unknown> = JSON.parse(readFileSync(cardPath(m), 'utf8'));
  if (card.frozen) throw new Error(`${m} card is frozen. No more tailoring.`);
  const gems = TUNING_WEEKS.flatMap((wk) => runMod(m, world(wk, null), card.params));
  const s = summarize(gems, TUNING_WEEKS.length);
  const others = MODS.filter((o) => o !== m).map((o) => {
    const f = `${MODS_DIR}/runs/${o}-latest.json`;
    return existsSync(f) ? `${o} ${Math.round(overlap(gems, JSON.parse(readFileSync(f, 'utf8')).gems) * 100)}%` : null;
  }).filter(Boolean);
  mkdirSync(`${MODS_DIR}/runs`, { recursive: true });
  const record = { mod: m, run: n, weeks: TUNING_WEEKS, params: card.params, summary: s, byWeek: Object.fromEntries(TUNING_WEEKS.map((wk) => [wk, summarize(gems.filter((g) => g.week === wk), 1)])),
    byMarket: Object.fromEntries(STATS.map((st) => [st, summarize(gems.filter((g) => g.stat === st), TUNING_WEEKS.length)]).filter(([, x]) => (x as Summary).gems)), gems };
  writeFileSync(`${MODS_DIR}/runs/${m}-run${String(n).padStart(2, '0')}.json`, `${JSON.stringify(record, null, 1)}\n`);
  writeFileSync(`${MODS_DIR}/runs/${m}-latest.json`, `${JSON.stringify(record, null, 1)}\n`);
  appendFileSync(logPath(m), `  - Result · ${line(s)}${others.length ? ` · overlap ${others.join(', ')}` : ''}\n`);
  console.log(`${m} run ${n}: ${line(s)}${others.length ? ` · overlap ${others.join(', ')}` : ''}`);
  for (const wk of TUNING_WEEKS) console.log(`  week ${wk}: ${line(record.byWeek[wk]!)}`);
  for (const [st, x] of Object.entries(record.byMarket)) console.log(`  ${st}: ${line(x as Summary)}`);
}

/** Gem counts only, no outcomes, prices at the close or hits: for sizing a card before spending a run. */
function count(m: ModId) {
  const card: Card<unknown> = JSON.parse(readFileSync(cardPath(m), 'utf8'));
  const gems = TUNING_WEEKS.flatMap((wk) => runMod(m, world(wk, null), card.params));
  const per = TUNING_WEEKS.map((wk) => gems.filter((g) => g.week === wk).length);
  const by = Object.fromEntries(STATS.map((st) => [st, gems.filter((g) => g.stat === st).length]).filter(([, n]) => n));
  console.log(`${m} count only: ${gems.length} gems, by week ${per.join(' ')}, ${Math.round((gems.filter((g) => g.position === 'MAIN').length / (gems.length || 1)) * 100)}% main, by market ${JSON.stringify(by)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (args.includes('--sealed')) {
    const seal = Object.fromEntries((arg('--hash') ?? '').split(',').filter(Boolean).map((p) => p.split('=') as [string, string]));
    const { sealedRun } = await import('./sealed');
    sealedRun(seal, (wk) => world(wk, seal));
    return;
  }
  const m = arg('--mod') as ModId | undefined;
  if (!m || !MODS.includes(m)) throw new Error('Pass --mod MOD4, MOD5 or MOD6, or --sealed --hash ...');
  if (args.includes('--count')) return count(m);
  tune(m);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
