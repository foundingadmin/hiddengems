// The walk-forward backtest on the Week 8 fixture (nflverse usage through Week 8 Sunday, every snap count in).
// The 0.1360 baseline was scored on Nov 2, when most Week 8 snap counts were still pending, so its Week 8 player
// games differ (1,583 then, 1,652 here) and this fixture cannot reproduce it. It does reproduce the other
// documented numbers: Weeks 4 to 7 before implied points at 0.1314 (section 11 backtest note), and implied points
// better in 4 of 5 weeks.
import { describe, expect, it } from 'vitest';
import { BACKTEST, type GameLine, type UsageGame, brierScore, walkForward, weekReads } from '../src';
import week8 from './fixtures/week8.json';

type Fixture = {
  logs: [string, string, number, string, string, number | null, number, number, number, number, number][];
  lines: [string, number, string, string, number | null, number | null][];
};
const fx = week8 as unknown as Fixture;
const logs: UsageGame[] = fx.logs.map(([playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns]) => ({
  playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns,
}));
const lines: GameLine[] = fx.lines.map(([gameId, week, homeTeam, awayTeam, spreadLine, totalLine]) => ({ gameId, week, homeTeam, awayTeam, spreadLine, totalLine }));

describe('walk-forward backtest', () => {
  const withImplied = walkForward({ logs, lines });
  const without = walkForward({ logs, lines: [] });

  it('scores Weeks 4 to 8 with implied points: 0.1313 over 1,652 player games, under the 0.1360 baseline', () => {
    expect(withImplied.weeks.map((w) => w.week)).toEqual([4, 5, 6, 7, 8]);
    expect(withImplied.games).toBe(1652);
    expect(withImplied.weeks.map((w) => w.games)).toEqual([368, 338, 318, 321, 307]);
    expect(withImplied.brier!).toBeCloseTo(0.13135, 5);
    expect(withImplied.baseline).toBe(BACKTEST.baseline);
    expect(withImplied.delta!).toBeCloseTo(withImplied.brier! - 0.136, 12);
    expect(withImplied.aboveBaseline).toBe(false);
  });

  it('reproduces the documented 0.1314 for Weeks 4 to 7 before implied points', () => {
    const r = walkForward({ logs, lines: [], weeks: [4, 5, 6, 7] });
    expect(r.brier!.toFixed(4)).toBe('0.1314');
  });

  it('finds implied points better in 4 of 5 weeks and overall', () => {
    const better = withImplied.weeks.filter((w, i) => w.brier < without.weeks[i]!.brier).map((w) => w.week);
    expect(better).toEqual([4, 5, 6, 8]);
    expect(withImplied.brier!).toBeLessThan(without.brier!);
  });

  it('reads each week from earlier weeks only', () => {
    const later = logs.filter((g) => g.week >= 6).map((g) => (g.week === 6 ? g : { ...g, rzCarries: g.rzCarries + 9, touchdowns: 3 }));
    const early = logs.filter((g) => g.week < 6);
    const a = weekReads([...early, ...logs.filter((g) => g.week === 6)], lines, 6).map((r) => r.chance);
    const b = weekReads([...early, ...later], lines, 6).map((r) => r.chance);
    expect(b).toEqual(a);
  });

  it('skips players with no earlier game and weeks before Week 4', () => {
    expect(weekReads(logs, lines, 1)).toEqual([]);
    const debut = logs.filter((g) => g.week === 5 && !logs.some((h) => h.playerId === g.playerId && h.week < 5));
    expect(debut.length).toBeGreaterThan(0);
    const read = new Set(weekReads(logs, lines, 5).map((r) => r.game.playerId));
    for (const g of debut) expect(read.has(g.playerId)).toBe(false);
    expect(walkForward({ logs: logs.filter((g) => g.week < 4), lines })).toMatchObject({ weeks: [], games: 0, brier: null, delta: null, aboveBaseline: false });
  });

  it('scores against the results when given, and flags a score above the baseline', () => {
    const allMissed = walkForward({ logs, lines, weeks: [8], scored: () => false });
    expect(allMissed.games).toBe(307);
    expect(allMissed.brier!).toBeLessThan(withImplied.weeks[4]!.brier);
    const allScored = walkForward({ logs, lines, weeks: [8], scored: () => true });
    expect(allScored.aboveBaseline).toBe(true);
    expect(allScored.delta!).toBeGreaterThan(0);
  });

  it('computes the Brier score', () => {
    expect(brierScore([])).toBeNull();
    expect(brierScore([{ chance: 0.2, hit: true }, { chance: 0.2, hit: false }])).toBeCloseTo((0.64 + 0.04) / 2, 12);
  });
});
