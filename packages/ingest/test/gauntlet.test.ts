// The gauntlet learner, run and report (ops/gauntlet) on stub seeds and a synthetic world. No real week is read.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BET_TYPES, type Line, type Pick, type Reveal, type Rules, SEED_IDS, type Seed, type SeedId, type WeekRef, type WeekWorld,
} from '../../../ops/gauntlet/contract';
import {
  type SeedChances, type SeedSet, blend, evenSet, filterSeeds, inverseLogit, lineShares, logLoss, logit, noSides, noteSides, pick, pool,
  reweight, score, startState, startWeights, K_GRID, noteCalibration, shrinkChances, shrinks, startCalibration,
} from '../../../ops/gauntlet/learner';
import { type GauntletReport, luckBand } from '../../../ops/gauntlet/report';
import { type PicksFile, WALK, runGauntlet, sha256, weekId } from '../../../ops/gauntlet/run';

const draft = JSON.parse(readFileSync(new URL('../../../ops/gauntlet/rules.json', import.meta.url), 'utf8')) as Rules;
const rules: Rules = { ...draft, frozen: true };
const scratch = mkdtempSync(join(tmpdir(), 'gauntlet-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const silence = (): SeedChances => Object.fromEntries(SEED_IDS.map((s) => [s, new Map<string, number>()])) as SeedChances;
const line = (over: Partial<Line> = {}): Line => ({
  key: '2025|g1|p1|rush_yds|59.5', gameId: 'g1', playerId: 'p1', player: 'P One', team: 'AAA', opponent: 'BBB', position: 'RB',
  betType: 'rush_yds', alt: false, line: 59.5, price: 2, fair: 0.45, ...over,
});

describe('blend', () => {
  it('stands every silent seed in at fair', () => {
    const b = blend(line(), silence(), evenSet());
    expect(b.chance).toBeCloseTo(0.45, 12);
    expect(Object.values(b.seedChances).every((c) => c === null)).toBe(true);
  });

  it('is the weighted average in log odds, and the pushes add up from fair to the chance', () => {
    const c = silence();
    c.usage.set(line().key, 0.7);
    c.matchup.set(line().key, 0.3);
    const w = { ...evenSet(), usage: 0.3, matchup: 0.1, books_disagree: 0 } as SeedSet;
    const rest = 1 - 0.4;
    const want = 0.3 * logit(0.7) + 0.1 * logit(0.3) + rest * logit(0.45);
    const b = blend(line(), c, normalizeTo(w, 0.4, rest));
    expect(logit(b.chance)).toBeCloseTo(want, 10);
    const pushes = SEED_IDS.reduce((t, s) => t + b.contributions[s], 0);
    expect(logit(0.45) + pushes).toBeCloseTo(logit(b.chance), 10);
    expect(b.contributions.hot_hand).toBe(0);
  });
});

/** Keeps usage and matchup as given and spreads `rest` evenly over the other eight. */
function normalizeTo(w: SeedSet, _fixed: number, rest: number): SeedSet {
  const others: SeedId[] = SEED_IDS.filter((s) => s !== 'usage' && s !== 'matchup');
  return Object.fromEntries(SEED_IDS.map((s) => [s, others.includes(s) ? rest / others.length : w[s]])) as SeedSet;
}

describe('pick', () => {
  it('keeps odds 1.50 to 5.00 with positive edge, one per player, best edge first, up to 7', () => {
    const lines: Line[] = [];
    const c = silence();
    for (let i = 0; i < 12; i++) {
      for (const alt of [false, true]) {
        const l = line({ key: `k${i}${alt}`, playerId: `p${i}`, alt, price: 2 + i * 0.1, fair: 0.4 });
        lines.push(l);
        c.usage.set(l.key, 0.5 + i * 0.02 + (alt ? 0.01 : 0));
      }
    }
    lines.push(line({ key: 'cheap', playerId: 'px', price: 1.4, fair: 0.7 }), line({ key: 'long', playerId: 'py', price: 5.5, fair: 0.15 }));
    c.usage.set('cheap', 0.99).set('long', 0.99);
    const w = startWeights();
    w.byBetType.rush_yds = { ...evenSet(), usage: 1, ...Object.fromEntries(SEED_IDS.filter((s) => s !== 'usage').map((s) => [s, 0])) } as SeedSet;
    const gems = pick(lines, c, w, rules);
    expect(gems).toHaveLength(7);
    expect(new Set(gems.map((g) => g.line.playerId)).size).toBe(7);
    expect(gems.every((g) => g.edge > 0 && g.line.price >= 1.5 && g.line.price <= 5)).toBe(true);
    expect(gems.map((g) => g.edge)).toEqual([...gems.map((g) => g.edge)].sort((a, b) => b - a));
    expect(gems.map((g) => g.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(gems.every((g) => g.line.alt)).toBe(true);
  });

  it('picks nothing when no line beats 1 / price', () => {
    expect(pick([line({ price: 2, fair: 0.45 })], silence(), startWeights(), rules)).toEqual([]);
  });
});

describe('score', () => {
  it('sums each seed\'s log loss gain over fair on graded lines it spoke on, refunds left out', () => {
    const a = line({ key: 'a' });
    const b = line({ key: 'b', betType: 'pass_yds' });
    const r = line({ key: 'r' });
    const c = silence();
    c.usage.set('a', 0.8).set('b', 0.8).set('r', 0.8);
    c.matchup.set('a', 0.2);
    const reveal: Reveal = {
      ref: { season: 2025, week: 1 },
      outcomes: new Map([['a', { value: 80, hit: true }], ['b', { value: 10, hit: false }], ['r', null]]),
      close: new Map(),
    };
    const s = score([a, b, r], c, reveal);
    expect(s.graded).toEqual({ rush_yds: 1, reception_yds: 0, pass_yds: 1, rush_reception_yds: 0 });
    const gainA = logLoss(0.45, true) - logLoss(0.8, true);
    const gainB = logLoss(0.45, false) - logLoss(0.8, false);
    expect(s.byBetType.rush_yds.usage.gain).toBeCloseTo(gainA, 12);
    expect(s.shared.usage.gain).toBeCloseTo(gainA + gainB, 12);
    expect(s.shared.usage.lines).toBe(2);
    expect(s.shared.matchup.gain).toBeLessThan(0);
    expect(s.shared.hot_hand).toEqual({ gain: 0, lines: 0 });
  });
});

describe('reweight', () => {
  const scores = (gains: Partial<Record<SeedId, number>>) =>
    Object.fromEntries(SEED_IDS.map((s) => [s, gains[s] === undefined ? { gain: 0, lines: 0 } : { gain: gains[s]!, lines: 5 }])) as Record<SeedId, { gain: number; lines: number }>;

  it('moves the best up, the worst down, the rest by rank; silent seeds hold; the set adds to 1', () => {
    const before = evenSet();
    const after = reweight(before, scores({ usage: 3, matchup: 1, hot_hand: -1, cooling_off: -4 }), 0.2);
    expect(SEED_IDS.reduce((t, s) => t + after[s], 0)).toBeCloseTo(1, 12);
    expect(after.usage).toBeCloseTo(0.1 * 1.2, 12);
    expect(after.cooling_off).toBeCloseTo(0.1 * 0.8, 12);
    expect(after.usage > after.matchup && after.matchup > after.hot_hand && after.hot_hand > after.cooling_off).toBe(true);
    for (const s of ['books_disagree', 'next_man_up', 'game_script', 'follow_the_move', 'ladder_math', 'hidden_gems'] as const) {
      expect(after[s]).toBeCloseTo(0.1, 12);
    }
  });

  it('never moves a weight by more than maxStep of itself, even on lopsided sets', () => {
    const before = { ...Object.fromEntries(SEED_IDS.map((s) => [s, 0.4 / 7])), usage: 0.01, matchup: 0.5, hot_hand: 0.09 } as SeedSet;
    const after = reweight(before, scores({ usage: 5, matchup: -5, hot_hand: -6 }), 0.2);
    for (const s of SEED_IDS) expect(Math.abs(after[s] / before[s] - 1)).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(SEED_IDS.reduce((t, s) => t + after[s], 0)).toBeCloseTo(SEED_IDS.reduce((t, s) => t + before[s], 0), 12);
  });

  it('holds when fewer than two seeds spoke', () => {
    expect(reweight(evenSet(), scores({ usage: 9 }), 0.2)).toEqual(evenSet());
  });
});

describe('pool', () => {
  it('weighs a bet type\'s own set by lines / (lines + poolingLines)', () => {
    const own = { ...evenSet(), usage: 0.18, matchup: 0.02 } as SeedSet;
    const p = pool(own, evenSet(), 1000, 1000);
    expect(p.usage).toBeCloseTo(0.14, 12);
    expect(p.matchup).toBeCloseTo(0.06, 12);
    const none = pool(own, evenSet(), 0, 1000);
    for (const s of SEED_IDS) expect(none[s]).toBeCloseTo(0.1, 12);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// A synthetic world. True chances drive the results; DraftKings' fair chance is a noisy read of them.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

function syntheticWorld() {
  const truth = new Map<string, number>();
  const worlds = new Map<string, WeekWorld>();
  const calls: string[] = [];
  let ledger = '';
  function build(ref: WeekRef): WeekWorld {
    const r = rng(ref.season * 100 + ref.week);
    const lines: Line[] = [];
    for (let i = 0; i < 40; i++) {
      const betType = BET_TYPES[i % 4]!;
      const playerId = `p${i}`;
      for (const [j, alt] of [false, true, true].entries()) {
        const t = inverseLogit(gauss(r) * 0.8 - (alt ? 0.6 * j : 0));
        const fair = inverseLogit(logit(t) + gauss(r) * 0.5);
        const key = `${ref.season}|g${ref.week}-${i % 8}|${playerId}|${betType}|${50 + j * 10}`;
        truth.set(key, t);
        lines.push({
          key, gameId: `g${ref.week}-${i % 8}`, playerId, player: `Player ${i}`, team: `T${i % 8}`, opponent: `O${i % 8}`, position: 'WR',
          betType, alt, line: 50 + j * 10, price: Math.round((1 / (fair * 1.05)) * 100) / 100, fair,
        });
      }
    }
    return { ref, games: [], lines, board: [], early: null, scripts: new Map(), logs: [], injuries: [], depth: [], depthPrev: [] };
  }
  return {
    truth,
    calls,
    setLedger(dir: string) { ledger = dir; },
    source: {
      openWeek(ref: WeekRef) { calls.push(`open ${weekId(ref)}`); const w = build(ref); worlds.set(weekId(ref), w); return w; },
      async reveal(ref: WeekRef, picks: Pick[]): Promise<Reveal> {
        // The wall: the picks must be on disk before anything is revealed.
        expect(existsSync(join(ledger, `${weekId(ref)}-picks.json`))).toBe(true);
        calls.push(`reveal ${weekId(ref)} ${picks.length}`);
        const r = rng(ref.season * 1000 + ref.week);
        const outcomes = new Map<string, { value: number; hit: boolean } | null>();
        const close = new Map<string, number>();
        for (const l of worlds.get(weekId(ref))!.lines) {
          if (r() < 0.03) { outcomes.set(l.key, null); continue; }
          const hit = r() < truth.get(l.key)!;
          outcomes.set(l.key, { value: hit ? l.line + 5 : l.line - 5, hit });
          close.set(l.key, Math.round(l.price * (0.9 + r() * 0.15) * 100) / 100);
        }
        return { ref, outcomes, close };
      },
    },
  };
}

/** Stub seeds: one reads the truth, one reads it half the time, one is noise, one is backwards, the rest are silent. */
function stubSeeds(truth: Map<string, number>): Seed[] {
  const read = (f: (l: Line, i: number) => number | undefined) => (w: WeekWorld) => {
    const m = new Map<string, number>();
    w.lines.forEach((l, i) => { const p = f(l, i); if (p !== undefined) m.set(l.key, p); });
    return m;
  };
  const noise = rng(7);
  const by: Partial<Record<SeedId, Seed['read']>> = {
    usage: read((l) => truth.get(l.key)!),
    matchup: read((l, i) => (i % 2 ? inverseLogit(logit(truth.get(l.key)!) * 0.8) : undefined)),
    books_disagree: read((l) => inverseLogit(logit(l.fair) + gauss(noise) * 0.8)),
    hot_hand: read((l) => inverseLogit(2 * logit(l.fair) - logit(truth.get(l.key)!))),
  };
  return SEED_IDS.map((id) => ({ id, name: id, read: by[id] ?? (() => new Map()) }));
}

function frozenRules(dir: string, over: Partial<Rules> = {}) {
  const path = join(dir, 'rules.json');
  const text = `${JSON.stringify({ ...rules, ...over }, null, 2)}\n`;
  writeFileSync(path, text);
  return { path, hash: sha256(text) };
}

describe('run', () => {
  it('refuses rules that are not frozen, or that do not match the hash', async () => {
    const dir = mkdtempSync(join(scratch, 'gate-'));
    const w = syntheticWorld();
    const loose = frozenRules(dir, { frozen: false });
    await expect(runGauntlet({ hash: loose.hash, rulesPath: loose.path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} }))
      .rejects.toThrow(/not frozen/);
    const firm = frozenRules(dir);
    await expect(runGauntlet({ hash: 'f'.repeat(64), rulesPath: firm.path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} }))
      .rejects.toThrow(/hashes to/);
    await expect(runGauntlet({ hash: firm.hash, rulesPath: firm.path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth).slice(1), log: () => {} }))
      .rejects.toThrow(/exactly/);
    expect(w.calls).toEqual([]);
  });

  it('walks 2025 Week 1 to 2026 Week 8 once, learns, writes the ledger and fills the report', async () => {
    const dir = mkdtempSync(join(scratch, 'run-'));
    const w = syntheticWorld();
    const { path, hash } = frozenRules(dir);
    w.setLedger(join(dir, hash));
    const { reportPath } = await runGauntlet({ hash, rulesPath: path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} });

    expect(WALK).toHaveLength(26);
    expect(w.calls.filter((c) => c.startsWith('open')).map((c) => c.slice(5))).toEqual(WALK.map(weekId));
    expect(w.calls.filter((c, i) => c.startsWith('reveal') && !w.calls[i - 1]!.startsWith('open'))).toEqual([]);

    // A second run with the same hash is refused and touches nothing.
    const before = w.calls.length;
    await expect(runGauntlet({ hash, rulesPath: path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} }))
      .rejects.toThrow(/already run/);
    expect(w.calls.length).toBe(before);

    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GauntletReport;
    const holes: string[] = [];
    const walk = (v: unknown, at: string) => {
      if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) holes.push(at);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
    };
    walk(report, 'report');
    expect(holes).toEqual([]);

    // The seed that reads the truth ends up trusted most, the backwards one least.
    const shared = report.finalWeights.shared;
    expect(Math.max(...Object.values(shared))).toBe(shared.usage);
    expect(Math.min(...Object.values(shared))).toBe(shared.hot_hand);
    for (const s of ['next_man_up', 'game_script', 'follow_the_move', 'ladder_math', 'cooling_off', 'hidden_gems'] as const) {
      expect(shared[s]).toBeCloseTo(0.1, 12);
    }
    expect(SEED_IDS.reduce((t, s) => t + shared[s], 0)).toBeCloseTo(1, 5);

    expect(report.weekly).toHaveLength(26);
    expect(report.weekly.filter((x) => x.warmup)).toHaveLength(9);
    expect(report.weeks.graded).toBe(17);
    expect(report.weekly.every((x) => x.gems <= 7)).toBe(true);
    const graded = report.weekly.filter((x) => !x.warmup);
    expect(report.tiles.profit).toBeCloseTo(graded.reduce((t, x) => t + x.profit, 0), 6);
    expect(report.weekly.at(-1)!.runningProfit).toBeCloseTo(report.tiles.profit, 6);
    expect(report.weekly.at(-1)!.purse).toBeCloseTo(rules.purse + report.tiles.profit, 6);
    expect(report.weekly.at(-1)!.luckBand).toBeCloseTo(report.tiles.luckBand, 6);
    expect(report.tiles.wagered).toBe(report.tiles.graded * rules.stake);
    expect(report.verdict.checks.map((c) => c.id)).toEqual(['luck_band', 'both_seasons', 'beat_close', 'top_seeds']);
    expect(report.verdict.pass).toBe(report.verdict.checks.every((c) => c.pass));

    const money = (k: 'profit' | 'gems') => report.byBetType.reduce((t, b) => t + b.main[k] + b.alt[k], 0);
    expect(money('gems')).toBe(report.tiles.graded);
    expect(money('profit')).toBeCloseTo(report.tiles.profit, 6);
    expect(report.bySeed.reduce((t, b) => t + b.profit, 0)).toBeCloseTo(report.tiles.profit, 6);
    expect(report.finalWeights.byBetType.map((b) => b.lines).reduce((a, b) => a + b, 0)).toBeGreaterThan(2000);

    const g = report.sampleGem!;
    expect(g.seeds).toHaveLength(10);
    expect(g.fairLogOdds + g.seeds.reduce((t, s) => t + s.push, 0)).toBeCloseTo(g.chanceLogOdds, 4);
    expect(g.seeds.find((s) => s.seed === 'next_man_up')!.silent).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The batch's start weights and two switches, both off by default so MOD7 reruns as it ran.

const lopsided = Object.fromEntries(SEED_IDS.map((s, i) => [s, (i + 1) / 55])) as SeedSet;
const only = (seed: SeedId): SeedSet => Object.fromEntries(SEED_IDS.map((s) => [s, s === seed ? 1 : 0])) as SeedSet;
const spokenAll = (n: number) => Object.fromEntries(BET_TYPES.map((b) => [b, Object.fromEntries(SEED_IDS.map((s) => [s, n]))])) as Record<
  (typeof BET_TYPES)[number], Record<SeedId, number>
>;

describe('start weights', () => {
  it('start every set at the rules\' shares, the same for every bet type, or at 10% each without them', () => {
    const s = startState(lopsided);
    for (const set of [s.weights.shared, ...Object.values(s.weights.byBetType), ...Object.values(s.own)]) {
      for (const id of SEED_IDS) expect(set[id]).toBeCloseTo(lopsided[id], 12);
    }
    expect(startState().weights).toEqual(startWeights());
    expect(startWeights().shared).toEqual(evenSet());
  });
});

describe('capByLines', () => {
  it('scales each push by lines spoken / (lines spoken + poolingLines)', () => {
    const c = silence();
    c.usage.set(line().key, 0.7);
    const full = blend(line(), c, only('usage'));
    const half = blend(line(), c, only('usage'), { scale: lineShares({ ...spokenAll(0).rush_yds, usage: 1000 }, 1000) });
    expect(half.contributions.usage).toBeCloseTo(full.contributions.usage / 2, 12);
    expect(lineShares(spokenAll(0).rush_yds, 1000).usage).toBe(0);
  });

  it('leaves a seed with no graded lines at fair, so the first week picks nothing; off, rules match MOD7', () => {
    const c = silence();
    c.usage.set(line().key, 0.9);
    const w = startWeights();
    w.byBetType.rush_yds = only('usage');
    const on = { ...rules, capByLines: true };
    expect(pick([line()], c, w, on, { spoken: spokenAll(0) })).toEqual([]);
    expect(pick([line()], c, w, on, { spoken: spokenAll(3000) })).toHaveLength(1);
    expect(() => pick([line()], c, w, on)).toThrow(/capByLines/);
    expect(pick([line()], c, w, { ...rules, capByLines: false }, { spoken: spokenAll(0) })).toEqual(pick([line()], c, w, rules));
  });
});

describe('vetoAsFilter', () => {
  it('names the seeds that have only ever sat at or below fair, from the board alone', () => {
    const c = silence();
    c.hidden_gems.set('a', 0.4).set('b', 0.45);
    c.usage.set('a', 0.3);
    let sides = noteSides(noSides(), [line({ key: 'a' }), line({ key: 'b' })], c);
    expect(filterSeeds(sides)).toEqual(['usage', 'hidden_gems']);
    const later = silence();
    later.usage.set('z', 0.6);
    sides = noteSides(sides, [line({ key: 'z' })], later);
    expect(filterSeeds(sides)).toEqual(['hidden_gems']);
  });

  it('lets a filter seed block a pick but never lead one', () => {
    const c = silence();
    c.usage.set(line().key, 0.8);
    c.hidden_gems.set(line().key, 0.1);
    const w = startWeights();
    w.byBetType.rush_yds = { ...only('usage'), usage: 0.5, hidden_gems: 0.5 };
    const on = { ...rules, vetoAsFilter: true };
    // Below fair it pushes down exactly as it would unfiltered, and here that blocks the pick.
    expect(pick([line()], c, w, on, { filters: ['hidden_gems'] })).toEqual(pick([line()], c, w, rules));
    expect(pick([line()], c, w, on, { filters: ['hidden_gems'] })).toEqual([]);
    // A push above fair from a filter seed counts 0.
    const b = blend(line(), c, only('usage'), { filters: new Set<SeedId>(['usage']) });
    expect(b.contributions.usage).toBe(0);
    expect(b.chance).toBeCloseTo(0.45, 12);
    expect(() => pick([line()], c, w, on)).toThrow(/vetoAsFilter/);
  });
});

describe('batch rules', () => {
  it('refuses start weights that do not add to 1 or skip a seed, and switches that are not true or false', async () => {
    const dir = mkdtempSync(join(scratch, 'batch-gate-'));
    const w = syntheticWorld();
    const go = (over: Partial<Rules> | Record<string, unknown>) => {
      const f = frozenRules(dir, over as Partial<Rules>);
      return runGauntlet({ hash: f.hash, rulesPath: f.path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} });
    };
    await expect(go({ startWeights: { ...lopsided, usage: 0.5 } })).rejects.toThrow(/add to/);
    const { usage: _u, ...nine } = lopsided;
    await expect(go({ startWeights: nine as SeedSet })).rejects.toThrow(/exactly the ten/);
    await expect(go({ capByLines: 'yes' })).rejects.toThrow(/true or false/);
    expect(w.calls).toEqual([]);
  });

  it('with both switches off matches the rules that never name them, week for week', async () => {
    const dir = mkdtempSync(join(scratch, 'same-'));
    const walk = async (over: Partial<Rules>) => {
      const w = syntheticWorld();
      const f = frozenRules(mkdtempSync(join(dir, 'r-')), over);
      w.setLedger(join(dirname(f.path), f.hash));
      const { dir: out } = await runGauntlet({ hash: f.hash, rulesPath: f.path, outRoot: dirname(f.path), world: w.source, seeds: stubSeeds(w.truth), log: () => {} });
      return readdirSync(out).filter((n) => n !== 'run.json' && n !== 'report.json').map((n) => readFileSync(join(out, n), 'utf8'));
    };
    expect(await walk({ vetoAsFilter: false, capByLines: false })).toEqual(await walk({}));
  });

  it('runs a batch MOD with its start weights and both switches on, and keeps filter seeds out of the top seeds check', async () => {
    const dir = mkdtempSync(join(scratch, 'batch-'));
    const w = syntheticWorld();
    // Cooling off only ever shades fair down: a filter seed from the first board.
    const seeds = stubSeeds(w.truth).map((s) => (s.id === 'cooling_off'
      ? { ...s, read: (world: WeekWorld) => new Map(world.lines.map((l) => [l.key, inverseLogit(logit(l.fair) - 0.3)])) }
      : s));
    const startSet = Object.fromEntries(SEED_IDS.map((s) => [s, s === 'cooling_off' ? 0.5 : s === 'usage' ? 0.2 : 0.3 / 8])) as SeedSet;
    const { path, hash } = frozenRules(dir, { mod: 'MOD99', startWeights: startSet, vetoAsFilter: true, capByLines: true });
    w.setLedger(join(dir, hash));
    const { dir: out, reportPath } = await runGauntlet({ hash, rulesPath: path, outRoot: dir, world: w.source, seeds, log: () => {} });

    const first = JSON.parse(readFileSync(join(out, '2025-w01-picks.json'), 'utf8')) as PicksFile;
    expect(first.gems).toEqual([]);
    expect(first.filters).toEqual(['cooling_off']);
    expect(first.weights.byBetType.pass_yds.cooling_off).toBeCloseTo(0.5, 12);
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as GauntletReport;
    expect(report.mod).toBe('MOD99');
    const top = report.verdict.checks.find((c) => c.id === 'top_seeds')!;
    expect(top).toMatchObject({ filters: ['cooling_off'] });
    expect((top as { seeds: SeedId[] }).seeds).not.toContain('cooling_off');
    expect(report.bySeed.find((b) => b.seed === 'cooling_off')!.gems).toBe(0);
    expect(report.tiles.graded).toBeGreaterThan(0);
  });
});

describe('luck band', () => {
  it('is 2 standard deviations of flat profit if every gem hit at exactly 1 / price', () => {
    // Var of one $1 gem at price d hitting with chance 1 / d is d - 1.
    expect(luckBand([2, 3, 4], 1, 2)).toBeCloseTo(2 * Math.sqrt(1 + 2 + 3), 6);
    expect(luckBand([], 1, 2)).toBe(0);
  });
});

describe('calibrate', () => {
  const reveal = (hits: Record<string, boolean>): Reveal => ({
    ref: { season: 2025, week: 1 },
    outcomes: new Map(Object.entries(hits).map(([k, hit]) => [k, { value: hit ? 80 : 20, hit }])),
    close: new Map(),
  });
  const lines = Array.from({ length: 40 }, (_, i) => line({ key: `2025|g1|p${i}|rush_yds|59.5`, playerId: `p${i}`, fair: 0.4 }));

  it('starts every seed at 0, so the blend reads fair and nothing is picked', () => {
    const k = shrinks(startCalibration());
    expect(Object.values(k.rush_yds).every((v) => v === 0)).toBe(true);
    const loud = silence(); for (const l of lines) loud.usage.set(l.key, 0.9);
    const used = shrinkChances(lines, loud, k);
    expect(used.usage.size).toBe(0);
    expect(pick(lines, used, startWeights(), { ...rules, minPrice: 1.5, maxPrice: 5 })).toHaveLength(0);
  });

  it('keeps a loud seed near 0 when its gaps were wrong, and earns a right seed most of its gap', () => {
    const loud = silence(); const right = silence(); const hits: Record<string, boolean> = {};
    lines.forEach((l, i) => {
      const hit = i % 5 === 0; hits[l.key] = hit; // hits 20% while fair says 40%
      loud.usage.set(l.key, 0.85);
      right.books_disagree.set(l.key, 0.2);
    });
    let cal = startCalibration();
    cal = noteCalibration(cal, lines, loud, reveal(hits));
    cal = noteCalibration(cal, lines, right, reveal(hits));
    const k = shrinks(cal);
    expect(k.rush_yds.usage).toBe(0);
    expect(k.rush_yds.books_disagree).toBeGreaterThanOrEqual(0.8);
    expect(K_GRID).toHaveLength(21);
  });

  it('shrinks a chance toward fair in log odds', () => {
    const k = shrinks(startCalibration()); k.rush_yds.usage = 0.5;
    const c = silence(); c.usage.set(lines[0]!.key, 0.8);
    const p = shrinkChances(lines, c, k).usage.get(lines[0]!.key)!;
    expect(p).toBeCloseTo(inverseLogit(logit(0.4) + 0.5 * (logit(0.8) - logit(0.4))), 12);
  });

  it('runs a MOD with calibrate on and records each Saturday\'s shrinks', async () => {
    const dir = mkdtempSync(join(scratch, 'cal-'));
    const w = syntheticWorld();
    const { path, hash } = frozenRules(dir, { mod: 'MOD16', calibrate: true });
    w.setLedger(join(dir, hash));
    const { dir: out } = await runGauntlet({ hash, rulesPath: path, outRoot: dir, world: w.source, seeds: stubSeeds(w.truth), log: () => {} });
    const first = JSON.parse(readFileSync(join(out, `${weekId(WALK[0]!)}-picks.json`), 'utf8')) as PicksFile;
    expect(first.gems).toHaveLength(0);
    expect(Object.values(first.shrinks!.rush_yds).every((v) => v === 0)).toBe(true);
    const last = JSON.parse(readFileSync(join(out, `${weekId(WALK[WALK.length - 1]!)}-picks.json`), 'utf8')) as PicksFile;
    expect(Object.values(last.shrinks!).some((set) => Object.values(set).some((v) => v > 0))).toBe(true);
  });
});
