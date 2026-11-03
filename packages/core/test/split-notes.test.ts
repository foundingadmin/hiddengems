import { describe, expect, it } from 'vitest';
import { type Split, type SplitKey, type SplitSide, type Splits, combineSplits, splitNotes, splitRate } from '../src';

// Ten games, 4 with a TD. Each condition puts some of them on this week's side.
const hits = [true, false, true, false, false, true, false, false, true, false];
const seasonRate = 0.4;
const split = (key: SplitKey, current: SplitSide | null, on: number[]): Split => {
  const h = on.filter((i) => hits[i]).length;
  return {
    key, current, hits: h, games: on.length, rate: splitRate(h, on.length, seasonRate), seasonRate, thin: on.length < 3,
    sides: [], players: [],
  };
};
const s: Splits = {
  playerId: 'p',
  season: { hits: 4, games: 10, rate: seasonRate },
  log: hits.map((hit, i) => ({
    gameId: `g${i}`, week: i + 1, touchdowns: hit ? 1 : 0, hit,
    sides: { qb: 'usual', teammate: 'in', venue: i % 2 ? 'away' : 'home', rest: i === 3 ? 'short' : 'normal', implied: [0, 2, 5, 8].includes(i) ? 'above' : 'below', role: null },
  })),
  splits: [
    split('qb', 'usual', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    split('teammate', 'in', [0, 1, 2, 3, 4, 5, 6, 7]),
    split('venue', 'home', [0, 2, 4, 6, 8]),
    split('rest', 'short', [3]),
    split('implied', 'above', [0, 2, 5, 8]),
    split('role', null, []),
  ],
};

describe('splitNotes', () => {
  it('cites only strong splits that are not thin, leaving venue and role to the trend lines', () => {
    const notes = splitNotes(s);
    // implied: 4 of 4, shrunk (4 + 1.6) / 8 = 0.7. venue is 4 of 5 but has a trend line; rest is thin; qb is the season.
    expect(notes.map((n) => n.key)).toEqual(['implied']);
    expect(notes[0]).toMatchObject({ side: 'above', hits: 4, games: 4, rate: 0.7, score: 1 });
  });

  it('ranks by abs(rate - 0.5) * sqrt(n) and keeps at most two', () => {
    const more: Splits = {
      ...s,
      splits: s.splits.map((x) => (x.key === 'teammate' ? split('teammate', 'out', [1, 3, 4, 6, 7, 9]) : x.key === 'qb' ? split('qb', 'other', [1, 3, 4]) : x)),
    };
    const notes = splitNotes(more);
    // teammate 0 of 6: score 0.5 * sqrt(6) = 1.22; implied 1; qb 0 of 3, gap 0.4 - 1.6 / 7 = 0.17: score 0.87.
    expect(notes.map((n) => n.key)).toEqual(['teammate', 'implied']);
    expect(splitNotes(more, 3).map((n) => n.key)).toEqual(['teammate', 'implied', 'qb']);
  });

  it('skips a split near his season rate', () => {
    const near: Splits = { ...s, splits: s.splits.map((x) => (x.key === 'implied' ? split('implied', 'above', [0, 1, 3, 5]) : x)) };
    expect(splitNotes(near)).toEqual([]);
  });
});

describe('combineSplits for the loupe', () => {
  it('keeps the games on this week side of every chosen condition', () => {
    const c = combineSplits(s, ['venue', 'implied', 'role']);
    expect(c).toMatchObject({ keys: ['venue', 'implied'], hits: 3, games: 3, thin: false });
    expect(c.rate).toBeCloseTo(splitRate(3, 3, seasonRate));
    expect(combineSplits(s, ['venue', 'rest'])).toMatchObject({ hits: 0, games: 0, rate: seasonRate, thin: true });
  });
});
