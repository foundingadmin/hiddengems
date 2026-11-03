import { describe, expect, it } from 'vitest';
import {
  type MatchupGame, type MatchupScore, type TrendGame, type UsageGame,
  clearsFair, coreSample, fairPriceFor, favoredBySpread, matchup, opportunitiesFor, priceTrail, trendCandidates, trendLines, trendScore,
} from '../src';

const at = (h: number) => new Date(Date.UTC(2026, 10, 1, h));

describe('price trail', () => {
  it('keeps one point per change, oldest first, and nothing from kickoff on', () => {
    const trail = priceTrail([
      { priceDecimal: 2.6, observedAt: at(5) },
      { priceDecimal: 2.75, observedAt: at(1) },
      { priceDecimal: 2.75, observedAt: at(2) },
      { priceDecimal: 2.5, observedAt: at(9) },
    ], at(9));
    expect(trail).toEqual([{ at: at(1), price: 2.75 }, { at: at(5), price: 2.6 }]);
  });

  it('prices our fair line from our chance, and says when a price clears it', () => {
    expect(fairPriceFor(0.5)).toBe(2);
    expect(() => fairPriceFor(0)).toThrow();
    expect(clearsFair(2.6, 0.49)).toBe(true);
    expect(clearsFair(1.9, 0.49)).toBe(false);
  });
});

const usage = (week: number, o: Partial<UsageGame> = {}): UsageGame => ({
  playerId: 'cook', gameId: `g${week}`, week, team: 'buf', position: 'RB', snapPct: 0.6,
  rzCarries: 2, rzTargets: 0, rzCarryTds: 0, rzTargetTds: 0, touchdowns: 0, ...o,
});

describe('core sample', () => {
  it('leads with carries for a back and targets for a receiver; a QB counts only carries', () => {
    expect(opportunitiesFor('RB')).toEqual(['rzCarries', 'rzTargets']);
    expect(opportunitiesFor('TE')).toEqual(['rzTargets', 'rzCarries']);
    expect(opportunitiesFor('QB')).toEqual(['rzCarries']);
  });

  it('gives his share of the team over the season and his last 3, and his snap share', () => {
    const own = [1, 2, 3, 4].map((w) => usage(w, { rzCarries: w, rzTargets: w === 4 ? 1 : 0, snapPct: 0.4 + w * 0.05 }));
    const mates = [1, 2, 3, 4].map((w) => usage(w, { playerId: 'mate', rzCarries: 2, rzTargets: 1 }));
    const other = usage(4, { playerId: 'opp', team: 'mia', rzCarries: 9 });
    const s = coreSample(own, [...own, ...mates, other], 'RB')!;
    expect(s.types).toEqual(['rzCarries', 'rzTargets']);
    expect(s.season.games).toBe(4);
    expect(s.season.rzCarries).toEqual({ own: 10, team: 18, share: 10 / 18 });
    expect(s.recent.games).toBe(3);
    expect(s.recent.rzCarries).toEqual({ own: 9, team: 15, share: 9 / 15 });
    expect(s.recent.snaps).toBeCloseTo(0.55);
    expect(s.season.rzTargets.share).toBeCloseTo(1 / 5);
  });

  it('leaves out a secondary type he never had, and is null with no games', () => {
    const s = coreSample([usage(1, { rzCarries: 0, rzTargets: 2, position: 'WR' })], [], 'WR')!;
    expect(s.types).toEqual(['rzTargets']);
    expect(s.season.snaps).toBe(0.6);
    expect(s.season.rzCarries.share).toBeNull();
    expect(coreSample([], [], 'WR')).toBeNull();
  });
});

const tg = (week: number, touchdowns: number, o: Partial<TrendGame> = {}): TrendGame => ({ week, home: week % 2 === 0, favored: true, touchdowns, redZone: 1, ...o });

describe('trend lines', () => {
  it('scores strength times sample', () => {
    expect(trendScore(0.75, 4)).toBe(0.5);
    expect(trendScore(0.5, 100)).toBe(0);
  });

  it('never cites fewer than 3 games', () => {
    const games = [tg(1, 1, { home: true }), tg(2, 1, { home: true }), tg(3, 0, { home: false })];
    const lines = trendCandidates(games, { home: false, favored: null });
    expect(lines.map((t) => t.kind).sort()).toEqual(['redZone', 'season']);
    expect(lines.every((t) => t.games >= 3)).toBe(true);
  });

  it('picks the three strongest lines, with the venue and role of this game', () => {
    // 12 games: scored in 8; at home 6 of 6; as an underdog 0 of 4; a red zone chance in all 12.
    const games = Array.from({ length: 12 }, (_, i) => tg(i + 1, i % 2 === 1 || i < 4 ? 1 : 0, { home: i % 2 === 1, favored: !(i >= 4 && i % 2 === 0) }));
    const lines = trendLines(games, { home: true, favored: false });
    expect(lines.map((t) => t.kind)).toEqual(['redZone', 'venue', 'role']);
    expect(lines[1]).toMatchObject({ hits: 6, games: 6, side: 'home' });
    expect(lines[2]).toMatchObject({ hits: 0, games: 4, side: 'underdog' });
  });

  it('puts the season rate before the last 10 when both make the cut', () => {
    // The last 10 (10 of 10) outscores the season (10 of 14), yet the season leads.
    const games = Array.from({ length: 14 }, (_, i) => tg(i + 1, i >= 4 ? 1 : 0, { redZone: null, favored: null }));
    expect(trendCandidates(games, { home: true, favored: null }).map((t) => t.kind)).toEqual(['last10', 'season', 'venue']);
    expect(trendLines(games, { home: true, favored: null }).map((t) => t.kind)).toEqual(['season', 'last10', 'venue']);
  });

  it('only offers the last 10 once it differs from the season', () => {
    const games = Array.from({ length: 10 }, (_, i) => tg(i + 1, 1));
    expect(trendCandidates(games, { home: true, favored: true }).some((t) => t.kind === 'last10')).toBe(false);
  });

  it('says red zone chances are up or down when the last 3 move half a chance a game from the rest', () => {
    const up = [0, 0, 1, 2, 3, 3].map((rz, i) => tg(i + 1, 0, { redZone: rz }));
    expect(trendCandidates(up, { home: true, favored: true }).find((t) => t.kind === 'redZone')).toMatchObject({ hits: 4, games: 6, side: 'up' });
    const down = [3, 3, 2, 1, 0, 0].map((rz, i) => tg(i + 1, 0, { redZone: rz }));
    expect(trendCandidates(down, { home: true, favored: true }).find((t) => t.kind === 'redZone')?.side).toBe('down');
    const thin = [0, 3, 3, 3].map((rz, i) => tg(i + 1, 0, { redZone: rz }));
    expect(trendCandidates(thin, { home: true, favored: true }).find((t) => t.kind === 'redZone')?.side).toBe('flat');
  });

  it('reads favored from the spread for either side', () => {
    expect(favoredBySpread(3, true)).toBe(true);
    expect(favoredBySpread(3, false)).toBe(false);
    expect(favoredBySpread(-2.5, false)).toBe(true);
    expect(favoredBySpread(0, true)).toBeNull();
    expect(favoredBySpread(null, true)).toBeNull();
  });
});

describe('matchup', () => {
  const games: MatchupGame[] = [
    { gameId: 'a', week: 1, home: 'mia', away: 'buf' },
    { gameId: 'b', week: 2, home: 'nyj', away: 'mia' },
    { gameId: 'c', week: 3, home: 'mia', away: 'ne' },
    { gameId: 'd', week: 3, home: 'nyj', away: 'buf' },
  ];
  const scores: MatchupScore[] = [
    { gameId: 'a', team: 'buf', position: 'RB', touchdowns: 2 },
    { gameId: 'a', team: 'buf', position: 'WR', touchdowns: 1 },
    { gameId: 'a', team: 'mia', position: 'RB', touchdowns: 0 },
    { gameId: 'b', team: 'nyj', position: 'FB', touchdowns: 1 },
    { gameId: 'c', team: 'ne', position: 'TE', touchdowns: 1 },
    { gameId: 'd', team: 'buf', position: 'RB', touchdowns: 0 },
  ];

  it('ranks the defense by touchdowns allowed per game to the position, 1 allowing the most', () => {
    const m = matchup(games, scores, 'RB', 'mia')!;
    // Miami: 2, 1 (a fullback counts as a back), 0 over 3 games.
    expect(m).toMatchObject({ defense: 'mia', position: 'RB', rank: 1, teams: 4, games: 3, perGame: 1 });
    expect(m.recent).toEqual([
      { week: 1, against: 'buf', touchdowns: 2 }, { week: 2, against: 'nyj', touchdowns: 1 }, { week: 3, against: 'ne', touchdowns: 0 },
    ]);
  });

  it('shares a rank on a tie and keeps only the last weeks', () => {
    const m = matchup(games, scores, 'RB', 'buf')!;
    expect(m.rank).toBe(2);
    expect(matchup(games, scores, 'RB', 'nyj')!.rank).toBe(2);
    expect(matchup(games, scores, 'RB', 'mia', 2)!.recent.map((w) => w.week)).toEqual([2, 3]);
  });

  it('is null for a defense with no game', () => {
    expect(matchup(games, scores, 'RB', 'kc')).toBeNull();
  });
});
