import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb, providerCaps, providerUsage, runs, seedReference } from '@hiddengems/db';
import { eq, sql } from 'drizzle-orm';
import { askJeweler, buildJewelerPrompt, describeSlip, jewelerGate, jewelerStatus, type JewelerContext, type JewelerGem, type JewelerSlip } from '../src';

vi.setConfig({ testTimeout: 30_000 });

const now = new Date('2026-11-05T15:00:00Z');
const handle = createDb('memory://');
const db = handle.db;
const KEY = { ANTHROPIC_API_KEY: 'sk-test' };

const cook: JewelerGem = {
  id: '2026-11-08-mia-buf|anytime_td|cook|yes|', player: 'James Cook', number: 4, position: 'RB', team: 'Buffalo Bills',
  matchup: 'MIA @ BUF', kickoff: 'Sun 1:00 PM', kind: 'gem', rating: 92, price: 2.6, priced: 0.3846, hitChance: 0.49,
  edge: 10.54, carat: 13.04, clarity: 92, reasons: ['Priced like a 38% shot, we read 49%'],
};
const shakir: JewelerGem = { ...cook, id: 'shakir', player: 'Khalil Shakir', number: 10, position: 'WR', price: 3.4, priced: 0.29, hitChance: 0.42, edge: 12.6, clarity: 88, rating: 88, reasons: [] };
const context: JewelerContext = { week: 10, gem: cook, board: [cook, shakir], slip: null };
const question = [{ role: 'user' as const, text: 'Why is Cook a gem?' }];

/** A stand-in for the Messages API that records what it was sent. */
function fakeApi(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const body = status === 200
      ? { content: [{ type: 'text', text: 'Cook clears the price by 11 points with clarity 92.' }], usage: { input_tokens: 1800, output_tokens: 120 } }
      : { type: 'error' };
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}
const asks = async () => (await db.select().from(runs).where(eq(runs.job, 'ask-jeweler')));

beforeAll(async () => {
  await handle.migrate();
  await seedReference(db);
});
beforeEach(async () => {
  await db.delete(providerCaps);
  await db.delete(providerUsage);
  await db.execute(sql`delete from runs where job = 'ask-jeweler'`);
});
afterAll(() => handle.close());

describe('the guard', () => {
  it('needs both the key and a cap above zero, with room left', () => {
    expect(jewelerGate({ hasKey: false, capCents: 1000, usedCents: 0 })).toMatchObject({ ready: false, missing: ['key'] });
    expect(jewelerGate({ hasKey: true, capCents: null, usedCents: 0 })).toMatchObject({ ready: false, missing: ['cap'] });
    expect(jewelerGate({ hasKey: true, capCents: 0, usedCents: 0 })).toMatchObject({ ready: false, missing: ['cap'] });
    expect(jewelerGate({ hasKey: false, capCents: null, usedCents: 0 }).missing).toEqual(['key', 'cap']);
    expect(jewelerGate({ hasKey: true, capCents: 1000, usedCents: 998, nextCents: 3 })).toMatchObject({ ready: false, missing: [], capReached: true });
    expect(jewelerGate({ hasKey: true, capCents: 1000, usedCents: 10 })).toMatchObject({ ready: true, missing: [], capReached: false });
  });

  it('makes no call without a key', async () => {
    await db.insert(providerCaps).values({ provider: 'anthropic', monthlyCents: 1000 });
    const api = fakeApi();
    const r = await askJeweler({ db, context, turns: question, env: {}, now, fetch: api.fetch });
    expect(r).toMatchObject({ ok: false, reason: 'not-set-up' });
    expect(api.calls).toHaveLength(0);
    expect(await asks()).toHaveLength(0);
  });

  it('makes no call without a cap', async () => {
    const api = fakeApi();
    const r = await askJeweler({ db, context, turns: question, env: KEY, now, fetch: api.fetch });
    expect(r).toMatchObject({ ok: false, reason: 'not-set-up', status: { missing: ['cap'] } });
    expect(api.calls).toHaveLength(0);
    expect(await asks()).toHaveLength(0);
  });

  it('makes no call once the month is spent', async () => {
    await db.insert(providerCaps).values({ provider: 'anthropic', monthlyCents: 100 });
    await db.insert(providerUsage).values({ provider: 'anthropic', used: 99, remaining: 1, updatedAt: now });
    const api = fakeApi();
    const r = await askJeweler({ db, context, turns: question, env: KEY, now, fetch: api.fetch });
    expect(r).toMatchObject({ ok: false, reason: 'cap-reached' });
    expect(api.calls).toHaveLength(0);
  });

  it('starts each month at zero', async () => {
    await db.insert(providerCaps).values({ provider: 'anthropic', monthlyCents: 100 });
    await db.insert(providerUsage).values({ provider: 'anthropic', used: 100, remaining: 0, updatedAt: new Date('2026-10-31T12:00:00Z') });
    expect(await jewelerStatus(db, KEY, now)).toMatchObject({ ready: true, usedCents: 0 });
  });
});

describe('an ask', () => {
  it('calls the Messages API once, through the pull log, and counts the spend', async () => {
    await db.insert(providerCaps).values({ provider: 'anthropic', monthlyCents: 1000 });
    const api = fakeApi();
    const r = await askJeweler({ db, context, turns: question, env: KEY, now, fetch: api.fetch });
    expect(r).toEqual({ ok: true, text: 'Cook clears the price by 11 points with clarity 92.' });
    expect(api.calls).toHaveLength(1);
    const { url, init } = api.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'x-api-key': 'sk-test', 'anthropic-version': '2023-06-01' });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: 'claude-sonnet-5-5', messages: [{ role: 'user', content: 'Why is Cook a gem?' }] });
    expect(body.system).toContain('James Cook #4');
    const [run] = await asks();
    expect(run).toMatchObject({ status: 'succeeded', provider: 'anthropic', trigger: 'manual', requestCount: 1 });
    // 1,800 input tokens at $3 and 120 output at $15 per million: 0.72 cents, rounded up.
    const [usage] = await db.select().from(providerUsage).where(eq(providerUsage.provider, 'anthropic'));
    expect(usage).toMatchObject({ used: 1, remaining: 999 });
  });

  it('records a rejected key as ours to fix', async () => {
    await db.insert(providerCaps).values({ provider: 'anthropic', monthlyCents: 1000 });
    const r = await askJeweler({ db, context, turns: question, env: KEY, now, fetch: fakeApi(401).fetch });
    expect(r).toMatchObject({ ok: false, reason: 'failed', owner: 'ours' });
    const [run] = await asks();
    expect(run).toMatchObject({ status: 'failed', failureOwner: 'ours' });
  });

  it('reads as not set up before the provider_caps migration runs', async () => {
    const old = createDb('memory://');
    await old.migrate();
    await old.db.execute(sql`drop table provider_caps`);
    expect(await jewelerStatus(old.db, KEY, now)).toMatchObject({ ready: false, missing: ['cap'] });
    await old.close();
  });
});

describe('the prompt', () => {
  it("carries the gem's numbers as the app prints them", () => {
    const p = buildJewelerPrompt(context);
    expect(p).toContain('James Cook #4, RB, Buffalo Bills. MIA @ BUF, kickoff Sun 1:00 PM.');
    expect(p).toContain('DraftKings 2.60');
    expect(p).toContain('Priced 38%, our estimate 49%, edge +11 pts, gap to fair +13 pts, clarity 92, gem rating 92.');
    expect(p).toContain('The sheet shows it as Gap to fair.');
    expect(p).not.toContain('not shown and runs larger');
    expect(p).toContain('Priced like a 38% shot, we read 49%');
    expect(p).toContain('Khalil Shakir #10');
  });

  it('forbids placing bets or handling money', () => {
    const p = buildJewelerPrompt({ ...context, gem: null });
    expect(p).toMatch(/never place, change or send a bet/);
    expect(p).toMatch(/never places bets or handles money/);
  });

  it("names Fool's Gold and a negative edge plainly", () => {
    const p = buildJewelerPrompt({ week: 10, gem: { ...cook, kind: 'fools-gold', rating: null, edge: -2, carat: 1.26 }, board: [], slip: null });
    expect(p).toContain("edge −2 pts, gap to fair +1.3 pts, clarity 92, Fool's Gold");
  });

  const slip: JewelerSlip = {
    name: 'Slip 1', play: 'own', stake: 15, pays: 99.45, loseItAll: 0.77, correlated: false, appraisal: null,
    legs: [
      { player: 'James Cook', number: 4, matchup: 'MIA @ BUF', kickoff: 'Sun 1:00 PM', price: 2.6, hitChance: 0.49, rating: 92 },
      { player: 'Deebo Samuel', number: 1, matchup: 'NYG @ WAS', kickoff: 'Sun 4:25 PM', price: 2.55, hitChance: 0.47, rating: 76 },
    ],
  };

  it('carries the slip in progress as its certificate reads', () => {
    const p = buildJewelerPrompt({ ...context, slip });
    expect(p).toContain("The user's slip in progress:\nSlip 1, their own play, a 2 leg parlay:");
    expect(p).toContain('- James Cook #4. MIA @ BUF, kickoff Sun 1:00 PM. DraftKings 2.60, our estimate 49%, gem rating 92.');
    expect(p).toContain('Stake $15.00, pays $99.45 if every leg hits.');
    expect(p).toContain('Lose it all (the chance at least one leg misses): 77%.');
  });

  it('gives no lose it all chance for same game legs, and leaves an empty slip out', () => {
    expect(describeSlip({ ...slip, correlated: true, loseItAll: null, stake: null, pays: null }))
      .toMatch(/No stake set yet\.\nLose it all: not shown, because legs share a game/);
    expect(buildJewelerPrompt({ ...context, slip: { ...slip, legs: [] } })).not.toContain('slip in progress');
    expect(buildJewelerPrompt(context)).not.toContain('slip in progress');
  });
});
