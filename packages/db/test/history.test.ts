import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bets, createDb, gemGrades, gemRecords, games, grades, placedSlip, placedSlips, players, seedReference, slipLegs, slips } from '../src';

const handle = createDb('memory://');
const db = handle.db;
const kickoff = new Date('2026-11-01T18:00:00Z');
const at = new Date('2026-11-02T03:00:00Z');

const grade = (extra: Partial<typeof grades.$inferInsert>): typeof grades.$inferInsert => ({
  runId: 'r', subject: 'gem', selectionKey: 'k', gameId: 'g1', taken: 2.4, closePrice: 2.25, closeFair: 0.4, clv: 0.05, beatClose: true, hit: true,
  touchdowns: 1, box: 'earned', gradedAt: at, ...extra,
});
const record = (key: string, playerId: string, gameId = 'g1'): typeof gemRecords.$inferInsert => ({
  runId: 'r', selectionKey: key, gameId, marketId: 'anytime_td', playerId, side: 'yes', bookId: 'draftkings', kind: 'gem', rating: 80, hitChance: 0.45,
  clarity: 70, carat: 8, decisionAt: kickoff, decisionPrice: 2.4, decisionPriced: 0.41, decisionFair: 0.38, freezeAt: kickoff, freezePrice: 2.25,
  freezePriced: 0.44, freezeFair: 0.4, isNew: false, model: 'sample', recordedAt: at,
});

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
  await db.insert(games).values([
    { id: 'g1', season: 2026, week: 8, kickoffAt: kickoff, awayTeamId: 'ten', homeTeamId: 'buf', status: 'final' },
    { id: 'g2', season: 2026, week: 8, kickoffAt: new Date(kickoff.getTime() + 3 * 3_600_000), awayTeamId: 'was', homeTeamId: 'sea', status: 'final' },
    { id: 'g0', season: 2025, week: 8, kickoffAt: new Date('2025-10-26T17:00:00Z'), awayTeamId: 'kc', homeTeamId: 'lv', status: 'final' },
  ]);
  await db.insert(players).values([
    { id: 'p1', name: 'James Cook', nameKey: 'jamescook', teamId: 'buf', jerseyNumber: 4, position: 'RB' },
    { id: 'p2', name: 'Terry McLaurin', nameKey: 'terrymclaurin', teamId: 'was', jerseyNumber: 17, position: 'WR' },
  ]);
  const [r1, r2, r0] = await db.insert(gemRecords).values([record('k1', 'p1'), record('k2', 'p2', 'g2'), record('k0', 'p1', 'g0')]).returning();
  await db.insert(grades).values([
    grade({ gemRecordId: r1!.id, selectionKey: 'k1' }),
    grade({ gemRecordId: r2!.id, selectionKey: 'k2', gameId: 'g2', clv: -0.03, beatClose: false, hit: false, touchdowns: 0, box: 'wrong-read' }),
    grade({ gemRecordId: r0!.id, selectionKey: 'k0', gameId: 'g0' }),
  ]);
});
afterAll(() => handle.close());

describe('history reads', () => {
  it('reads every graded gem of the season', async () => {
    const rows = await gemGrades(db, 2026);
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([{ week: 8, clv: 0.05, box: 'earned' }, { week: 8, clv: -0.03, box: 'wrong-read' }]));
  });

  it('reads placed slips with each leg, its bet and its grade, and leaves drafts out', async () => {
    const [slip, draft] = await db.insert(slips).values([
      { season: 2026, week: 8, state: 'placed', play: 'suggested', stake: '15.00', placedAt: kickoff },
      { season: 2026, week: 8, state: 'draft', stake: '5.00' },
    ]).returning();
    const legs = [{ key: 'k1', gameId: 'g1', playerId: 'p1', price: 2.4, status: 'won' }, { key: 'k2', gameId: 'g2', playerId: 'p2', price: 3.2, status: 'open' }];
    for (const l of legs) {
      const sel = { selectionKey: l.key, gameId: l.gameId, marketId: 'anytime_td', playerId: l.playerId, side: 'yes', line: null, bookId: 'draftkings' };
      const [bet] = await db.insert(bets).values({ ...sel, placedAt: kickoff, priceDecimal: l.price, stake: '15.00', status: l.status, closingPrice: 3.1 }).returning();
      await db.insert(slipLegs).values({ ...sel, slipId: slip!.id, priceDecimal: l.price, addedAt: kickoff, betId: bet!.id });
      if (l.key === 'k1') await db.insert(grades).values(grade({ subject: 'bet', betId: bet!.id, clv: 0.067 }));
    }
    await db.insert(slipLegs).values({ selectionKey: 'k1', gameId: 'g1', marketId: 'anytime_td', playerId: 'p1', side: 'yes', bookId: 'draftkings', slipId: draft!.id, priceDecimal: 2.4, addedAt: kickoff });

    const all = (await placedSlips(db, 2026))!;
    expect(all.map((s) => s.id)).toEqual([slip!.id]);
    const s = (await placedSlip(db, slip!.id))!;
    expect(s).toMatchObject({ week: 8, number: 1, ofWeek: 1, play: 'suggested', stake: 15, placedAt: kickoff });
    expect(s.legs).toEqual([
      expect.objectContaining({ name: 'James Cook', teamId: 'buf', number: 4, position: 'RB', price: 2.4, status: 'won', closePrice: 2.25, clv: 0.067, box: 'earned', hit: true, gradedAt: at }),
      expect.objectContaining({ name: 'Terry McLaurin', price: 3.2, status: 'open', closePrice: 3.1, clv: null, box: null, hit: null }),
    ]);
    expect(await placedSlip(db, draft!.id)).toBeNull();
    expect(await placedSlip(db, 'nope')).toBeNull();
  });

  it('returns null before the grades and slips migrations run', async () => {
    const h = createDb('memory://');
    await h.migrate();
    await h.db.execute(sql`drop table slip_legs`);
    await h.db.execute(sql`drop table slips`);
    await h.db.execute(sql`drop table grades`);
    expect(await gemGrades(h.db, 2026)).toBeNull();
    expect(await placedSlips(h.db, 2026)).toBeNull();
    expect(await placedSlip(h.db, 'x')).toBeNull();
    await h.close();
  });
});
