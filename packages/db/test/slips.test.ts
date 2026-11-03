import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import {
  BACKUP_TABLES, addLeg, bets, changeToOwnPlay, createDb, dumpDatabase, games, getSlip, markPlaced, markSent, openSlip, parlayLegBets, picks, players,
  removeLeg, seedReference, seedSampleSlip, setStake, slipForWeek, slipLegs, slips,
} from '../src';

const handle = createDb('memory://');
const db = handle.db;
const now = new Date('2026-11-05T15:00:00Z');
const kickoff = new Date('2026-11-08T18:00:00Z');

const pick = (key: string, gameId: string, playerId: string, extra: Partial<typeof picks.$inferInsert> = {}): typeof picks.$inferInsert => ({
  selectionKey: key, gameId, marketId: 'anytime_td', playerId, side: 'yes', bookId: 'draftkings', price: 2.6, priced: 0.385, fair: 0.36,
  hitChance: 0.49, clarity: 80, carat: 13, gapToPosted: 10.5, kind: 'gem', rating: 92, recommended: 0.39, model: 'v3', runId: 'r1', updatedAt: now,
  link: `https://sportsbook.draftkings.com/event/1?outcomes=${key}`, ...extra,
});

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
  await db.insert(games).values([
    { id: 'g1', season: 2026, week: 10, kickoffAt: kickoff, awayTeamId: 'mia', homeTeamId: 'buf' },
    { id: 'g2', season: 2026, week: 10, kickoffAt: new Date(kickoff.getTime() + 3 * 3_600_000), awayTeamId: 'nyg', homeTeamId: 'was' },
    { id: 'g0', season: 2026, week: 10, kickoffAt: new Date('2026-11-05T01:15:00Z'), awayTeamId: 'kc', homeTeamId: 'lv' },
  ]);
  await db.insert(players).values([
    { id: 'p1', name: 'James Cook', nameKey: 'jamescook', teamId: 'buf', jerseyNumber: 4 },
    { id: 'p2', name: 'Deebo Samuel', nameKey: 'deebosamuel', teamId: 'was', jerseyNumber: 1 },
    { id: 'p3', name: 'Khalil Shakir', nameKey: 'khalilshakir', teamId: 'buf', jerseyNumber: 10 },
    { id: 'p4', name: 'Travis Kelce', nameKey: 'traviskelce', teamId: 'kc', jerseyNumber: 87 },
  ]);
  await db.insert(picks).values([
    pick('k1', 'g1', 'p1'),
    pick('k2', 'g2', 'p2', { price: 2.55, hitChance: 0.47, rating: 76, recommended: 0.35 }),
    pick('k3', 'g1', 'p3', { kind: 'fools-gold', rating: null, recommended: null }),
    pick('k4', 'g0', 'p4'),
  ]);
});
afterAll(() => handle.close());

describe('slips', () => {
  it('starts a draft, own play, when the first gem is added', async () => {
    const r = await addLeg(db, 'k1', now);
    expect(r.ok).toBe(true);
    const s = await openSlip(db, 2026, 10);
    expect(s).toMatchObject({ number: 1, state: 'draft', play: 'own', stake: null, bookId: 'draftkings' });
    expect(s!.legs).toHaveLength(1);
    expect(s!.legs[0]).toMatchObject({ name: 'James Cook', teamId: 'buf', number: 4, addedPrice: 2.6, price: 2.6, hitChance: 0.49, rating: 92, awayTeamId: 'mia' });
  });

  it('adds to the same slip, once per selection, and keeps the price at add time', async () => {
    const first = await addLeg(db, 'k2', now);
    expect(await addLeg(db, 'k2', now)).toEqual(first);
    await db.update(picks).set({ price: 2.4 }).where(eq(picks.selectionKey, 'k2'));
    const s = await openSlip(db, 2026, 10);
    expect(s!.legs.map((l) => l.selectionKey)).toEqual(['k1', 'k2']);
    expect(s!.legs[1]).toMatchObject({ addedPrice: 2.55, price: 2.4 });
  });

  it('refuses Fool\'s Gold, started games and unknown props', async () => {
    expect(await addLeg(db, 'k3', now)).toEqual({ ok: false, error: 'Only gems go on a slip' });
    expect(await addLeg(db, 'k4', now)).toEqual({ ok: false, error: 'Its game has kicked off' });
    expect(await addLeg(db, 'nope', now)).toEqual({ ok: false, error: 'That prop is no longer on the board' });
  });

  it('sets the stake and turns a suggested play into your own when its legs change', async () => {
    const s = (await openSlip(db, 2026, 10))!;
    expect((await setStake(db, s.id, 15, now)).ok).toBe(true);
    await db.update(slips).set({ play: 'suggested', state: 'assessed', appraisal: 'Both legs clear the cut.' }).where(eq(slips.id, s.id));
    expect((await changeToOwnPlay(db, s.id, now)).ok).toBe(true);
    expect(await getSlip(db, s.id)).toMatchObject({ play: 'own', state: 'draft', appraisal: null, stake: 15 });
    await db.update(slips).set({ play: 'suggested' }).where(eq(slips.id, s.id));
    await removeLeg(db, s.id, 'k2', now);
    expect(await getSlip(db, s.id)).toMatchObject({ play: 'own' });
    await addLeg(db, 'k2', now);
  });

  it('marks it sent, then placed, writing one bet per leg', async () => {
    const s = (await openSlip(db, 2026, 10))!;
    await markSent(db, s.id, now);
    expect(await getSlip(db, s.id)).toMatchObject({ state: 'sent', sentAt: now });
    expect(await markPlaced(db, s.id, 'slip', now)).toEqual({ ok: true, slipId: s.id });
    const placed = (await getSlip(db, s.id))!;
    expect(placed).toMatchObject({ state: 'placed', placedAt: now, play: 'own' });
    const written = await db.select().from(bets);
    expect(written).toHaveLength(2);
    expect(written.map((b) => [b.selectionKey, b.priceDecimal, b.stake, b.status])).toEqual(expect.arrayContaining([
      ['k1', 2.6, '15.00', 'open'], ['k2', 2.4, '15.00', 'open'],
    ]));
    expect(placed.legs.every((l) => l.betId)).toBe(true);
    expect(await parlayLegBets(db, written.map((b) => b.id))).toEqual(new Set(written.map((b) => b.id)));
  });

  it('locks a placed slip, shows it for the week, and starts a new one on the next add', async () => {
    const placed = (await slipForWeek(db, 2026, 10))!;
    expect(placed.state).toBe('placed');
    expect(await openSlip(db, 2026, 10)).toBeNull();
    expect(await removeLeg(db, placed.id, 'k1', now)).toEqual({ ok: false, error: 'This slip is already placed' });
    expect(await markPlaced(db, placed.id, 'slip', now)).toEqual({ ok: false, error: 'This slip is already placed' });
    await addLeg(db, 'k1', new Date(now.getTime() + 1000));
    const next = (await slipForWeek(db, 2026, 10))!;
    expect(next).toMatchObject({ number: 2, state: 'draft' });
    expect(await markPlaced(db, next.id, 'other', now)).toEqual({ ok: false, error: 'Set the stake first' });
    expect((await markPlaced(db, next.id, 'other', now, 5)).ok).toBe(true);
    expect(await getSlip(db, next.id)).toMatchObject({ state: 'placed', play: 'own', stake: 5 });
    const single = (await db.select().from(slipLegs).where(eq(slipLegs.slipId, next.id)))[0]!;
    expect(await parlayLegBets(db, [single.betId!])).toEqual(new Set());
  });

  it('seeds one sample draft from the top gems in different games, once per week', async () => {
    const h = createDb('memory://');
    await h.migrate();
    await seedReference(h.db);
    await h.db.insert(games).values((await db.select().from(games)));
    await h.db.insert(players).values(await db.select().from(players));
    await h.db.insert(picks).values(await db.select().from(picks));
    const id = await seedSampleSlip(h.db, now);
    const s = (await getSlip(h.db, id!))!;
    expect(s).toMatchObject({ state: 'draft', play: 'own', stake: 15 });
    expect(s.legs.map((l) => l.selectionKey)).toEqual(['k1', 'k2']);
    expect(await seedSampleSlip(h.db, now)).toBeNull();
    await h.close();
  });

  it('keeps working before the migration runs', async () => {
    const h = createDb('memory://');
    await h.migrate();
    await seedReference(h.db);
    await h.db.insert(games).values(await db.select().from(games));
    await h.db.insert(players).values(await db.select().from(players));
    await h.db.insert(picks).values(await db.select().from(picks));
    await h.db.execute(sql`drop table slip_legs`);
    await h.db.execute(sql`drop table slips`);
    expect(await openSlip(h.db, 2026, 10)).toBeNull();
    expect(await slipForWeek(h.db, 2026, 10)).toBeNull();
    expect(await addLeg(h.db, 'k1', now)).toEqual({ ok: false, error: 'Slips start once the database update runs' });
    expect(await parlayLegBets(h.db, ['x'])).toEqual(new Set());
    expect(await seedSampleSlip(h.db, now)).toBeNull();
    expect(Object.keys((await dumpDatabase(h.db)).tables)).not.toContain('slips');
    await h.close();
  });

  it('is backed up, parents first', () => {
    const names = BACKUP_TABLES.map((t) => (t as unknown as Record<symbol, string>)[Symbol.for('drizzle:Name')]);
    expect(names.indexOf('slips')).toBeGreaterThan(names.indexOf('bets'));
    expect(names.indexOf('slip_legs')).toBeGreaterThan(names.indexOf('slips'));
  });
});
