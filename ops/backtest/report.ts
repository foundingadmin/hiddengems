// Writes experiments/backtest/README.md from the replay's ledgers: method, guard, spend, results and calibration.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ODDS_DIR, OUT_DIR } from './paths';
import type { Ledger, Mod, Pick } from './replay';

const MOD_LIST: Mod[] = ['MOD0', 'MOD1q', 'MOD2'];
const pct = (n: number | null) => (n === null ? 'n/a' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`);
const f2 = (n: number) => n.toFixed(2);
const rate = (n: number) => `${(n * 100).toFixed(1)}%`;

export interface Totals { picks: number; graded: number; hits: number; expected: number; roi: number | null; clv: number | null; brierMod: number | null; brierBook: number | null }

export function totals(picks: Pick[]): Totals {
  const g = picks.filter((p) => p.hit !== null);
  const clvs = picks.map((p) => p.clv).filter((c): c is number => c !== null);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    picks: picks.length, graded: g.length, hits: g.filter((p) => p.hit).length, expected: g.reduce((s, p) => s + p.implied, 0),
    roi: mean(g.map((p) => (p.hit ? p.lock_price - 1 : -1))), clv: mean(clvs),
    brierMod: mean(g.map((p) => (p.mod_chance - (p.hit ? 1 : 0)) ** 2)), brierBook: mean(g.map((p) => (p.implied - (p.hit ? 1 : 0)) ** 2)),
  };
}

const BINS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0001];

export function writeReadme(ledgers: Ledger[], audit: { week: number; inputs: number; selections: number; unmatched: number }[]) {
  const picksOf = (mod: Mod, week?: number) => ledgers.filter((l) => l.mod === mod && (week === undefined || l.week === week)).flatMap((l) => l.picks);
  const weeks = [...new Set(ledgers.map((l) => l.week))].sort((a, b) => a - b);
  const spendPath = `${ODDS_DIR}/spend.json`;
  const spend = existsSync(spendPath) ? (JSON.parse(readFileSync(spendPath, 'utf8')) as { spent: number; remaining: string | null }[]) : [];
  const spent = spend.reduce((s, r) => s + r.spent, 0);

  const L: string[] = [];
  L.push('# Weeks 1 to 8 backtest', '');
  L.push('## Method', '');
  L.push('- Each 2026 Sunday of Weeks 1 to 8 is replayed from the Saturday 7:47 PM Mountain board before it. Thursday, Saturday and Monday games are skipped. Segments by Mountain kickoff: AM before noon, PM noon to 4 PM, SNF 4 PM on.');
  L.push('- Board: The Odds API historical event odds at that moment, DraftKings plus FanDuel, BetMGM, Caesars and Fanatics, for anytime TD and the receptions, receiving yards and rushing yards ladders, over sides only. Close: the same at 20 minutes before each kickoff, for CLV (taken over the close fair price, core `closingLineValue`).');
  L.push('- Inputs: nflverse 2026 play by play, snap counts and weekly stats from games before the week, the schedule\'s spread and total lines, that week\'s injury report and weekly roster.');
  L.push('- MOD0 is the gate in `gems.ts` before PR 51 on core `readProp` (anytime TD, any edge over the posted price, any price, no blocks). MOD1q is every DraftKings prop at 2.50 or more whose hit rate at that line over 3 or more games before the week is 60% or more, banded 60, 65, 70, 75, 80 as GEM1 to GEM5. MOD2 calls core `readProp`, `readStatProp`, `availabilityBlock`, `appraise` and `GEM_RULES` as `build-picks` does; its level is the rating in fifths. MOD3 without its read equals MOD2, so it is not replayed.');
  L.push('- Grading: core `propHit` on the nflverse box score. A player with no snap or stat line that game is void, as the book voids it. Pass means hits at least equal the book\'s expected hits (the sum of DraftKings implied chances).');
  L.push('- Week 1 is in the ledger with no picks and no odds bought: no 2026 game precedes it, so MOD0 and MOD2 have no read and MOD1q has no 3 games.', '');
  L.push('## The guard', '');
  L.push('`ops/backtest/data.ts` `capsule()` stamps every input with when it became knowable and fails the run on any input stamped at or after the board: usage and box scores at their game\'s kickoff, the injury report at Friday 4 PM Eastern, the weekly roster at Wednesday 4 PM Eastern. Every board price and the snapshot itself must be stamped no later than the board, and every close must fall between the board and its game\'s close time.');
  L.push('Two things the guard cannot see. nflverse stores the closing spread and total, not Saturday\'s, so implied team points carry about one night of line movement. Stat corrections made after the week are in the box scores. Both are small and push every MOD the same way.', '');
  for (const a of audit) L.push(`- Week ${a.week}: ${a.inputs.toLocaleString('en-US')} inputs checked, ${a.selections} DraftKings selections, ${a.unmatched} player names unmatched`);
  L.push('', '## Credit spend', '');
  L.push(spend.length ? `${spent.toLocaleString('en-US')} credits over ${spend.length} fetch runs (${spend.at(-1)?.remaining ?? 'unknown'} left after the last). Raw responses are cached in \`experiments/backtest/cache/\`, never committed.` : 'Nothing bought yet. `node ops/backtest/fetch-odds.mjs --dry` prints the estimate.', '');

  L.push('## Results', '');
  L.push('| MOD | Week | Picks | Graded | Hits | Book expected | Pass | ROI | CLV |', '|---|---|---|---|---|---|---|---|---|');
  for (const mod of MOD_LIST) for (const wk of weeks) {
    const t = totals(picksOf(mod, wk));
    const pass = t.graded ? (t.hits >= t.expected ? 'pass' : 'fail') : 'n/a';
    L.push(`| ${mod} | ${wk} | ${t.picks} | ${t.graded} | ${t.hits} | ${f2(t.expected)} | ${pass} | ${pct(t.roi)} | ${pct(t.clv)} |`);
  }
  L.push('', '### Totals', '');
  L.push('| MOD | Picks | Graded | Hits | Book expected | Weeks passed | ROI | CLV | Brier, MOD | Brier, book |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const mod of MOD_LIST) {
    const t = totals(picksOf(mod));
    const passed = weeks.filter((wk) => { const x = totals(picksOf(mod, wk)); return x.graded && x.hits >= x.expected; }).length;
    const scored = weeks.filter((wk) => totals(picksOf(mod, wk)).graded).length;
    L.push(`| ${mod} | ${t.picks} | ${t.graded} | ${t.hits} | ${f2(t.expected)} | ${passed} of ${scored} | ${pct(t.roi)} | ${pct(t.clv)} | ${t.brierMod?.toFixed(4) ?? 'n/a'} | ${t.brierBook?.toFixed(4) ?? 'n/a'} |`);
  }
  L.push('', '### By level', '');
  L.push('| MOD | Level | Graded | Hit rate | Mean MOD chance | Mean book chance | ROI |', '|---|---|---|---|---|---|---|');
  for (const mod of MOD_LIST) for (let lv = 1; lv <= 5; lv++) {
    const g = picksOf(mod).filter((p) => p.gem_level === lv && p.hit !== null);
    if (!g.length) continue;
    const m = (f: (p: Pick) => number) => g.reduce((s, p) => s + f(p), 0) / g.length;
    L.push(`| ${mod} | GEM${lv} | ${g.length} | ${rate(m((p) => (p.hit ? 1 : 0)))} | ${rate(m((p) => p.mod_chance))} | ${rate(m((p) => p.implied))} | ${pct(m((p) => (p.hit ? p.lock_price - 1 : -1)))} |`);
  }
  L.push('', '## Calibration', '');
  L.push('Each MOD\'s stated chance against what hit, in bins of its chance.', '');
  L.push('| MOD | Chance bin | Graded | Mean MOD chance | Hit rate | Mean book chance |', '|---|---|---|---|---|---|');
  for (const mod of MOD_LIST) for (let i = 0; i < BINS.length - 1; i++) {
    const g = picksOf(mod).filter((p) => p.hit !== null && p.mod_chance >= BINS[i]! && p.mod_chance < BINS[i + 1]!);
    if (!g.length) continue;
    const m = (f: (p: Pick) => number) => g.reduce((s, p) => s + f(p), 0) / g.length;
    L.push(`| ${mod} | ${Math.round(BINS[i]! * 100)} to ${Math.min(100, Math.round(BINS[i + 1]! * 100))}% | ${g.length} | ${rate(m((p) => p.mod_chance))} | ${rate(m((p) => (p.hit ? 1 : 0)))} | ${rate(m((p) => p.implied))} |`);
  }
  L.push('', '## Run it', '');
  L.push('```sh', 'packages/ingest/node_modules/.bin/tsx ops/backtest/plan.ts        # plan.json from nflverse games.csv', 'node ops/backtest/fetch-odds.mjs --dry                               # credit estimate', 'ODDS_API_KEY_HISTORICAL=... node ops/backtest/fetch-odds.mjs        # buys only what the cache lacks', 'packages/ingest/node_modules/.bin/tsx ops/backtest/replay.ts      # ledger, results.json, this README', '```', '');
  L.push('nflverse files go in `experiments/backtest/cache/nflverse/` (games, roster_2026, roster_weekly_2026, stats_player_week_2026, play_by_play_2026.csv.gz, snap_counts_2026, injuries_2026), from the nflverse-data releases.', '');
  writeFileSync(`${OUT_DIR}/README.md`, L.join('\n'));
}
