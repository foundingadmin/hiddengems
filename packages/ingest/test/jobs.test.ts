import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fairChance, gradeBox, zonedTimeToUtc } from '@hiddengems/core';
import {
  bets, createDb, jobSettings, estimates, gemRecords, games, grades, jobLocks, oddsSlots, oddsSnapshots, picks, playerGameStats, playerUsage, players, providerUsage,
  runLogs, runs, seedReference, unpackBackup,
} from '@hiddengems/db';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { BOOTSTRAP, grade, jobs, runJob } from '../src';
import { theirs } from '../src/errors';
import { githubBackup, memoryBackup, sampleProviders } from '../src/providers';
import type { Providers } from '../src/providers';

// A fixed Thursday, so the sample week (and its Sunday kickoffs) never depends on the day tests run.
const now = new Date('2026-11-05T15:00:00Z');
const handle = createDb('memory://');
const db = handle.db;
const providers = sampleProviders();
// The sample provider costs nothing, so a manual pull may skip the schedule. A paid one may not.
const paid: Providers = { ...providers, odds: { ...providers.odds, id: 'odds-api' } };
const run = (job: string, extra: Partial<Parameters<typeof runJob>[1]> = {}) =>
  runJob(job, { db, providers, trigger: 'test', now, registry: jobs, ...extra });
const pulls = async () => (await db.select({ n: count() }).from(runs).where(eq(runs.job, 'pull-odds')))[0]!.n;

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
    expect(g!.n).toBe(8);
    expect(p!.n).toBe(13);
    expect(s!.n).toBeGreaterThan(20);
  });

  it('keeps jersey numbers from the roster', async () => {
    const [p] = await db.select().from(players).where(eq(players.name, 'Mike Gesicki'));
    expect(p).toMatchObject({ jerseyNumber: 88, teamId: 'cin', position: 'TE' });
  });

  it('appraises every prop at the DraftKings price', async () => {
    const all = await db.select().from(picks);
    expect(all.length).toBeGreaterThan(5);
    for (const p of all) {
      expect(p.bookId).toBe('draftkings');
      expect(['gem', 'fools-gold', 'none', 'unrated']).toContain(p.kind);
      if (p.kind === 'gem') {
        expect(p.gapToPosted).toBeGreaterThan(0);
        expect(p.rating).toBeGreaterThanOrEqual(0);
        expect(p.rating).toBeLessThanOrEqual(100);
        expect(p.recommended).toBeCloseTo(p.hitChance * p.clarity / 100);
      } else expect(p.rating).toBeNull();
      if (p.kind === 'fools-gold') expect(p.carat).toBeGreaterThan(0);
    }
  });

  it('gives no rating to players without 2026 stats', async () => {
    // The sample's last week covers CIN, BUF, BAL, NE, SEA and ARI; MIA, NO, KC and LV players have no stat lines.
    const noStats = await db.select().from(picks).innerJoin(players, eq(players.id, picks.playerId)).where(inArray(players.teamId, ['mia', 'no', 'kc', 'lv']));
    expect(noStats.length).toBeGreaterThan(0);
    expect(noStats.every((r) => r.picks.kind === 'unrated' && r.picks.rating === null)).toBe(true);
  });

  it('logs each run with its numbers', async () => {
    const [r] = await db.select().from(runs).where(eq(runs.job, 'build-picks')).orderBy(desc(runs.startedAt)).limit(1);
    expect(r!.message).toMatch(/^Appraised \d+ props for 5 games: \d+ gems?, \d+ Fool's Gold, \d+ unrated$/);
  });
});

describe('odds pulls follow the snapshot schedule', () => {
  const satNight = zonedTimeToUtc('2026-11-07', '19:47', 'America/Denver');
  const at = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);

  it('never calls a paid provider between snapshots, even when asked', async () => {
    const before = await pulls();
    const r = await run('pull-odds', { providers: paid, force: true });
    expect(r.status).toBe('skipped');
    expect(await pulls()).toBe(before);
  });

  it('pulls a paid provider off schedule once the owner confirms the credits', async () => {
    const [before] = await db.select({ n: count() }).from(oddsSlots);
    const r = await run('pull-odds', { providers: paid, force: true, spendCredits: true });
    expect(r.status, r.message).toBe('succeeded');
    expect(r.message).toMatch(/for 5 games \(manual\)/);
    // Off schedule, so no snapshot slot is used up: Saturday's pull still runs.
    const [after] = await db.select({ n: count() }).from(oddsSlots);
    expect(after!.n).toBe(before!.n);
  });

  it('never spends credits from cron, even with the flag', async () => {
    const r = await run('pull-odds', { providers: paid, spendCredits: true });
    expect(r.status).toBe('skipped');
  });

  it('pulls once at Saturday 7:47 PM Denver, then waits', async () => {
    const r = await run('pull-odds', { providers: paid, now: at(satNight, 3) });
    expect(r.status, r.message).toBe('succeeded');
    expect(r.message).toMatch(/for 5 games \(sat\)/);
    expect((await run('pull-odds', { providers: paid, now: at(satNight, 8) })).status).toBe('skipped');
    const [slot] = await db.select().from(oddsSlots).where(eq(oddsSlots.slot, 'sat:2026-11-07'));
    expect(slot).toMatchObject({ games: 5 });
  });

  it('freezes each game just before kickoff, once', async () => {
    const kickoff = new Date('2026-11-08T18:00:00Z'); // 1:00 PM ET: MIA at BUF and CIN at BAL
    const r = await run('pull-odds', { providers: paid, now: at(kickoff, -15) });
    expect(r.message).toMatch(/for 2 games \(2 freezes\)/);
    expect((await run('pull-odds', { providers: paid, now: at(kickoff, -10) })).status).toBe('skipped');
  });

  it('refuses a pull the month has no credits for', async () => {
    await db.insert(providerUsage).values({ provider: 'odds-api', used: 499, remaining: 1, updatedAt: now });
    const sunMorning = zonedTimeToUtc('2026-11-08', '08:43', 'America/Denver');
    const r = await run('pull-odds', { providers: paid, now: at(sunMorning, 2) });
    expect(r).toMatchObject({ status: 'failed', failureOwner: 'ours' });
    expect(r.message).toMatch(/1 odds credits left this month/);
    await db.delete(providerUsage);
  });

  it('does not duplicate snapshots for an unchanged price', async () => {
    const [before] = await db.select({ n: count() }).from(oddsSnapshots);
    await run('pull-odds', { force: true });
    const [after] = await db.select({ n: count() }).from(oddsSnapshots);
    expect(after!.n).toBe(before!.n);
  });
});

describe('pausing a source', () => {
  it('skips its scheduled runs but still pulls on demand', async () => {
    await db.insert(jobSettings).values({ job: 'pull-schedule', paused: true, pausedAt: now });
    const before = (await db.select({ n: count() }).from(runs).where(eq(runs.job, 'pull-schedule')))[0]!.n;
    expect(await run('pull-schedule', { trigger: 'cron' })).toMatchObject({ status: 'skipped', message: 'Paused' });
    expect((await db.select({ n: count() }).from(runs).where(eq(runs.job, 'pull-schedule')))[0]!.n).toBe(before);
    expect((await run('pull-schedule', { trigger: 'manual', force: true })).status).toBe('succeeded');
    await db.delete(jobSettings);
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

describe('model inputs', () => {
  it('stores usage per player game and the injury report', async () => {
    const usage = await db.select().from(playerUsage);
    expect(usage.length).toBeGreaterThan(0);
    for (const u of usage) {
      expect(u.rzCarryTds + u.rzTargetTds).toBeLessThanOrEqual(u.touchdowns);
      expect(u.snapPct).toBeGreaterThan(0);
    }
    const [flowers] = await db.select().from(players).where(eq(players.name, 'Zay Flowers'));
    expect(flowers).toMatchObject({ injuryStatus: 'Questionable' });
  });

  it('reads every prop with the v3.0 model', async () => {
    const all = await db.select().from(picks);
    expect(all.every((p) => p.model === 'hg-v3.0')).toBe(true);
    const [e] = await db.select().from(estimates).where(eq(estimates.model, 'hg-v3.0')).limit(1);
    expect(e!.inputs).toHaveProperty('statsWeight');
  });

  it('rebuilds picks after a usage pull', async () => {
    const r = await run('pull-usage', { force: true });
    expect(r.status, r.message).toBe('succeeded');
    expect(r.message).toMatch(/^Pulled usage for \d+ player games across 1 week, 1 on the injury report$/);
    expect(r.followUps?.[0]).toMatchObject({ job: 'build-picks', status: 'succeeded' });
  });
});

describe('backup', () => {
  it('writes the whole database and a readable summary off-site', async () => {
    const r = await run('backup', { force: true });
    expect(r.status, r.message).toBe('succeeded');
    expect(r.message).toMatch(/^Backed up \d+ rows from \d+ tables to memory, [\d.]+ KB$/);
    const target = providers.backup as ReturnType<typeof memoryBackup>;
    const file = [...target.files.keys()].find((k) => k.startsWith('backups/'))!;
    expect(file).toMatch(/^backups\/\d{4}-\d{2}-\d{2}\.json\.gz$/);
    const backup = unpackBackup(target.files.get(file)!);
    expect(backup.tables.teams).toHaveLength(32);
    expect(new TextDecoder().decode(target.files.get('BACKUP.md')!)).toContain('| odds_snapshots |');
    // The Backups page reads what was stored from the run log.
    const [row] = await db.select().from(runs).where(eq(runs.id, r.runId!));
    expect(row!.meta).toMatchObject({ file, where: 'memory', link: null, tables: { teams: 32 } });
  });

  it('says whose move it is when the backup repository is not set up', async () => {
    const r = await run('backup', { force: true, providers: { ...providers, backup: githubBackup(undefined, undefined) } });
    expect(r).toMatchObject({ status: 'failed', failureOwner: 'ours' });
    expect(r.message).toMatch(/BACKUP_GITHUB_TOKEN/);
  });
});

describe('settlement', () => {
  it('grades anytime TD from the stat line', () => {
    expect(grade({ marketId: 'anytime_td' }, { touchdowns: 1 })).toBe('won');
    expect(grade({ marketId: 'anytime_td' }, { touchdowns: 0 })).toBe('lost');
    expect(grade({ marketId: 'first_td' }, { touchdowns: 1 })).toBeNull();
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

describe('gem records and grades', () => {
  const frozen = ['2026-11-08-mia-buf', '2026-11-08-cin-bal'];
  const kickoff = new Date('2026-11-08T18:00:00Z');
  const recordsOf = (ids: string[]) => db.select().from(gemRecords).where(inArray(gemRecords.gameId, ids));

  it('records every appraised prop once at the freeze, at the decision price', async () => {
    const records = await db.select().from(gemRecords);
    expect(new Set(records.map((r) => r.gameId))).toEqual(new Set(frozen));
    expect(records.length).toBe(new Set(records.map((r) => r.selectionKey)).size);
    const [sat] = await db.select().from(oddsSlots).where(eq(oddsSlots.slot, 'sat:2026-11-07'));
    for (const r of records) {
      const [freeze] = await db.select().from(oddsSlots).where(eq(oddsSlots.slot, `freeze:${r.gameId}`));
      expect(r.freezeAt).toEqual(freeze!.pulledAt);
      expect(['gem', 'fools-gold', 'none', 'unrated']).toContain(r.kind);
      // No Sunday morning pull was taken, so Saturday night is the decision price.
      expect(r.decisionSlot).toBe('sat:2026-11-07');
      const [snap] = await db.select().from(oddsSnapshots)
        .where(and(eq(oddsSnapshots.selectionKey, r.selectionKey), eq(oddsSnapshots.bookId, 'draftkings'), eq(oddsSnapshots.runId, sat!.runId)));
      expect(r.decisionPrice).toBe(snap!.priceDecimal);
      expect(r.decisionAt).toEqual(sat!.pulledAt);
      expect(r.decisionFair).toBeCloseTo(fairChance(r.decisionPrice), 12);
      expect(r.freezeFair).toBeCloseTo(fairChance(r.freezePrice), 12);
      const [e] = await db.select().from(estimates).where(eq(estimates.id, r.estimateId!));
      expect(e!.selectionKey).toBe(r.selectionKey);
      if (r.kind !== 'gem') expect(r).toMatchObject({ rating: null, isNew: false, newReason: null });
    }
  });

  it('records nothing twice when the board is rebuilt', async () => {
    const before = (await recordsOf(frozen)).length;
    const r = await run('build-picks', { now: new Date(kickoff.getTime() - 5 * 60_000) });
    expect(r.status, r.message).toBe('succeeded');
    expect((await recordsOf(frozen)).length).toBe(before);
  });

  it('records a later game at its own freeze', async () => {
    const r = await run('pull-odds', { providers: paid, now: new Date('2026-11-08T20:50:00Z') }); // ARI at NO, 4:05 PM ET
    expect(r.message).toMatch(/for 1 game \(1 freeze\)/);
    expect(r.followUps?.[0]?.message).toMatch(/, recorded \d+ props? at the freeze$/);
    expect((await recordsOf(['2026-11-08-ari-no'])).length).toBeGreaterThan(0);
  });

  it('grades nothing while the game is not final', async () => {
    const live = new Date('2026-11-08T19:30:00Z');
    await run('pull-schedule', { now: live, force: true });
    await run('pull-results', { now: live, force: true });
    expect(await db.select().from(grades).where(inArray(grades.gameId, frozen))).toHaveLength(0);
  });

  it('grades every record and placed bet once the game is final, each in one box', async () => {
    const [pick] = (await recordsOf(['2026-11-08-mia-buf'])).filter((r) => r.playerId);
    await db.insert(bets).values({
      placedAt: pick!.decisionAt, selectionKey: pick!.selectionKey, gameId: pick!.gameId, marketId: 'anytime_td', playerId: pick!.playerId, side: 'yes',
      line: null, bookId: 'draftkings', priceDecimal: pick!.decisionPrice, stake: '10.00',
    });
    const after = new Date('2026-11-08T23:30:00Z');
    await run('pull-schedule', { now: after, force: true });
    const r = await run('pull-results', { now: after, force: true });
    expect(r.message).toMatch(/graded \d+ gem records? and 1 bet$/);

    const records = (await recordsOf(frozen)).filter((x) => x.playerId);
    const all = await db.select().from(grades);
    const gems = all.filter((g) => g.subject === 'gem');
    expect(gems.length).toBeGreaterThan(0);
    expect(gems).toHaveLength(records.length);
    for (const g of gems) {
      const rec = records.find((x) => x.id === g.gemRecordId)!;
      const [stat] = await db.select().from(playerGameStats).where(and(eq(playerGameStats.gameId, rec.gameId), eq(playerGameStats.playerId, rec.playerId!)));
      expect(g).toMatchObject({ taken: rec.decisionPrice, closePrice: rec.freezePrice, touchdowns: stat!.touchdowns, hit: stat!.touchdowns > 0 });
      expect(g.clv).toBeCloseTo(rec.decisionPrice * rec.freezeFair - 1, 12);
      expect(g.beatClose).toBe(g.clv > 0);
      expect(g.box).toBe(gradeBox(g.beatClose, g.hit));
    }
    // ARI at NO is still being played.
    expect(all.some((g) => g.gameId === '2026-11-08-ari-no')).toBe(false);

    const [bet] = await db.select().from(bets).where(eq(bets.selectionKey, pick!.selectionKey));
    const [betGrade] = all.filter((g) => g.betId === bet!.id);
    expect(betGrade).toMatchObject({ subject: 'bet', taken: bet!.priceDecimal, closePrice: bet!.closingPrice });
    expect(bet!.status).toBe(betGrade!.hit ? 'won' : 'lost');
  });

  it('grades each once', async () => {
    const [before] = await db.select({ n: count() }).from(grades);
    await run('pull-results', { now: new Date('2026-11-09T00:30:00Z'), force: true });
    const [after] = await db.select({ n: count() }).from(grades);
    expect(after!.n).toBe(before!.n);
  });
});

describe('before the owner runs the gem grading migration', () => {
  it('appraises, pulls results and backs up without the new tables', async () => {
    const h = createDb('memory://');
    await h.migrate();
    await seedReference(h.db);
    await h.db.execute(sql`drop table grades`);
    await h.db.execute(sql`drop table gem_records`);
    const go = (job: string, at: Date) => runJob(job, { db: h.db, providers: sampleProviders(), trigger: 'test', now: at, registry: jobs, force: true });
    for (const job of BOOTSTRAP) expect((await go(job, now)).status).not.toBe('failed');
    const freeze = await go('pull-odds', new Date('2026-11-08T17:45:00Z'));
    expect(freeze.followUps?.[0]).toMatchObject({ job: 'build-picks', status: 'succeeded' });
    const after = new Date('2026-11-08T23:30:00Z');
    await go('pull-schedule', after);
    expect((await go('pull-results', after)).status).not.toBe('failed');
    expect((await go('backup', after)).status).toBe('succeeded');
    await h.close();
  });
});
