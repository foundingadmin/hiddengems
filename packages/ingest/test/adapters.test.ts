import { describe, expect, it } from 'vitest';
import { createHttp, redact } from '../src/http';
import { JobError } from '../src/errors';
import { easternToUtc, normalizeEventOdds, normalizeSchedule, normalizeStats } from '../src/providers';

describe('The Odds API adapter', () => {
  const payload = {
    id: 'evt1', sport_key: 'americanfootball_nfl', commence_time: '2026-11-08T18:00:00Z', home_team: 'Buffalo Bills', away_team: 'Miami Dolphins',
    bookmakers: [
      { key: 'draftkings', title: 'DraftKings', last_update: '2026-11-08T15:00:00Z', markets: [
        { key: 'player_anytime_td', last_update: '2026-11-08T15:01:00Z', outcomes: [
          { name: 'Yes', description: 'James Cook', price: 1.8 },
          { name: 'No', description: 'James Cook', price: 1.95 },
        ] },
        { key: 'player_receptions', outcomes: [
          { name: 'Over', description: "De'Von Achane", price: 1.87, point: 4.5 },
          { name: 'Under', description: "De'Von Achane", price: 1.93, point: 4.5 },
        ] },
        { key: 'player_unknown_market', outcomes: [{ name: 'Yes', description: 'X', price: 2 }] },
      ] },
      { key: 'williamhill_us', markets: [{ key: 'player_anytime_td', outcomes: [{ name: 'Yes', description: 'James Cook', price: 1.83 }] }] },
      { key: 'bovada', markets: [{ key: 'player_anytime_td', outcomes: [{ name: 'Yes', description: 'James Cook', price: 1.9 }] }] },
    ],
  };
  it('normalizes player props from known books and markets', () => {
    const q = normalizeEventOdds(payload);
    expect(q).toHaveLength(4);
    expect(q[0]).toMatchObject({ bookId: 'draftkings', marketId: 'anytime_td', playerName: 'James Cook', side: 'yes', line: null, priceDecimal: 1.8 });
    expect(q[0]!.observedAt.toISOString()).toBe('2026-11-08T15:01:00.000Z');
    expect(q[1]).toMatchObject({ marketId: 'receptions', side: 'over', line: 4.5 });
    expect(q[3]).toMatchObject({ bookId: 'caesars', priceDecimal: 1.83 });
  });
  it('calls a changed payload ours to fix', () => {
    expect(() => normalizeEventOdds({ id: 1 })).toThrowError(JobError);
    try { normalizeEventOdds({ id: 1 }); } catch (e) { expect((e as JobError).owner).toBe('ours'); expect((e as JobError).code).toBe('payload'); }
  });
});

describe('SportsDataIO adapter', () => {
  it('converts Eastern wall time across daylight saving', () => {
    expect(easternToUtc('2026-11-08T13:00:00').toISOString()).toBe('2026-11-08T18:00:00.000Z');
    expect(easternToUtc('2026-09-13T13:00:00').toISOString()).toBe('2026-09-13T17:00:00.000Z');
  });
  it('normalizes the schedule and drops byes', () => {
    const games = normalizeSchedule([
      { GameKey: '202621001', Season: 2026, SeasonType: 1, Week: 10, DateTime: '2026-11-08T13:00:00', AwayTeam: 'MIA', HomeTeam: 'BUF', Status: 'Scheduled', AwayScore: null, HomeScore: null },
      { GameKey: '202621002', Season: 2026, SeasonType: 1, Week: 10, DateTimeUTC: '2026-11-09T01:20:00', AwayTeam: 'KC', HomeTeam: 'LV', Status: 'F/OT', AwayScore: 27, HomeScore: 24 },
      { GameKey: '202621099', Season: 2026, SeasonType: 1, Week: 10, DateTime: null, AwayTeam: 'BYE', HomeTeam: 'NYJ' },
    ]);
    expect(games).toHaveLength(2);
    expect(games[0]!.kickoff.toISOString()).toBe('2026-11-08T18:00:00.000Z');
    expect(games[1]).toMatchObject({ status: 'final', awayScore: 27 });
  });
  it('counts scoring touchdowns, never thrown ones', () => {
    const [s] = normalizeStats([{ PlayerID: 1, GameKey: 'g', ReceivingTouchdowns: 1, RushingTouchdowns: 1, PassingTouchdowns: 3, Receptions: 5 }]);
    expect(s).toMatchObject({ touchdowns: 2, passingTds: 3, receptions: 5 });
  });
});

describe('http', () => {
  const respond = (...statuses: number[]) => {
    let i = 0;
    return (async () => new Response(JSON.stringify({ ok: true }), { status: statuses[Math.min(i++, statuses.length - 1)] })) as unknown as typeof fetch;
  };
  const fail = async (statuses: number[]) => {
    try { await createHttp({ provider: 'p', fetch: respond(...statuses) }).getJson('https://x.test/?apiKey=secret'); }
    catch (e) { return e as JobError; }
    throw new Error('expected a failure');
  };
  it('retries one server error', async () => {
    const http = createHttp({ provider: 'p', fetch: respond(503, 200) });
    await expect(http.getJson('https://x.test')).resolves.toEqual({ ok: true });
    expect(http.requestCount).toBe(2);
  });
  it('says whose move each failure is', async () => {
    expect(await fail([401])).toMatchObject({ owner: 'ours', code: 'auth' });
    expect(await fail([429])).toMatchObject({ owner: 'ours', code: 'quota' });
    expect(await fail([500, 502])).toMatchObject({ owner: 'provider', code: 'server' });
    expect(await fail([422])).toMatchObject({ owner: 'ours', code: 'request' });
  });
  it('keeps keys out of logs', async () => {
    expect((await fail([401])).detail.url).toBe('https://x.test/?apiKey=***');
    expect(redact('https://a.test/x?key=abc&b=1')).toBe('https://a.test/x?key=***&b=1');
  });
});
