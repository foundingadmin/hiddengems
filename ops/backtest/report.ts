// Writes experiments/backtest/README.md from the replay's ledgers: method, guard, spend, results and calibration.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { LEDGER_DIR, ODDS_DIR, OUT_DIR, SUMMARY_PATH } from './paths';
import type { Ledger, Pick } from './replay';

/** Every line reported, reads beside the screens they read, so the read's effect shows. */
const MOD_LIST = ['MOD0', 'MOD1q', 'MOD1', 'MOD2', 'MOD3'] as const;
type Line = (typeof MOD_LIST)[number];
/** MOD2's stat model was fit on Weeks 4 to 6; it and MOD3 are judged on Weeks 7 and 8 only. */
export const OUT_OF_SAMPLE: Partial<Record<Line, number[]>> = { MOD2: [7, 8], MOD3: [7, 8] };
/** Retired when hits fall this many standard deviations below the book's expected hits. */
export const KILL_Z = -2;

/** Hits against the book: expected is the sum of 1 / lock price, sd the square root of the sum of p(1 - p). */
export function killScore(picks: Pick[]): { expected: number; sd: number; hits: number; z: number | null } {
  const g = picks.filter((p) => p.hit !== null);
  const expected = g.reduce((s, p) => s + p.implied, 0);
  const sd = Math.sqrt(g.reduce((s, p) => s + p.implied * (1 - p.implied), 0));
  const hits = g.filter((p) => p.hit).length;
  return { expected, sd, hits, z: sd > 0 ? (hits - expected) / sd : null };
}
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

export function writeReadme() {
  const ledgers: Ledger[] = readdirSync(LEDGER_DIR).filter((f) => f.endsWith('-back.json')).map((f) => JSON.parse(readFileSync(`${LEDGER_DIR}/${f}`, 'utf8')));
  const audit: { week: number; inputs: number; selections: number; unmatched: number }[] = existsSync(SUMMARY_PATH) ? JSON.parse(readFileSync(SUMMARY_PATH, 'utf8')).audit : [];
  const picksOf = (mod: string, week?: number) => ledgers.filter((l) => l.mod === mod && (week === undefined || l.week === week)).flatMap((l) => l.picks);
  const weeks = [...new Set(ledgers.map((l) => l.week))].sort((a, b) => a - b);
  const weekOfPick = new Map<Pick, number>(ledgers.flatMap((l) => l.picks.map((p) => [p, l.week] as [Pick, number])));
  const spendPath = existsSync(`${ODDS_DIR}/spend.json`) ? `${ODDS_DIR}/spend.json` : `${OUT_DIR}/spend.json`;
  const spend = existsSync(spendPath) ? (JSON.parse(readFileSync(spendPath, 'utf8')) as { spent: number; remaining: string | null }[]) : [];
  const spent = spend.reduce((s, r) => s + r.spent, 0);

  const L: string[] = [];
  L.push('# Weeks 1 to 8 backtest', '');
  L.push('## Method', '');
  L.push('- Each 2026 Sunday of Weeks 1 to 8 is replayed from the Saturday 7:47 PM Mountain board before it. Thursday, Saturday and Monday games are skipped. Segments by Mountain kickoff: AM before noon, PM noon to 4 PM, SNF 4 PM on.');
  L.push('- Board: The Odds API historical event odds at that moment, DraftKings plus FanDuel, BetMGM, Caesars and Fanatics, for anytime TD and the receptions, receiving yards and rushing yards ladders, over sides only. Close: the same at 20 minutes before each kickoff, for CLV (taken over the close fair price, core `closingLineValue`).');
  L.push('- Inputs: nflverse 2026 play by play, snap counts and weekly stats from games before the week, the schedule\'s spread and total lines, that week\'s injury report and weekly roster.');
  L.push('- MOD0 is the gate in `gems.ts` before PR 51 on core `readProp` (anytime TD, any edge over the posted price, any price, no blocks). MOD1q is every DraftKings prop at 2.50 or more whose hit rate at that line over 3 or more games before the week is 60% or more, banded 60, 65, 70, 75, 80 as GEM1 to GEM5. MOD2 calls core `readProp`, `readStatProp`, `availabilityBlock`, `appraise` and `GEM_RULES` as `build-picks` does; its level is the rating in fifths. MOD1 and MOD3 are MOD1q and MOD2 after the read (below).');
  L.push('- Hit rate parity with Outlier\'s Season Trends: hit rate = games clearing the line this season / games played, from nflverse weekly stats, over games before the week. Clearing over 4.5 needs 5 (core `statNeeded`); anytime TD needs one rushing, receiving, return or recovery touchdown. Games played are games with an offensive snap or a stat line, so a game he played and recorded nothing counts as a miss.');
  L.push('- Grading: core `propHit` on the nflverse box score. A player with no snap or stat line that game is void, as the book voids it. Pass means hits at least equal the book\'s expected hits (the sum of DraftKings implied chances).');
  L.push('- Week 1 is in the ledger with no picks and no odds bought: no 2026 game precedes it, so MOD0 and MOD2 have no read and MOD1q has no 3 games.', '');
  L.push('## The read', '');
  L.push('Each week has a Saturday capsule, `experiments/backtest/capsules/WK{n}-saturday.md`, holding only material dated before that board: the nflverse injury report, the nflverse depth chart from its last snapshot before the board, and Wayback Machine captures of league injury and news pages taken before the board, each item with outlet, URL and capture time. It covers only players who passed MOD1q\'s or MOD2\'s screen. The read is a subagent (`.claude/agents/capsule-reader.md`) whose only tool is Read, limited to that capsule. It returns keep, cut or downgrade with one line why, logged in each pick\'s `reads`. Cut picks leave MOD1 and MOD3; a downgrade lowers the level by one.', '');
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
  L.push('', '### Price movement', '');
  L.push('Core\'s CLV prices the close with the assumed cut taken out, so an unmoved price scores about the cut below zero. Raw movement compares the lock price with the closing DraftKings price.', '');
  L.push('| MOD | With a close | Closed shorter | Closed longer | Raw price CLV |', '|---|---|---|---|---|');
  for (const mod of MOD_LIST) {
    const ps = picksOf(mod).filter((p) => p.close_price);
    if (!ps.length) continue;
    const raw = ps.reduce((s, p) => s + p.lock_price / p.close_price! - 1, 0) / ps.length;
    L.push(`| ${mod} | ${ps.length} | ${ps.filter((p) => p.close_price! < p.lock_price).length} | ${ps.filter((p) => p.close_price! > p.lock_price).length} | ${pct(raw)} |`);
  }
  L.push('', '### Kill rule', '');
  L.push(`A MOD is retired and its slot opens when hits fall ${-KILL_Z} or more standard deviations below the book's expected hits across all back trials. MOD2 and MOD3 are judged on Weeks 7 and 8 only, since the stat model was fit on Weeks 4 to 6.`, '');
  L.push('| MOD | Weeks judged | Graded | Hits | Book expected | SD | z | Verdict |', '|---|---|---|---|---|---|---|---|');
  for (const mod of MOD_LIST) {
    const rows: [string, number[] | undefined][] = OUT_OF_SAMPLE[mod] ? [['all', undefined], [OUT_OF_SAMPLE[mod]!.join(' and '), OUT_OF_SAMPLE[mod]]] : [['all', undefined]];
    for (const [label, wks] of rows) {
      const ps = picksOf(mod).filter((p) => !wks || wks.includes(weekOfPick.get(p) ?? 0));
      const k = killScore(ps);
      const judged = !OUT_OF_SAMPLE[mod] || wks !== undefined;
      const verdict = k.z === null ? 'no picks' : !judged ? 'in sample, not judged' : k.z <= KILL_Z ? 'retired' : 'stays';
      L.push(`| ${mod} | ${label} | ${ps.filter((p) => p.hit !== null).length} | ${k.hits} | ${f2(k.expected)} | ${f2(k.sd)} | ${k.z === null ? 'n/a' : k.z.toFixed(2)} | ${verdict} |`);
    }
  }
  L.push('', '### The read', '');
  const reads = picksOf('MOD1').concat(picksOf('MOD3')).filter((p) => p.hit !== null);
  L.push('| Verdict | Graded picks | Hits | Book expected | Hits over expected |', '|---|---|---|---|---|');
  for (const v of ['keep', 'downgrade']) {
    const g = reads.filter((p) => p.reads[0]?.startsWith(v));
    const e = g.reduce((s, p) => s + p.implied, 0), h = g.filter((p) => p.hit).length;
    if (g.length) L.push(`| ${v} | ${g.length} | ${h} | ${f2(e)} | ${f2(h / e)} |`);
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
  L.push('```sh', 'packages/ingest/node_modules/.bin/tsx ops/backtest/plan.ts        # plan.json from nflverse games.csv', 'node ops/backtest/fetch-odds.mjs --dry                               # credit estimate', 'ODDS_API_KEY_HISTORICAL=... node ops/backtest/fetch-odds.mjs        # buys only what the cache lacks', 'packages/ingest/node_modules/.bin/tsx ops/backtest/replay.ts      # MOD0, MOD1q, MOD2 ledgers and results.json', 'packages/ingest/node_modules/.bin/tsx ops/backtest/capsules.ts    # Saturday capsules for screened players', '# the capsule-reader subagent writes experiments/backtest/reads/WK{n}.json, one per week', 'packages/ingest/node_modules/.bin/tsx ops/backtest/apply-reads.ts # MOD1 and MOD3 ledgers, this README', '```', '');
  L.push('nflverse files go in `experiments/backtest/cache/nflverse/` (games, roster_2026, roster_weekly_2026, depth_charts_2026, stats_player_week_2026, play_by_play_2026.csv.gz, snap_counts_2026, injuries_2026), from the nflverse-data releases.', '');
  writeFileSync(`${OUT_DIR}/README.md`, L.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) writeReadme();
