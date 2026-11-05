// The backtest job on PGlite with the sample provider. The sample schedule holds one final week, so the season is
// built by pulling on each Tuesday from Sep 22 to Nov 3: Weeks 2 to 8 final, Week 9 still to play.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BACKTEST, walkForward } from '@hiddengems/core';
import { createDb, games, playerGameStats, playerUsage, runLogs, runs, seedReference } from '@hiddengems/db';
import { asc, eq, inArray } from 'drizzle-orm';
import { jobs, runJob } from '../src';
import { sampleProviders } from '../src/providers';

const handle = createDb('memory://');
const db = handle.db;
const providers = sampleProviders();
const tuesday = new Date('2026-11-03T12:37:00Z');
const run = (job: string, now = tuesday) => runJob(job, { db, providers, trigger: 'test', now, registry: jobs, force: true });
// The same data read as if it came from nflverse, so the baseline check runs.
const live = { ...providers, usage: { ...providers.usage, id: 'nflverse' } };
const runLive = (job: string) => runJob(job, { db, providers: live, trigger: 'test', now: tuesday, registry: jobs, force: true });

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
});
afterAll(() => handle.close());

describe('backtest', () => {
  it('has nothing to score before a completed Week 4 with earlier games', async () => {
    const first = new Date('2026-09-22T12:37:00Z');
    for (const job of ['pull-schedule', 'pull-rosters', 'pull-results', 'pull-usage']) await run(job, first);
    const r = await run('backtest', first);
    expect(r.status, r.message).toBe('succeeded');
    expect(r.message).toBe('Nothing to score yet: no completed week from Week 4 has earlier games to read');
  });

  it('scores every completed week from Week 4 walk forward, one log line per week', async () => {
    for (let t = new Date('2026-09-29T12:37:00Z'); t <= tuesday; t = new Date(t.getTime() + 7 * 86_400_000)) {
      for (const job of ['pull-schedule', 'pull-results', 'pull-usage']) await run(job, t);
    }
    const r = await runLive('backtest');
    // The sample's players score far more often than real ones, so it lands above the baseline and warns.
    expect(r.status).toBe('warned');
    expect(r.message).toMatch(/^Brier 0\.\d{4} over \d+ player games in Weeks 4 to 8$/);

    const [row] = await db.select().from(runs).where(eq(runs.id, r.runId!));
    const meta = row!.meta as unknown as ReturnType<typeof walkForward>;
    expect(meta.weeks.map((w) => w.week)).toEqual([4, 5, 6, 7, 8]);
    expect(meta.baseline).toBe(BACKTEST.baseline);
    expect(meta.games).toBe(meta.weeks.reduce((n, w) => n + w.games, 0));
    expect(r.message).toContain(`Brier ${meta.brier!.toFixed(4)} over ${meta.games} player games`);

    const logs = await db.select().from(runLogs).where(eq(runLogs.runId, r.runId!)).orderBy(asc(runLogs.id));
    const weekly = logs.filter((l) => l.level === 'info');
    expect(weekly.map((l) => l.data?.week)).toEqual([4, 5, 6, 7, 8]);
    expect(weekly[0]!.message).toMatch(/^Week 4: Brier 0\.\d{4} over \d+ player games?$/);
    // Week 9 has not been played, so it is not scored.
    expect(await db.select().from(games).where(eq(games.week, 9))).not.toHaveLength(0);

    expect(meta.aboveBaseline).toBe(true);
    expect(logs.filter((l) => l.level === 'warn').map((l) => l.message)).toEqual([`Brier is ${meta.delta!.toFixed(4)} above the 0.1360 baseline`]);
  });

  it('on sample data reports its score without the baseline check and does not warn', async () => {
    const r = await run('backtest');
    expect(r.status, r.message).toBe('succeeded');
    const [row] = await db.select().from(runs).where(eq(runs.id, r.runId!));
    const meta = row!.meta as unknown as ReturnType<typeof walkForward>;
    expect(meta.aboveBaseline).toBe(true);
    expect(r.message).toBe(`Brier ${meta.brier!.toFixed(4)} over ${meta.games} player games in Weeks 4 to 8 on sample data`);
    const logs = await db.select().from(runLogs).where(eq(runLogs.runId, r.runId!));
    expect(logs.filter((l) => l.level === 'warn')).toEqual([]);
    expect(logs.filter((l) => l.level === 'info')).toHaveLength(5);
  });

  it('reads whether he scored from his stat line', async () => {
    const before = (await db.select().from(runs).where(eq(runs.job, 'backtest')).orderBy(asc(runs.startedAt))).at(-1)!.meta as unknown as ReturnType<typeof walkForward>;
    const week8 = (await db.select({ id: games.id }).from(games).where(eq(games.week, 8))).map((g) => g.id);
    const scorers = await db.select().from(playerUsage).where(inArray(playerUsage.gameId, week8));
    expect(scorers.some((u) => u.touchdowns > 0)).toBe(true);
    // A stat correction: nobody scored in Week 8 after all. Play by play still says they did.
    await db.update(playerGameStats).set({ touchdowns: 0 }).where(inArray(playerGameStats.gameId, week8));
    const r = await run('backtest');
    const [row] = await db.select().from(runs).where(eq(runs.id, r.runId!));
    const after = row!.meta as unknown as ReturnType<typeof walkForward>;
    expect(after.weeks.slice(0, 4)).toEqual(before.weeks.slice(0, 4));
    expect(after.weeks[4]!.brier).not.toBe(before.weeks[4]!.brier);
  });
});
