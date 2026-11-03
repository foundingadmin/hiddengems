import { describe, expect, it } from 'vitest';
import {
  type SplitKey, type SplitRosterEntry, type SplitScheduleGame, type Splits, type SplitsInput, type UsageGame,
  combineSplits, keyTeammates, restOf, splitRate, splitsFor, startingQbs,
} from '../src';
import week8 from './fixtures/week8.json';

const at = (iso: string) => new Date(iso);
const line = (gameId: string, week: number, kickoff: string, away: string, home: string, spreadLine: number | null, totalLine: number | null, neutralSite = false): SplitScheduleGame => ({
  gameId, week, kickoff: at(kickoff), awayTeam: away, homeTeam: home, spreadLine, totalLine, neutralSite,
});

// Buffalo's season before Week 7: a Thursday game, a bye in Week 4, a neutral site, a Monday night, then at Las Vegas.
const schedule = [
  line('g1', 1, '2026-09-13T17:00:00Z', 'mia', 'buf', 3, 48),
  line('g2', 2, '2026-09-18T00:15:00Z', 'buf', 'nyj', 2, 40),
  line('g3', 3, '2026-09-27T17:00:00Z', 'ne', 'buf', -1, 44),
  line('g4', 5, '2026-10-11T13:30:00Z', 'buf', 'kc', 0, 50, true),
  line('g5', 6, '2026-10-20T00:15:00Z', 'den', 'buf', 6.5, 45),
  line('g7', 7, '2026-10-25T20:05:00Z', 'buf', 'lv', -3, 47),
];
const game = schedule.at(-1)!;

const use = (playerId: string, gameId: string, position: string, snapPct: number | null, touchdowns = 0): UsageGame => ({
  playerId, gameId, week: schedule.find((g) => g.gameId === gameId)!.week, team: 'buf', position, snapPct,
  rzCarries: 0, rzTargets: 0, rzCarryTds: 0, rzTargetTds: 0, touchdowns,
});
const cookTds: Record<string, number> = { g1: 1, g2: 0, g3: 2, g4: 0, g5: 1 };
const usage: UsageGame[] = [
  ...['g1', 'g2', 'g3'].flatMap((g) => [use('allen', g, 'QB', 1)]),
  use('allen', 'g4', 'QB', 0.1), use('backup', 'g4', 'QB', 0.9),
  ...['g1', 'g2', 'g3', 'g4'].flatMap((g) => [
    use('cook', g, 'RB', 0.7, cookTds[g]), use('rb2', g, 'RB', 0.3), use('wr2', g, 'WR', 0.6), use('te1', g, 'TE', 0.8),
  ]),
  ...['g1', 'g2', 'g4'].map((g) => use('wr1', g, 'WR', 0.9)),
  // Week 6 snap counts have not landed: play by play only, both quarterbacks touched the ball.
  use('allen', 'g5', 'QB', null), use('backup', 'g5', 'QB', null), use('cook', 'g5', 'RB', null, 1), use('wr1', 'g5', 'WR', null), use('te1', 'g5', 'TE', null),
];
const played = [...Object.entries(cookTds).map(([gameId, touchdowns]) => ({ gameId, team: 'buf', touchdowns })), { gameId: 'g7', team: 'buf', touchdowns: 3 }];
const passing = [{ gameId: 'g5', playerId: 'allen', passingYards: 251 }, { gameId: 'g5', playerId: 'backup', passingYards: 0 }];
const listed = (over: Record<string, Partial<SplitRosterEntry>> = {}): SplitRosterEntry[] => ['allen', 'backup', 'cook', 'rb2', 'wr1', 'wr2', 'te1']
  .map((playerId) => ({ playerId, teamId: 'buf', status: 'ACT', injuryStatus: null, ...over[playerId] }));
const input = (roster?: SplitRosterEntry[]): SplitsInput => ({ playerId: 'cook', team: 'buf', game, schedule, played, usage, passing, roster });
const split = (s: Splits, key: SplitKey) => s.splits.find((x) => x.key === key)!;

describe('splits', () => {
  it('shrinks a split toward the season rate over 4 games', () => {
    expect(splitRate(3, 4, 0.6)).toBeCloseTo((3 + 2.4) / 8, 12);
    expect(splitRate(0, 0, 0.35)).toBe(0.35);
  });

  it('reads rest from Eastern calendar days since the last game', () => {
    expect(restOf(at('2026-09-18T00:15:00Z'), at('2026-09-13T17:00:00Z'))).toBe('short');
    expect(restOf(at('2026-10-25T17:00:00Z'), at('2026-10-20T00:15:00Z'))).toBe('normal');
    expect(restOf(at('2026-10-11T13:30:00Z'), at('2026-09-27T17:00:00Z'))).toBe('bye');
    expect(restOf(at('2026-09-13T17:00:00Z'), null)).toBeNull();
  });

  it('names the starter by snaps, then passing yards, then the only quarterback', () => {
    const qbs = startingQbs(usage, passing);
    expect(qbs.get('g4|buf')).toBe('backup');
    expect(qbs.get('g5|buf')).toBe('allen');
    expect(startingQbs(usage).has('g5|buf')).toBe(false);
    expect(startingQbs([use('allen', 'g5', 'QB', null)]).get('g5|buf')).toBe('allen');
  });

  it('picks the top WR, RB and TE by snap share among players still on the team', () => {
    expect(keyTeammates(usage, 'buf').map((l) => l.playerId)).toEqual(['wr1', 'cook', 'te1']);
    const traded = listed({ wr1: { teamId: 'mia' } });
    expect(keyTeammates(usage, 'buf', traded).map((l) => l.playerId)).toEqual(['wr2', 'cook', 'te1']);
  });

  it('tags each game and counts every side, shrunk toward his season rate', () => {
    const s = splitsFor(input(listed()))!;
    expect(s.season).toEqual({ hits: 3, games: 5, rate: 0.6 });
    expect(s.log.map((g) => g.sides)).toEqual([
      { qb: 'usual', teammate: 'in', venue: 'home', rest: null, implied: 'above', role: 'favorite' },
      { qb: 'usual', teammate: 'in', venue: 'away', rest: 'short', implied: 'below', role: 'underdog' },
      { qb: 'usual', teammate: 'out', venue: 'home', rest: 'normal', implied: 'below', role: 'underdog' },
      { qb: 'other', teammate: 'in', venue: null, rest: 'bye', implied: 'above', role: null },
      { qb: 'usual', teammate: null, venue: 'home', rest: 'normal', implied: 'above', role: 'favorite' },
    ]);
    const qb = split(s, 'qb');
    expect(qb).toMatchObject({ current: 'usual', hits: 3, games: 4, seasonRate: 0.6, thin: false, players: ['allen'] });
    expect(qb.rate).toBeCloseTo(5.4 / 8, 12);
    expect(qb.sides[1]).toMatchObject({ side: 'other', hits: 0, games: 1, thin: true });
    expect(qb.sides[1]!.rate).toBeCloseTo(2.4 / 5, 12);
    expect(split(s, 'teammate')).toMatchObject({ current: 'in', hits: 1, games: 3, thin: false, players: ['wr1', 'te1'] });
    expect(split(s, 'venue')).toMatchObject({ current: 'away', hits: 0, games: 1, thin: true });
    expect(split(s, 'rest')).toMatchObject({ current: 'normal', hits: 2, games: 2, thin: true });
    expect(split(s, 'rest').rate).toBeCloseTo(4.4 / 6, 12);
    expect(split(s, 'implied')).toMatchObject({ current: 'above', hits: 2, games: 3, thin: false });
    expect(split(s, 'role')).toMatchObject({ current: 'favorite', hits: 2, games: 2, thin: true });
  });

  it('puts this week on a side from the roster and the injury report', () => {
    const out = splitsFor(input(listed({ allen: { injuryStatus: 'Out' }, wr1: { status: 'RES' } })))!;
    expect(split(out, 'qb')).toMatchObject({ current: 'other', hits: 0, games: 1, thin: true });
    expect(split(out, 'teammate')).toMatchObject({ current: 'out', hits: 1, games: 1 });
    const unsure = splitsFor(input(listed({ allen: { injuryStatus: 'Questionable' }, te1: { injuryStatus: 'Questionable' } })))!;
    expect(split(unsure, 'qb')).toMatchObject({ current: null, hits: 0, games: 0, rate: 0.6, thin: true });
    expect(split(unsure, 'teammate').current).toBeNull();
    expect(split(splitsFor(input())!, 'qb').current).toBe('usual');
  });

  it('combines conditions for the loupe, skipping one with no side this week', () => {
    const s = splitsFor(input(listed({ allen: { injuryStatus: 'Questionable' } })))!;
    expect(combineSplits(s, [])).toMatchObject({ hits: 3, games: 5 });
    expect(combineSplits(s, []).rate).toBeCloseTo(0.6, 12);
    const both = combineSplits(s, ['implied', 'role']);
    expect(both).toMatchObject({ keys: ['implied', 'role'], hits: 2, games: 2, thin: true });
    expect(both.rate).toBeCloseTo(4.4 / 6, 12);
    expect(combineSplits(s, ['qb', 'venue'])).toMatchObject({ keys: ['venue'], hits: 0, games: 1 });
  });

  it('has nothing to say before his first game', () => {
    expect(splitsFor({ ...input(), played: [{ gameId: 'g7', team: 'buf', touchdowns: 1 }] })).toBeNull();
  });
});

describe("splits on real Week 8 data (D'Andre Swift, CHI at SEA)", () => {
  type Fixture = { logs: [string, string, number, string, string, number | null, number, number, number, number, number][]; lines: [string, number, string, string, number | null, number | null][] };
  const fx = week8 as unknown as Fixture;
  const logs: UsageGame[] = fx.logs.map(([playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns]) => ({
    playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns,
  }));
  // The fixture has no kickoffs; every game is placed on its week's Sunday, so rest reads normal after Week 1.
  const lines: SplitScheduleGame[] = fx.lines.map(([gameId, week, homeTeam, awayTeam, spreadLine, totalLine]) => ({
    gameId, week, homeTeam, awayTeam, spreadLine, totalLine, neutralSite: false, kickoff: new Date(Date.UTC(2026, 8, 13 + 7 * (week - 1), 17)),
  }));
  const swift = '00-0036275';
  const s = splitsFor({
    playerId: swift, team: 'CHI', game: lines.find((g) => g.gameId === '2026_08_CHI_SEA')!, schedule: lines,
    played: logs.filter((l) => l.playerId === swift).map((l) => ({ gameId: l.gameId, team: l.team, touchdowns: l.touchdowns })),
    usage: logs.filter((l) => l.team === 'CHI'),
  })!;

  it('reads his season and the quarterback who started most of it', () => {
    expect(s.season).toEqual({ hits: 4, games: 7, rate: 4 / 7 });
    expect(split(s, 'qb')).toMatchObject({ current: 'usual', hits: 3, games: 4, players: ['00-0039918'] });
    expect(split(s, 'qb').rate).toBeCloseTo((3 + 16 / 7) / 8, 12);
    expect(split(s, 'qb').sides[1]).toMatchObject({ side: 'other', hits: 1, games: 3 });
  });

  it('reads venue, implied points and role for the trip to Seattle', () => {
    expect(split(s, 'venue')).toMatchObject({ current: 'away', hits: 3, games: 3, thin: false });
    expect(split(s, 'implied')).toMatchObject({ current: 'below', hits: 0, games: 1, thin: true });
    expect(split(s, 'role')).toMatchObject({ current: 'underdog', hits: 0, games: 1, thin: true });
    expect(split(s, 'teammate')).toMatchObject({ current: 'in', hits: 4, games: 7, players: ['00-0039919', '00-0040126'] });
  });
});
