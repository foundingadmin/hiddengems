// The gauntlet run. Walks 2025 Week 1 to 2026 Week 8 in order: Saturday blend and pick from openWeek, write the
// picks, Monday reveal, write the results, Tuesday score and reweight, write the new weights. Then the report.
//
// It refuses to start unless rules.json is frozen and its sha256 matches --hash, and it runs once: the ledger lives
// in experiments/gauntlet/<hash>/, and a second run with the same hash finds that folder and stops, whether the first
// one finished or not.
//
// Run (after Josh freezes the rules and records the hash):
//   packages/ingest/node_modules/.bin/tsx ops/gauntlet/run.ts --hash <sha256 of the frozen rules.json>
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BET_TYPES, type BetType, type Pick, type Reveal, type Rules, SEED_IDS, type Seed, type SeedId, type WeekRef, type WeekWorld,
} from './contract';
import { type Gem, type LearnerState, type SeedChances, type WeekScores, learn, pick, score, startState } from './learner';
import { writeReport } from './report';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RULES_PATH = join(HERE, 'rules.json');
export const OUT_ROOT = join(HERE, '..', '..', 'experiments', 'gauntlet');

/** 2025 Weeks 1 to 18, then 2026 Weeks 1 to 8. */
export const WALK: WeekRef[] = [
  ...Array.from({ length: 18 }, (_, i) => ({ season: 2025 as const, week: i + 1 })),
  ...Array.from({ length: 8 }, (_, i) => ({ season: 2026 as const, week: i + 1 })),
];

export interface WorldSource {
  openWeek(ref: WeekRef): WeekWorld | Promise<WeekWorld>;
  reveal(ref: WeekRef, picks: Pick[]): Reveal | Promise<Reveal>;
}

export const weekId = (ref: WeekRef) => `${ref.season}-w${String(ref.week).padStart(2, '0')}`;
export const isWarmup = (ref: WeekRef, rules: Rules) => rules.warmup.some((w) => w.season === ref.season && w.week === ref.week);
export const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

// ---------------------------------------------------------------------------------------------------------------
// The ledger's files. Every type report.ts reads is here.

export interface RunFile {
  mod: 'MOD7';
  hash: string;
  rules: Rules;
  seeds: { id: SeedId; name: string }[];
  weeks: WeekRef[];
}

export interface PicksFile {
  ref: WeekRef;
  warmup: boolean;
  /** Board lines per bet type. */
  board: Record<BetType, number>;
  /** The weights the blend read this Saturday. */
  weights: LearnerState['weights'];
  gems: Gem[];
}

export interface GemResult { key: string; outcome: { value: number; hit: boolean } | null; close: number | null }

export interface ResultsFile {
  ref: WeekRef;
  warmup: boolean;
  gems: GemResult[];
  scores: WeekScores;
  /** The state after this Tuesday's reweight, which next Saturday reads. */
  state: LearnerState;
}

/** Writes a new file and flushes it to disk, failing if the file is already there. */
function writeOnce(path: string, value: unknown) {
  const fd = openSync(path, 'wx');
  try { writeSync(fd, `${JSON.stringify(value, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
}

// ---------------------------------------------------------------------------------------------------------------
// The gate

export function readRules(rulesPath: string, hash: string): Rules {
  const bytes = readFileSync(rulesPath);
  const rules = JSON.parse(bytes.toString('utf8')) as Rules;
  if (rules.frozen !== true) throw new Error(`Refusing to run: ${rulesPath} is not frozen`);
  const actual = sha256(bytes);
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Refusing to run: --hash must be the 64 character sha256 of the frozen rules.json');
  if (actual !== hash) throw new Error(`Refusing to run: rules.json hashes to ${actual}, not ${hash}`);
  for (const k of ['picksPerWeek', 'minPrice', 'maxPrice', 'perPlayer', 'maxStep', 'poolingLines', 'stake', 'purse'] as const) {
    if (typeof rules[k] !== 'number' || !Number.isFinite(rules[k])) throw new Error(`Refusing to run: rules.${k} is not a number`);
  }
  if (!(rules.maxStep > 0 && rules.maxStep < 1)) throw new Error('Refusing to run: rules.maxStep must be between 0 and 1');
  if (!Array.isArray(rules.warmup)) throw new Error('Refusing to run: rules.warmup is not a list');
  return rules;
}

function checkSeeds(seeds: Seed[]) {
  const ids = seeds.map((s) => s.id).sort();
  const want = [...SEED_IDS].sort();
  if (ids.length !== want.length || ids.some((id, i) => id !== want[i])) {
    throw new Error(`Refusing to run: the seeds must be exactly ${want.join(', ')} (got ${ids.join(', ')})`);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The walk

export interface RunOptions {
  hash: string;
  world: WorldSource;
  seeds: Seed[];
  rulesPath?: string;
  outRoot?: string;
  /** Tests only. The real run always walks WALK. */
  weeks?: WeekRef[];
  log?: (line: string) => void;
}

export async function runGauntlet(opts: RunOptions): Promise<{ dir: string; reportPath: string }> {
  const rules = readRules(opts.rulesPath ?? RULES_PATH, opts.hash);
  checkSeeds(opts.seeds);
  const weeks = opts.weeks ?? WALK;
  const log = opts.log ?? ((line: string) => console.log(line));
  const root = opts.outRoot ?? OUT_ROOT;
  mkdirSync(root, { recursive: true });
  const dir = join(root, opts.hash);
  try {
    mkdirSync(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Refusing to run: ${dir} exists, so this hash has already run`);
    throw e;
  }
  const run: RunFile = { mod: 'MOD7', hash: opts.hash, rules, seeds: opts.seeds.map((s) => ({ id: s.id, name: s.name })), weeks };
  writeOnce(join(dir, 'run.json'), run);

  const seeds = [...opts.seeds].sort((a, b) => SEED_IDS.indexOf(a.id) - SEED_IDS.indexOf(b.id));
  let state = startState();
  for (const ref of weeks) {
    const id = weekId(ref);
    const warmup = isWarmup(ref, rules);
    const world = await opts.world.openWeek(ref);
    if (world.ref.season !== ref.season || world.ref.week !== ref.week) throw new Error(`openWeek(${id}) returned another week`);

    // Saturday. Every seed reads the same world; the blend reads this week's weights.
    const chances = Object.fromEntries(seeds.map((s) => [s.id, s.read(world)])) as SeedChances;
    const gems = pick(world.lines, chances, state.weights, rules);
    const board = Object.fromEntries(BET_TYPES.map((b) => [b, world.lines.filter((l) => l.betType === b).length])) as Record<BetType, number>;
    writeOnce(join(dir, `${id}-picks.json`), { ref, warmup, board, weights: state.weights, gems } satisfies PicksFile);

    // Monday. Only now does the week's outcome exist.
    const picks: Pick[] = gems.map(({ key, line, chance, edge, contributions }) => ({ key, line, chance, edge, contributions }));
    const reveal = await opts.world.reveal(ref, picks);
    const results: GemResult[] = gems.map((g) => ({
      key: g.key,
      outcome: reveal.outcomes.get(g.key) ?? null,
      close: reveal.close.get(g.key) ?? null,
    }));

    // Tuesday.
    const scores = score(world.lines, chances, reveal);
    state = learn(state, scores, rules);
    writeOnce(join(dir, `${id}-results.json`), { ref, warmup, gems: results, scores, state } satisfies ResultsFile);

    const graded = results.filter((r) => r.outcome);
    const hits = graded.filter((r) => r.outcome!.hit).length;
    log(`${id}${warmup ? ' warm-up' : ''}  ${gems.length} gems, ${hits} of ${graded.length} hit, ${Object.values(scores.graded).reduce((a, b) => a + b, 0)} lines graded`);
  }

  const reportPath = writeReport(dir);
  log(`Report ${reportPath}`);
  return { dir, reportPath };
}

// ---------------------------------------------------------------------------------------------------------------
// The command. The loader (world.ts) and the seeds (seeds/index.ts) are separate builds, read only when it runs.

async function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--hash');
  const hash = at >= 0 ? args[at + 1] : undefined;
  if (!hash) throw new Error('Usage: tsx ops/gauntlet/run.ts --hash <sha256 of the frozen rules.json>');
  // Check the gate before loading anything, so a wrong hash costs nothing.
  readRules(RULES_PATH, hash);
  const world = (await import(pathToFileURL(join(HERE, 'world.ts')).href)) as Partial<WorldSource>;
  if (typeof world.openWeek !== 'function' || typeof world.reveal !== 'function') throw new Error('world.ts must export openWeek and reveal');
  const mod = (await import(pathToFileURL(join(HERE, 'seeds', 'index.ts')).href)) as Record<string, unknown>;
  const seeds = (mod.SEEDS ?? mod.seeds ?? mod.default) as Seed[] | undefined;
  if (!Array.isArray(seeds)) throw new Error('seeds/index.ts must export the ten seeds as SEEDS');
  await runGauntlet({ hash, seeds, world: { openWeek: world.openWeek.bind(world), reveal: world.reveal.bind(world) } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
