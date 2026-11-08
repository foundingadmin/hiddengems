// The ten gauntlet seeds (ops/gauntlet/seeds) on fixture WeekWorlds: each speaks when it has a read, stays silent when
// it has none, and leans the way its football says.
import { describe, expect, it } from 'vitest';
import { SEED_IDS, type BetType, type GameLog, type Line, type Quote, type WeekWorld } from '../../../ops/gauntlet/contract';
import {
  SEEDS, booksDisagree, coolingOff, followTheMove, gameScript, hiddenGems, hotHand, ladderMath, matchup, nextManUp, usage,
} from '../../../ops/gauntlet/seeds';

const G = '2025_06_BUF_KC';

function log(o: Partial<GameLog> & { playerId: string; week: number }): GameLog {
  return {
    season: 2025, gameId: `g${o.week}`, name: o.playerId, team: 'KC', opponent: `T${o.week}`, position: 'RB',
    rushYds: 0, recYds: 0, passYds: 0, carries: 0, targets: 0, receptions: 0, routes: null, snapPct: 0.6, fantasyPoints: 0, ...o,
  };
}

function line(playerId: string, betType: BetType, at: number, fair: number, o: Partial<Line> = {}): Line {
  return {
    key: `2025|${G}|${playerId}|${betType}|${at}`, gameId: G, playerId, player: playerId, team: 'KC', opponent: 'BUF', position: 'RB',
    betType, alt: false, line: at, price: 1 / (fair * 1.045), fair, ...o,
  };
}

/** A back with five games: 15 carries for 70 yards and 3 targets for 20 a game. */
const steady = (playerId: string, o: Partial<GameLog> = {}) =>
  [1, 2, 3, 4, 5].map((week) => log({ playerId, week, carries: 15, rushYds: 70, targets: 3, recYds: 20, fantasyPoints: 12, ...o }));

function world(o: Partial<WeekWorld> = {}): WeekWorld {
  return {
    ref: { season: 2025, week: 6 },
    games: [{ gameId: G, kickoff: new Date('2025-10-12T17:00:00Z'), home: 'KC', away: 'BUF', boardAt: new Date('2025-10-11T12:00:00Z'), roof: 'outdoors' }],
    lines: [line('rb1', 'rush_yds', 59.5, 0.55)],
    board: [], early: null,
    scripts: new Map([[G, { homeSpread: -6, total: 48 }]]),
    logs: steady('rb1'),
    injuries: [], depth: [], depthPrev: [],
    ...o,
  };
}

const KEY = `2025|${G}|rb1|rush_yds|59.5`;
const read = (seed: { read: (w: WeekWorld) => Map<string, number> }, w: WeekWorld, key = KEY) => seed.read(w).get(key);

describe('gauntlet seeds', () => {
  it('exports all ten in contract order, each pure', () => {
    expect(SEEDS.map((s) => s.id)).toEqual([...SEED_IDS]);
    const w = world();
    for (const s of SEEDS) expect([...s.read(w)]).toEqual([...s.read(w)]);
  });

  describe('usage is destiny', () => {
    it('speaks for a player with games and stays silent without', () => {
      expect(read(usage, world())).toBeGreaterThan(0.3);
      expect(read(usage, world({ logs: [] }))).toBeUndefined();
    });
    it('reads last season early', () => {
      // Week 1 of 2026: only 2025 on record.
      const w = world({ ref: { season: 2026, week: 1 } });
      expect(read(usage, w)).toBeCloseTo(read(usage, world({ logs: steady('rb1').map((l) => ({ ...l, week: l.week + 12 })) }))!, 1);
      expect(read(usage, { ...w, logs: [] })).toBeUndefined();
    });
    it('falls as the line rises and rises with volume', () => {
      const w = world({ lines: [line('rb1', 'rush_yds', 40.5, 0.7), line('rb1', 'rush_yds', 59.5, 0.55), line('rb1', 'rush_yds', 99.5, 0.2)] });
      const c = usage.read(w);
      expect(c.get(`2025|${G}|rb1|rush_yds|40.5`)!).toBeGreaterThan(c.get(KEY)!);
      expect(c.get(KEY)!).toBeGreaterThan(c.get(`2025|${G}|rb1|rush_yds|99.5`)!);
      expect(read(usage, world({ logs: steady('rb1', { carries: 20, rushYds: 93 }) }))!).toBeGreaterThan(read(usage, world())!);
    });
    it('counts a game with snaps and no stat line as a zero, and skips one with no real snaps', () => {
      const blank = (snapPct: number) => world({ logs: [...steady('rb1'), log({ playerId: 'rb1', week: 5, gameId: 'g5b', snapPct })] });
      expect(read(usage, blank(0.5))!).toBeLessThan(read(usage, world())!);
      expect(read(usage, blank(0.02))!).toBeCloseTo(read(usage, world())!, 10);
    });
  });

  describe('game script', () => {
    it('speaks with a spread and total, silent without', () => {
      expect(read(gameScript, world())).toBeDefined();
      expect(read(gameScript, world({ scripts: new Map() }))).toBeUndefined();
    });
    it('a favored team runs more; its underdog passes more', () => {
      expect(read(gameScript, world())!).toBeGreaterThan(read(usage, world())!);
      const dog = world({ scripts: new Map([[G, { homeSpread: 6, total: 48 }]]) });
      expect(read(gameScript, dog)!).toBeLessThan(read(usage, dog)!);
    });
  });

  describe('matchup', () => {
    // BUF's defense: 3 games allowing its opponents' backs 120 rushing yards; the league's other games allow 70.
    const defense = [7, 8, 9].map((n) => log({ playerId: `opp${n}`, week: n - 6, gameId: `d${n}`, team: `T${n}`, opponent: 'BUF', carries: 20, rushYds: 120 }));
    it('silent under 3 opponent games, speaks at 3', () => {
      expect(read(matchup, world({ logs: [...steady('rb1'), ...defense.slice(0, 2)] }))).toBeUndefined();
      expect(read(matchup, world({ logs: [...steady('rb1'), ...defense] }))).toBeDefined();
    });
    it('a soft run defense lifts the over, a stout one lowers it', () => {
      const soft = world({ logs: [...steady('rb1'), ...defense] });
      expect(read(matchup, soft)!).toBeGreaterThan(read(usage, soft)!);
      const stout = world({ logs: [...steady('rb1'), ...defense.map((l) => ({ ...l, rushYds: 30 }))] });
      expect(read(matchup, stout)!).toBeLessThan(read(usage, stout)!);
    });
  });

  describe('hot hand and cooling off', () => {
    const hot = [1, 2, 3, 4, 5].map((week) => log({ playerId: 'rb1', week, carries: week > 2 ? 22 : 10, rushYds: week > 2 ? 110 : 40 }));
    const cold = [1, 2, 3, 4, 5].map((week) => log({ playerId: 'rb1', week, carries: week > 2 ? 10 : 22, rushYds: week > 2 ? 40 : 110 }));
    it('both silent under 4 games', () => {
      const three = world({ logs: hot.slice(2) });
      expect(read(hotHand, three)).toBeUndefined();
      expect(read(coolingOff, three)).toBeUndefined();
    });
    it('after a hot run, hot hand rides it and cooling off pulls back to the season', () => {
      const w = world({ logs: hot });
      expect(read(hotHand, w)!).toBeGreaterThan(read(coolingOff, w)!);
      expect(read(coolingOff, w)!).toBeLessThan(read(usage, w)!);
    });
    it('after a cold run, hot hand sinks and cooling off stays silent', () => {
      const w = world({ logs: cold });
      expect(read(hotHand, w)!).toBeLessThan(read(usage, w)!);
      expect(read(coolingOff, w)).toBeUndefined();
    });
  });

  describe('next man up', () => {
    const depth = [
      { team: 'KC', playerId: 'star', name: 'star', position: 'RB', rank: 1 },
      { team: 'KC', playerId: 'rb1', name: 'rb1', position: 'RB', rank: 2 },
    ];
    const logs = [...steady('rb1', { carries: 5, rushYds: 22 }), ...steady('star', { carries: 18, rushYds: 85 })];
    it('silent when the starter is healthy or questionable', () => {
      expect(read(nextManUp, world({ logs, depth }))).toBeUndefined();
      const q = [{ playerId: 'star', name: 'star', team: 'KC', position: 'RB', status: 'Questionable' as const, practice: 'Limited' }];
      expect(read(nextManUp, world({ logs, depth, injuries: q }))).toBeUndefined();
    });
    it('the backup inherits an Out starter\'s volume and his over rises', () => {
      const out = [{ playerId: 'star', name: 'star', team: 'KC', position: 'RB', status: 'Out' as const, practice: 'DNP' }];
      const w = world({ logs, depth, injuries: out });
      expect(read(nextManUp, w)!).toBeGreaterThan(read(usage, w)! + 0.2);
    });
  });

  describe('books disagree', () => {
    const q = (book: string, side: 'over' | 'under', price: number): Quote => ({ book, gameId: G, playerId: 'rb1', betType: 'rush_yds', alt: false, side, line: 59.5, price });
    it('silent with one other book, speaks with two', () => {
      expect(read(booksDisagree, world({ board: [q('fanduel', 'over', 1.8), q('fanduel', 'under', 2.0)] }))).toBeUndefined();
      expect(read(booksDisagree, world({ board: [q('fanduel', 'over', 1.8), q('fanduel', 'under', 2.0), q('betmgm', 'over', 1.7), q('betmgm', 'under', 2.1)] }))).toBeDefined();
    });
    it('ignores DraftKings itself and takes the median two-way chance', () => {
      const board = [q('draftkings', 'over', 1.5), q('draftkings', 'under', 2.5), q('fanduel', 'over', 1.6), q('fanduel', 'under', 2.4), q('betmgm', 'over', 1.6), q('betmgm', 'under', 2.4)];
      const c = read(booksDisagree, world({ board }))!;
      expect(c).toBeCloseTo((1 / 1.6) / (1 / 1.6 + 1 / 2.4), 10);
      expect(c).toBeGreaterThan(0.55);
    });
    it('cuts a one-sided price by that book\'s own hold', () => {
      const other = (book: string, side: 'over' | 'under', price: number): Quote => ({ ...q(book, side, price), playerId: 'x', line: 70.5 });
      const board = [q('fanduel', 'over', 1.6), q('fanduel', 'under', 2.4), q('betmgm', 'over', 1.6), other('betmgm', 'over', 1.9), other('betmgm', 'under', 1.9)];
      const hold = 2 / 1.9 - 1;
      const oneSided = (1 / 1.6) / (1 + hold);
      const twoWay = (1 / 1.6) / (1 / 1.6 + 1 / 2.4);
      expect(read(booksDisagree, world({ board }))!).toBeCloseTo((oneSided + twoWay) / 2, 10);
    });
  });

  describe('follow the move', () => {
    const early = (price: number): Quote[] => [{ book: 'draftkings', gameId: G, playerId: 'rb1', betType: 'rush_yds', alt: true, side: 'over', line: 59.5, price }];
    const w = (e: Quote[] | null) => world({ early: e });
    const now = world().lines[0]!.price;
    it('silent with no early quote or no move, speaks on a move', () => {
      expect(read(followTheMove, w(null))).toBeUndefined();
      expect(read(followTheMove, w(early(now)))).toBeUndefined();
      expect(read(followTheMove, w(early(2.2)))).toBeDefined();
    });
    it('carries the move on past fair, either way', () => {
      expect(read(followTheMove, w(early(2.2)))!).toBeGreaterThan(0.55);
      expect(read(followTheMove, w(early(1.5)))!).toBeLessThan(0.55);
    });
  });

  describe('ladder math', () => {
    const rung = (at: number, fair: number) => line('rb1', 'rush_yds', at, fair, { alt: true });
    it('silent under 3 rungs, speaks at 3', () => {
      expect(read(ladderMath, world({ lines: [rung(40, 0.8), line('rb1', 'rush_yds', 59.5, 0.55)] }))).toBeUndefined();
      expect(read(ladderMath, world({ lines: [rung(40, 0.8), line('rb1', 'rush_yds', 59.5, 0.55), rung(80, 0.3)] }))).toBeDefined();
    });
    it('pulls a rung priced out of step back toward its neighbours', () => {
      const lines = [rung(40, 0.8), rung(50, 0.68), line('rb1', 'rush_yds', 59.5, 0.4), rung(70, 0.45), rung(80, 0.33)];
      const c = ladderMath.read(world({ lines }));
      expect(c.get(KEY)!).toBeGreaterThan(0.4);
      expect(c.get(`2025|${G}|rb1|rush_yds|40`)!).toBeGreaterThan(c.get(`2025|${G}|rb1|rush_yds|80`)!);
    });
  });

  describe('hidden gems', () => {
    it('silent with no fantasy history', () => {
      expect(read(hiddenGems, world({ logs: [] }))).toBeUndefined();
    });
    it('nudges a top 24 name down and everyone else up', () => {
      // 30 backs: rb1 scores the most, nobody scores less than "deep".
      const field = Array.from({ length: 28 }, (_, i) => log({ playerId: `p${i}`, week: 1, fantasyPoints: 10 + i }));
      const logs = [...field, log({ playerId: 'rb1', week: 1, fantasyPoints: 40 }), log({ playerId: 'deep', week: 1, fantasyPoints: 1 })];
      const lines = [line('rb1', 'rush_yds', 59.5, 0.55), line('deep', 'rush_yds', 20.5, 0.55)];
      const c = hiddenGems.read(world({ logs, lines }));
      expect(c.get(KEY)!).toBeLessThan(0.55);
      expect(c.get(`2025|${G}|deep|rush_yds|20.5`)!).toBeGreaterThan(0.55);
    });
  });
});
