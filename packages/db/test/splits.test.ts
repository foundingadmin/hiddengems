import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { combineSplits } from '@hiddengems/core';
import { eq } from 'drizzle-orm';
import { createDb, games, getSplits, playerGameStats, playerUsage, players, seedReference } from '../src';

const handle = createDb('memory://');
const db = handle.db;

// Buffalo through Week 6: a Thursday game, a bye, a neutral site, a Monday night whose snap counts have not landed.
const schedule = [
  { id: 'g1', week: 1, kickoffAt: new Date('2026-09-13T17:00:00Z'), awayTeamId: 'mia', homeTeamId: 'buf', spreadLine: 3, totalLine: 48 },
  { id: 'g2', week: 2, kickoffAt: new Date('2026-09-18T00:15:00Z'), awayTeamId: 'buf', homeTeamId: 'nyj', spreadLine: 2, totalLine: 40 },
  { id: 'g3', week: 3, kickoffAt: new Date('2026-09-27T17:00:00Z'), awayTeamId: 'ne', homeTeamId: 'buf', spreadLine: -1, totalLine: 44 },
  { id: 'g4', week: 5, kickoffAt: new Date('2026-10-11T13:30:00Z'), awayTeamId: 'buf', homeTeamId: 'kc', spreadLine: 0, totalLine: 50, neutralSite: true },
  { id: 'g5', week: 6, kickoffAt: new Date('2026-10-20T00:15:00Z'), awayTeamId: 'den', homeTeamId: 'buf', spreadLine: 6.5, totalLine: 45 },
  { id: 'g7', week: 7, kickoffAt: new Date('2026-10-25T20:05:00Z'), awayTeamId: 'buf', homeTeamId: 'lv', spreadLine: -3, totalLine: 47, status: 'scheduled' },
];
const roster = [
  { id: 'allen', name: 'Josh Allen', position: 'QB', jerseyNumber: 17 },
  { id: 'backup', name: 'Mitchell Trubisky', position: 'QB', jerseyNumber: 11 },
  { id: 'cook', name: 'James Cook', position: 'RB', jerseyNumber: 4 },
  { id: 'rb2', name: 'Ray Davis', position: 'RB', jerseyNumber: 22 },
  { id: 'wr1', name: 'Khalil Shakir', position: 'WR', jerseyNumber: 10 },
  { id: 'wr2', name: 'Keon Coleman', position: 'WR', jerseyNumber: 0 },
  { id: 'te1', name: 'Dalton Kincaid', position: 'TE', jerseyNumber: 86 },
];
const weekOf = (gameId: string) => schedule.find((g) => g.id === gameId)!.week;
const use = (playerId: string, gameId: string, position: string, snapPct: number | null, touchdowns = 0): typeof playerUsage.$inferInsert => ({
  gameId, playerId, season: 2026, week: weekOf(gameId), teamId: 'buf', position, snapPct, touchdowns, runId: 'r', updatedAt: new Date(),
});
const cookTds: Record<string, number> = { g1: 1, g2: 0, g3: 2, g4: 0, g5: 1 };

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
  await db.insert(games).values(schedule.map((g) => ({ season: 2026, status: 'final', ...g })));
  await db.insert(players).values(roster.map((p) => ({ ...p, nameKey: p.id, teamId: 'buf', status: 'ACT' })));
  await db.insert(playerUsage).values([
    ...['g1', 'g2', 'g3'].map((g) => use('allen', g, 'QB', 1)),
    use('allen', 'g4', 'QB', 0.1), use('backup', 'g4', 'QB', 0.9),
    ...['g1', 'g2', 'g3', 'g4'].flatMap((g) => [use('cook', g, 'RB', 0.7, cookTds[g]), use('rb2', g, 'RB', 0.3), use('wr2', g, 'WR', 0.6), use('te1', g, 'TE', 0.8)]),
    ...['g1', 'g2', 'g4'].map((g) => use('wr1', g, 'WR', 0.9)),
    use('allen', 'g5', 'QB', null), use('backup', 'g5', 'QB', null), use('cook', 'g5', 'RB', null, 0), use('wr1', 'g5', 'WR', null), use('te1', 'g5', 'TE', null),
  ]);
  // The stat line wins over play by play: Week 6's touchdown came on a return.
  await db.insert(playerGameStats).values([
    { gameId: 'g5', playerId: 'cook', touchdowns: 1, runId: 'r', updatedAt: new Date() },
    { gameId: 'g5', playerId: 'allen', touchdowns: 0, passingYards: 251, runId: 'r', updatedAt: new Date() },
    { gameId: 'g5', playerId: 'backup', touchdowns: 0, passingYards: 0, runId: 'r', updatedAt: new Date() },
  ]);
});
afterAll(() => handle.close());

describe('getSplits', () => {
  it("reads every condition for this week's game from stored usage, stats, schedule and roster", async () => {
    const s = (await getSplits(db, 'cook', 'g7'))!;
    expect(s).toMatchObject({ gameId: 'g7', teamId: 'buf', season: { hits: 3, games: 5, rate: 0.6 } });
    const by = Object.fromEntries(s.splits.map((x) => [x.key, x]));
    expect(by.qb).toMatchObject({ current: 'usual', hits: 3, games: 4, players: ['allen'] });
    expect(by.qb!.rate).toBeCloseTo((3 + 2.4) / 8, 12);
    expect(by.teammate).toMatchObject({ current: 'in', hits: 1, games: 3, players: ['wr1', 'te1'] });
    expect(by.venue).toMatchObject({ current: 'away', hits: 0, games: 1, thin: true });
    expect(by.rest).toMatchObject({ current: 'normal', hits: 2, games: 2 });
    expect(by.implied).toMatchObject({ current: 'above', hits: 2, games: 3, thin: false });
    expect(by.role).toMatchObject({ current: 'favorite', hits: 2, games: 2, thin: true });
    expect(s.log.map((g) => g.sides.teammate)).toEqual(['in', 'in', 'out', 'in', null]);
    expect(s.people.allen).toEqual({ name: 'Josh Allen', position: 'QB', teamId: 'buf', jerseyNumber: 17 });
    expect(combineSplits(s, ['implied', 'role'])).toMatchObject({ hits: 2, games: 2 });
  });

  it('follows the injury report for this week', async () => {
    await db.update(players).set({ injuryStatus: 'Out', injuryWeek: 7 }).where(eq(players.id, 'allen'));
    await db.update(players).set({ status: 'RES' }).where(eq(players.id, 'wr1'));
    const s = (await getSplits(db, 'cook', 'g7'))!;
    const by = Object.fromEntries(s.splits.map((x) => [x.key, x]));
    expect(by.qb).toMatchObject({ current: 'other', hits: 0, games: 1, thin: true });
    expect(by.teammate).toMatchObject({ current: 'out', hits: 1, games: 1 });
    await db.update(players).set({ injuryStatus: null, injuryWeek: null, status: 'ACT' });
  });

  it('is null for an unknown player or game, a team not in the game, or no games yet', async () => {
    expect(await getSplits(db, 'nobody', 'g7')).toBeNull();
    expect(await getSplits(db, 'cook', 'nope')).toBeNull();
    expect(await getSplits(db, 'cook', 'g1')).toBeNull();
    await db.insert(players).values({ id: 'mia1', name: 'Tyreek Hill', nameKey: 'tyreekhill', position: 'WR', teamId: 'mia' });
    expect(await getSplits(db, 'mia1', 'g7')).toBeNull();
  });
});
