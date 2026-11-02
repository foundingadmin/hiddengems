import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/csv';
import { JobError } from '../src/errors';
import { createHttp, redact } from '../src/http';
import { easternKickoff, normalizeEventOdds, normalizeGames, normalizeRoster, normalizeStats } from '../src/providers';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('The Odds API adapter', () => {
  const payload = {
    id: 'evt1', sport_key: 'americanfootball_nfl', commence_time: '2026-11-08T18:00:00Z', home_team: 'Buffalo Bills', away_team: 'Miami Dolphins',
    bookmakers: [
      { key: 'draftkings', title: 'DraftKings', last_update: '2026-11-08T15:00:00Z', markets: [
        { key: 'player_anytime_td', last_update: '2026-11-08T15:01:00Z', outcomes: [
          { name: 'Yes', description: 'James Cook', price: 1.8, link: 'https://sportsbook.draftkings.com/event/1?outcomes=0QA1' },
          { name: 'No', description: 'James Cook', price: 1.95 },
        ] },
        { key: 'player_receptions', outcomes: [{ name: 'Over', description: "De'Von Achane", price: 1.87, point: 4.5 }] },
      ] },
      { key: 'williamhill_us', markets: [{ key: 'player_anytime_td', outcomes: [{ name: 'Yes', description: 'James Cook', price: 1.83 }] }] },
      { key: 'bovada', markets: [{ key: 'player_anytime_td', outcomes: [{ name: 'Yes', description: 'James Cook', price: 1.9 }] }] },
    ],
  };
  it('keeps anytime TD "Yes" prices from known books, with slip links', () => {
    const q = normalizeEventOdds(payload);
    expect(q).toHaveLength(2);
    expect(q[0]).toMatchObject({ bookId: 'draftkings', marketId: 'anytime_td', playerName: 'James Cook', side: 'yes', line: null, priceDecimal: 1.8 });
    expect(q[0]!.link).toMatch(/draftkings/);
    expect(q[0]!.observedAt.toISOString()).toBe('2026-11-08T15:01:00.000Z');
    expect(q[1]).toMatchObject({ bookId: 'caesars', priceDecimal: 1.83, link: null });
  });
  it('calls a changed payload ours to fix', () => {
    try { normalizeEventOdds({ id: 1 }); throw new Error('expected a failure'); } catch (e) {
      expect(e).toBeInstanceOf(JobError);
      expect((e as JobError).owner).toBe('ours');
      expect((e as JobError).code).toBe('payload');
    }
  });
});

describe('nflverse adapter', () => {
  it('reads quoted CSV fields with commas and quotes', () => {
    expect(parseCsv('a,b,c\n1,"x, y","say ""hi"""\n')).toEqual([{ a: '1', b: 'x, y', c: 'say "hi"' }]);
  });

  it('reads the schedule with Eastern kickoffs, finals and neutral sites', () => {
    const games = normalizeGames(fixture('nflverse-games.csv'), 2026, new Date('2026-11-06T00:00:00Z'));
    const byId = Object.fromEntries(games.map((g) => [g.externalId, g]));
    expect(byId['2026_01_NE_SEA']).toMatchObject({ status: 'final', awayScore: 10, homeScore: 13, week: 1, neutralSite: false });
    expect(byId['2026_01_SF_LA']).toMatchObject({ homeTeam: 'LA', neutralSite: true });
    expect(byId['2026_09_CIN_ATL']).toMatchObject({ status: 'scheduled', awayScore: null });
    expect(byId['2026_09_CIN_ATL']!.kickoff.toISOString()).toBe('2026-11-08T14:30:00.000Z'); // 9:30 AM ET, international
    expect(easternKickoff('2026-09-13', '13:00').toISOString()).toBe('2026-09-13T17:00:00.000Z');
  });

  it('reads 2026 rosters with jersey numbers', () => {
    const chase = normalizeRoster(fixture('nflverse-roster.csv')).find((p) => p.name === "Ja'Marr Chase");
    expect(chase).toMatchObject({ externalId: '00-0036900', team: 'CIN', position: 'WR', jerseyNumber: 1, status: 'ACT' });
  });

  it('counts scoring touchdowns per week, never thrown ones', () => {
    const week1 = normalizeStats(fixture('nflverse-stats.csv'), 1);
    expect(week1.map((s) => [s.playerExternalId, s.gameExternalId, s.touchdowns])).toEqual([
      ['00-0034829', '2026_01_TB_CIN', 1], ['00-0036900', '2026_01_TB_CIN', 0],
    ]);
    expect(normalizeStats(fixture('nflverse-stats.csv'), 2)[0]).toMatchObject({ touchdowns: 2 });
  });

  it('calls a changed file ours to fix', () => {
    expect(() => normalizeRoster('gsis_id,full_name\n1,A')).toThrowError(/no longer has/);
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
