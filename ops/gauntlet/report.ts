// The gauntlet report. Reads one run's ledger (experiments/gauntlet/<hash>/) and writes report.json beside it: one
// file that fills every cell of the report. Warm-up weeks are listed but never graded: their money stays out of every
// total, running line and verdict check.
//
// Run on its own: packages/ingest/node_modules/.bin/tsx ops/gauntlet/report.ts <ledger folder>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BET_TYPES, type Rules, SEED_IDS, type SeedId } from './contract';
import { type Gem, clampChance, logit, ownShare } from './learner';
import type { GemResult, PicksFile, ResultsFile, RunFile } from './run';

const round = (x: number, places = 6) => Math.round(x * 10 ** places) / 10 ** places;
const share = (part: number, whole: number) => (whole > 0 ? round(part / whole) : null);

/** One graded or refunded gem with what it made. */
export interface Settled {
  season: number;
  week: number;
  warmup: boolean;
  gem: Gem;
  result: GemResult;
  /** Null when refunded. */
  profit: number | null;
  leader: SeedId | null;
  /** The bet type's set the blend read that Saturday. */
  weights: Record<SeedId, number>;
}

export interface Money { gems: number; wagered: number; returned: number; profit: number; hits: number; hitShare: number | null; roi: number | null }

function money(settled: Settled[], stake: number): Money {
  const graded = settled.filter((s) => s.profit !== null);
  const wagered = graded.length * stake;
  const returned = graded.reduce((t, s) => t + (s.result.outcome!.hit ? stake * s.gem.line.price : 0), 0);
  const hits = graded.filter((s) => s.result.outcome!.hit).length;
  return {
    gems: graded.length, wagered: round(wagered), returned: round(returned), profit: round(returned - wagered), hits,
    hitShare: share(hits, graded.length), roi: share(returned - wagered, wagered),
  };
}

/** 2 standard deviations (rules.pass.luckBandSd) of flat profit if every gem hit at exactly 1 / price. */
export function luckBand(prices: number[], stake: number, sd: number): number {
  // Each gem pays stake * (price - 1) with chance 1 / price and loses stake otherwise: mean 0, variance stake² (price - 1).
  return round(sd * stake * Math.sqrt(prices.reduce((t, p) => t + (p - 1), 0)));
}

/** The seed that pushed a gem hardest toward the over, or null if none pushed it up. */
export function leadingSeed(contributions: Record<SeedId, number>): SeedId | null {
  let best: SeedId | null = null;
  for (const s of SEED_IDS) if (contributions[s] > 0 && (best === null || contributions[s] > contributions[best])) best = s;
  return best;
}

export function buildReport(dir: string) {
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as RunFile;
  const rules: Rules = run.rules;
  const stake = rules.stake;
  const files = new Set(readdirSync(dir));
  const weeks: { picks: PicksFile; results: ResultsFile }[] = [];
  for (const ref of run.weeks) {
    const id = `${ref.season}-w${String(ref.week).padStart(2, '0')}`;
    if (!files.has(`${id}-picks.json`) || !files.has(`${id}-results.json`)) throw new Error(`The ledger has no complete ${id}`);
    weeks.push({
      picks: JSON.parse(readFileSync(join(dir, `${id}-picks.json`), 'utf8')) as PicksFile,
      results: JSON.parse(readFileSync(join(dir, `${id}-results.json`), 'utf8')) as ResultsFile,
    });
  }

  const settled: Settled[] = [];
  for (const { picks, results } of weeks) {
    for (const gem of picks.gems) {
      const result = results.gems.find((r) => r.key === gem.key)!;
      const o = result.outcome;
      settled.push({
        season: picks.ref.season, week: picks.ref.week, warmup: picks.warmup, gem, result,
        profit: o ? (o.hit ? stake * (gem.line.price - 1) : -stake) : null,
        leader: leadingSeed(gem.contributions),
        weights: picks.weights.byBetType[gem.line.betType],
      });
    }
  }
  const counted = settled.filter((s) => !s.warmup);
  const graded = counted.filter((s) => s.profit !== null);
  const total = money(counted, stake);
  const band = luckBand(graded.map((s) => s.gem.line.price), stake, rules.pass.luckBandSd);

  // Weekly, with running money over graded weeks only.
  let running = 0;
  const runningPrices: number[] = [];
  const weekly = weeks.map(({ picks, results }) => {
    const mine = settled.filter((s) => s.season === picks.ref.season && s.week === picks.ref.week);
    const m = money(mine, stake);
    const priced = mine.filter((s) => s.profit !== null).map((s) => s.gem.line.price);
    if (!picks.warmup) { running += m.profit; runningPrices.push(...priced); }
    return {
      season: picks.ref.season, week: picks.ref.week, warmup: picks.warmup,
      gems: picks.gems.length, graded: m.gems, refunds: picks.gems.length - m.gems,
      wagered: m.wagered, returned: m.returned, profit: m.profit, hits: m.hits,
      breakEvenShare: priced.length ? round(priced.reduce((t, p) => t + 1 / p, 0) / priced.length) : null,
      runningProfit: round(running), purse: round(rules.purse + running),
      luckBand: luckBand(runningPrices, stake, rules.pass.luckBandSd),
      boardLines: picks.board,
      linesGraded: results.scores.graded,
      /** The shared set the blend read that Saturday, and the one Tuesday's reweight left. */
      sharedWeights: roundSet(picks.weights.shared),
      sharedWeightsAfter: roundSet(results.state.weights.shared),
    };
  });

  const final = weeks.at(-1)!.results.state;
  const finalWeights = {
    shared: roundSet(final.weights.shared),
    byBetType: BET_TYPES.map((b) => ({
      betType: b,
      lines: final.lines[b],
      ownShare: round(ownShare(final.lines[b], rules.poolingLines)),
      seeds: SEED_IDS.map((s) => ({ seed: s, weight: round(final.weights.byBetType[b][s]), own: round(final.own[b][s]), lines: final.spoken[b][s] })),
    })),
  };

  // Money by the seed that led each gem, heaviest final shared weight first.
  const heaviest = [...SEED_IDS].sort((a, b) => final.weights.shared[b] - final.weights.shared[a]);
  const bySeed = [...heaviest, null].map((seed) => ({
    seed: seed ?? 'none',
    finalWeight: seed ? round(final.weights.shared[seed]) : null,
    ...money(counted.filter((s) => s.leader === seed), stake),
  }));

  const byBetType = BET_TYPES.map((b) => {
    const mine = counted.filter((s) => s.gem.line.betType === b);
    return { betType: b, main: money(mine.filter((s) => !s.gem.line.alt), stake), alt: money(mine.filter((s) => s.gem.line.alt), stake), total: money(mine, stake) };
  });

  // Verdict.
  const seasons = ([2025, 2026] as const).map((season) => ({ season, ...money(counted.filter((s) => s.season === season), stake) }));
  const closed = graded.filter((s) => s.result.close !== null);
  const beat = closed.filter((s) => s.gem.line.price > s.result.close!).length;
  // vetoAsFilter: a seed that only ever sat at or below fair, as of the last board, is not one of the two that count.
  const filters = rules.vetoAsFilter ? weeks.at(-1)!.picks.filters ?? [] : [];
  const top = heaviest.filter((s) => !filters.includes(s)).slice(0, 2);
  const topProfit = round(graded.filter((s) => s.leader && top.includes(s.leader)).reduce((t, s) => t + s.profit!, 0));
  const topShare = total.profit > 0 ? round(topProfit / total.profit) : null;
  const checks = [
    { id: 'luck_band', label: 'Profit above the luck band', pass: total.profit > band, value: total.profit, bar: band },
    {
      id: 'both_seasons', label: 'A profit in 2025 and in 2026',
      pass: !rules.pass.bothSeasons || seasons.every((s) => s.profit > 0), value: seasons.map((s) => ({ season: s.season, profit: s.profit })), bar: 0,
    },
    {
      id: 'beat_close', label: 'More than half its gems beat the closing price',
      pass: closed.length > 0 && beat / closed.length > rules.pass.beatCloseShare, value: share(beat, closed.length), bar: rules.pass.beatCloseShare,
      beat, priced: closed.length,
    },
    {
      id: 'top_seeds', label: 'Its two heaviest seeds earn at least half the profit',
      pass: topShare !== null && topShare >= rules.pass.topSeedsShare, value: topShare, bar: rules.pass.topSeedsShare, seeds: top, profit: topProfit,
      ...(rules.vetoAsFilter ? { filters } : {}),
    },
  ];

  const tiles = {
    profit: total.profit, roi: total.roi, wagered: total.wagered, returned: total.returned,
    purseStart: rules.purse, purseEnd: round(rules.purse + total.profit),
    gems: counted.length, graded: graded.length, refunds: counted.length - graded.length, hits: total.hits, hitShare: total.hitShare,
    breakEvenShare: graded.length ? round(graded.reduce((t, s) => t + 1 / s.gem.line.price, 0) / graded.length) : null,
    beatClose: share(beat, closed.length), luckBand: band,
    seasons,
    warmup: { weeks: weekly.filter((w) => w.warmup).length, ...money(settled.filter((s) => s.warmup), stake) },
  };

  return {
    mod: run.mod, hash: run.hash, rules,
    seeds: run.seeds,
    weeks: { from: run.weeks[0], to: run.weeks.at(-1), total: weekly.length, graded: weekly.filter((w) => !w.warmup).length },
    verdict: { pass: checks.every((c) => c.pass), checks },
    tiles, weekly, finalWeights, bySeed, byBetType,
    sampleGem: sampleGem(graded, stake),
  };
}

function roundSet(set: Record<SeedId, number>) {
  return Object.fromEntries(SEED_IDS.map((s) => [s, round(set[s])])) as Record<SeedId, number>;
}

/** The graded gem with the biggest edge, broken down seed by seed. Its pushes add up from fair's log odds to the MOD's. */
function sampleGem(graded: Settled[], stake: number) {
  const s = [...graded].sort((a, b) => b.gem.edge - a.gem.edge || (a.gem.key < b.gem.key ? -1 : 1))[0];
  if (!s) return null;
  const { gem } = s;
  const push = SEED_IDS.reduce((t, id) => t + gem.contributions[id], 0);
  return {
    season: s.season, week: s.week, key: gem.key,
    player: gem.line.player, team: gem.line.team, opponent: gem.line.opponent, position: gem.line.position,
    betType: gem.line.betType, alt: gem.line.alt, line: gem.line.line, price: gem.line.price,
    fair: round(gem.line.fair), breakEven: round(1 / gem.line.price), chance: round(gem.chance), edge: round(gem.edge),
    fairLogOdds: round(logit(gem.line.fair)), chanceLogOdds: round(logit(clampChance(gem.chance))),
    outcome: s.result.outcome, close: s.result.close, profit: round(s.profit!), stake, leader: s.leader,
    seeds: SEED_IDS.map((id) => ({
      seed: id,
      weight: round(s.weights[id]),
      chance: gem.seedChances[id] === null ? null : round(gem.seedChances[id]!),
      silent: gem.seedChances[id] === null,
      push: round(gem.contributions[id]),
      share: push !== 0 ? round(gem.contributions[id] / push) : null,
    })),
  };
}

export type GauntletReport = ReturnType<typeof buildReport>;

export function writeReport(dir: string): string {
  const path = join(dir, 'report.json');
  writeFileSync(path, `${JSON.stringify(buildReport(dir), null, 2)}\n`);
  return path;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir) { console.error('Usage: tsx ops/gauntlet/report.ts <ledger folder>'); process.exit(1); }
  console.log(writeReport(dir));
}
