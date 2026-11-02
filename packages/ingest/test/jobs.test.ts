import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bets, createDb, games, jobLocks, oddsSnapshots, picks, players, runLogs, runs, seedReference } from '@hiddengems/db';
import { count, desc, eq } from 'drizzle-orm';
import { BOOTSTRAP, grade, jobs, runJob } from '../src';
import { theirs } from '../src/errors';
import { sampleProviders } from '../src/providers';
import type { Providers } from '../src/providers';

// A fixed Thursday, so the sample week (and its Sunday kickoffs) never depends on the day tests run.
const now = new Date('2026-11-05T15:00:00Z');
const handle = createDb('memory://');
const db = handle.db;
const providers = sampleProviders();
const run = (job: string, extra: Partial<Parameters<typeof runJob>[1]> = {}) =>
  runJob(job, { db, providers, trigger: 'test', now, registry: jobs, ...extra });

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
});
afterAll(() => handle.close());

describe('bootstrap', () => {
  it('runs every job from an empty database', async () => {
    for (const job of BOOTSTRAP) {
      const r = await run(job, { force: true });
      expect(r.status, `${job}: ${r.message}`).toBe('succeeded');
    }
    const [g] = await db.select({ n: count() }).from(games);
    const [p] = await db.select({ n: count() }).from(players);
    const [s] = await db.select({ n: count() }).from(oddsSnapshots);
    const [k] = await db.select({ n: count() }).from(picks);
    expect(g!.n).toBe(8);
    expect(p!.n).toBe(13);
    expect(s!.n).toBeGreaterThan(50);
    expect(k!.n).toBeGreaterThan(10);
  });

  it('keeps jersey numbers from the roster', async () => {
    const [p] = await db.select().from(players).where(eq(players.name, 'Mike Gesicki'));
    expect(p).toMatchObject({ jerseyNumber: 88, teamId: 'cin', position: 'TE' });
  });

  it('logs each run with its numbers', async () => {
    const [r] = await db.select().from(runs).where(eq(runs.job, 'pull-odds')).orderBy(desc(runs.startedAt)).limit(1);
    expect(r).toMatchObject({ status: 'succeeded', provider: 'sample', trigger: 'test' });
    expect(r!.message).toMatch(/^Pulled \d+ prices across 4 books for 5 games/);
    expect(r!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('ranks picks with tiers and verdicts', async () => {
    const top = await db.select().from(picks).orderBy(desc(picks.gapPts)).limit(1);
    expect(top[0]!.gapPts).toBeGreaterThan(0);
    expect(['rough', 'cut', 'polished', 'flawless']).toContain(top[0]!.tier);
    expect(top[0]!.verdict).toBe('none'); // setup is unchecked until the real model lands
  });
});

describe('history and idempotency', () => {
  it('does not duplicate snapshots for an unchanged price', async () => {
    const [before] = await db.select({ n: count() }).from(oddsSnapshots);
    const r = await run('pull-odds', { force: true });
    const [after] = await db.select({ n: count() }).from(oddsSnapshots);
    expect(r.status).toBe('succeeded');
    expect(after!.n).toBe(before!.n);
  });
  it('appends history when prices move', async () => {
    const [before] = await db.select({ n: count() }).from(oddsSnapshots);
    await run('pull-odds', { force: true, now: new Date(now.getTime() + 20 * 60_000) });
    const [after] = await db.select({ n: count() }).from(oddsSnapshots);
    expect(after!.n).toBeGreaterThan(before!.n);
  });
  it('skips without a pull-log row when nothing is due', async () => {
    const [before] = await db.select({ n: count() }).from(runs);
    const r = await run('pull-odds', { now: new Date(now.getTime() + 21 * 60_000) });
    const [after] = await db.select({ n: count() }).from(runs);
    expect(r.status).toBe('skipped');
    expect(after!.n).toBe(before!.n);
  });
});

describe('failures and locks', () => {
  it('records a provider outage as theirs, with the log line', async () => {
    const down: Providers = { ...providers, odds: { ...providers.odds, async events() { throw theirs('server', 'sample returned 503'); } } };
    const r = await run('pull-odds', { providers: down, force: true });
    expect(r).toMatchObject({ status: 'failed', failureOwner: 'provider' });
    const [row] = await db.select().from(runs).where(eq(runs.id, r.runId!));
    expect(row).toMatchObject({ status: 'failed', failureOwner: 'provider', errorCode: 'server' });
    const logs = await db.select().from(runLogs).where(eq(runLogs.runId, r.runId!));
    expect(logs.some((l) => l.level === 'error')).toBe(true);
  });
  it('warns when players do not match a roster', async () => {
    const odd: Providers = { ...providers, odds: { ...providers.odds, async eventOdds(ctx, e, m) {
      const q = await providers.odds.eventOdds(ctx, e, m);
      return q.map((x, i) => (i === 0 ? { ...x, playerName: 'Nobody McNoname' } : x));
    } } };
    const r = await run('pull-odds', { providers: odd, force: true, now: new Date(now.getTime() + 40 * 60_000) });
    expect(r.status).toBe('warned');
  });
  it('refuses to overlap a running job', async () => {
    await db.insert(jobLocks).values({ job: 'pull-schedule', holder: 'someone', lockedUntil: new Date(Date.now() + 60_000) })
      .onConflictDoUpdate({ target: jobLocks.job, set: { holder: 'someone', lockedUntil: new Date(Date.now() + 60_000) } });
    expect((await run('pull-schedule')).status).toBe('locked');
    await db.update(jobLocks).set({ lockedUntil: null, holder: null });
    expect((await run('pull-schedule')).status).toBe('succeeded');
  });
});

describe('settlement', () => {
  const stat = { gameId: 'g', playerId: 'p', touchdowns: 1, receptions: 5, receivingYards: 60, rushingYards: null, passingYards: null, passingTds: null, extra: null, runId: 'r', updatedAt: now };
  it('grades props from stat lines', () => {
    expect(grade({ marketId: 'anytime_td', side: 'yes', line: null }, stat)).toBe('won');
    expect(grade({ marketId: 'anytime_td', side: 'yes', line: null }, { ...stat, touchdowns: 0 })).toBe('lost');
    expect(grade({ marketId: 'receptions', side: 'over', line: 4.5 }, stat)).toBe('won');
    expect(grade({ marketId: 'receptions', side: 'under', line: 4.5 }, stat)).toBe('lost');
    expect(grade({ marketId: 'receptions', side: 'over', line: 5 }, stat)).toBe('push');
    expect(grade({ marketId: 'first_td', side: 'yes', line: null }, stat)).toBeNull();
  });
  it('settles an open bet on a final game', async () => {
    const [game] = await db.select().from(games).where(eq(games.status, 'final')).limit(1);
    const [player] = await db.select().from(players).where(eq(players.teamId, game!.homeTeamId)).limit(1);
    await db.insert(bets).values({
      placedAt: new Date(game!.kickoffAt.getTime() - 3_600_000), selectionKey: `${game!.id}:anytime_td:${player!.id}:yes:-`,
      gameId: game!.id, marketId: 'anytime_td', playerId: player!.id, side: 'yes', line: null, bookId: 'draftkings', priceDecimal: 2.5, stake: '10.00',
    });
    const r = await run('pull-results', { force: true });
    expect(r.message).toMatch(/settled 1 bet/);
    const [bet] = await db.select().from(bets);
    expect(['won', 'lost']).toContain(bet!.status);
    expect(Number(bet!.payout)).toBe(bet!.status === 'won' ? 25 : 0);
  });
});
