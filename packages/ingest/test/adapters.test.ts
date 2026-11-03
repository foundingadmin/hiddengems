import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/csv';
import { JobError } from '../src/errors';
import { createHttp, redact } from '../src/http';
import { buildUsage, easternKickoff, normalizeEventOdds, normalizeForecast, normalizeGames, normalizeInjuries, normalizeRoster, normalizeStats, openMeteo } from '../src/providers';

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

describe('Open-Meteo adapter', () => {
  // A real response for Highmark Stadium (Orchard Park, NY), Sunday 1:00 PM ET, in US units.
  const payload = JSON.parse(fixture('open-meteo-forecast.json')) as unknown;
  const kickoff = new Date('2026-11-08T18:00:00Z');

  it('keeps the forecast hour nearest kickoff', () => {
    expect(normalizeForecast(payload, kickoff)).toEqual({
      at: kickoff, temperatureF: 47.9, windMph: 14.8, gustMph: 24.2, precipChance: 6, precipIn: 0, snowIn: 0, weatherCode: 2,
    });
    expect(normalizeForecast(payload, new Date('2026-11-08T18:40:00Z'))!.at.toISOString()).toBe('2026-11-08T19:00:00.000Z');
  });

  it('has no kickoff forecast when no hour is within 90 minutes', () => {
    expect(normalizeForecast(payload, new Date('2026-11-08T21:00:00Z'))).toBeNull();
  });

  it('reads missing readings as null', () => {
    const p = payload as { hourly: Record<string, unknown[]> };
    const gaps = { ...p, hourly: { ...p.hourly, wind_gusts_10m: [null, null], precipitation_probability: [null, 17] } };
    expect(normalizeForecast(gaps, kickoff)).toMatchObject({ gustMph: null, precipChance: null, windMph: 14.8 });
  });

  it('calls a changed payload ours to fix', () => {
    try { normalizeForecast({ hourly: { time: ['2026-11-08T18:00'] } }, kickoff); throw new Error('expected a failure'); } catch (e) {
      expect(e).toBeInstanceOf(JobError);
      expect((e as JobError).owner).toBe('ours');
      expect((e as JobError).code).toBe('payload');
    }
  });

  it('asks for the two hours around kickoff in US units, with no key', async () => {
    const urls: string[] = [];
    const http = createHttp({ provider: 'open-meteo', fetch: (async (url: string) => { urls.push(url); return new Response(JSON.stringify(payload)); }) as typeof fetch });
    const f = await openMeteo().forecast({ now: kickoff, http, log: () => {} }, { lat: 42.7738, lon: -78.787 }, new Date('2026-11-08T18:25:00Z'));
    expect(f!.at).toEqual(kickoff);
    const q = new URL(urls[0]!).searchParams;
    expect(q.get('start_hour')).toBe('2026-11-08T18:00');
    expect(q.get('end_hour')).toBe('2026-11-08T19:00');
    expect(q.get('temperature_unit')).toBe('fahrenheit');
    expect(q.get('wind_speed_unit')).toBe('mph');
    expect(q.get('latitude')).toBe('42.7738');
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
  it('never retries a POST, so one ask is billed once', async () => {
    const http = createHttp({ provider: 'p', fetch: respond(503, 200) });
    await expect(http.postJson('https://x.test', { q: 1 })).rejects.toMatchObject({ owner: 'provider', code: 'server' });
    expect(http.requestCount).toBe(1);
    let calls = 0;
    const down = (async () => { calls++; throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    await expect(createHttp({ provider: 'p', fetch: down }).postJson('https://x.test', { q: 1 })).rejects.toMatchObject({ code: 'network' });
    expect(calls).toBe(1);
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
  it('masks every secret-named query param, in any case, and nothing else', () => {
    const names = ['api_key', 'apikey', 'key', 'token', 'access_token', 'secret', 'sig', 'signature'];
    for (const name of names) {
      for (const n of [name, name.toUpperCase()]) {
        expect(redact(`https://a.test/x?${n}=s3cr3t&b=1`)).toBe(`https://a.test/x?${n}=***&b=1`);
        expect(redact(`https://a.test/x?a=1&${n}=s3cr3t`)).toBe(`https://a.test/x?a=1&${n}=***`);
      }
    }
    expect(redact('https://a.test/x?Api_Key=a&Access_Token=b#frag')).toBe('https://a.test/x?Api_Key=***&Access_Token=***#frag');
    expect(redact('https://a.test/x?monkey=1&keys=2&tokens=3&season=2026')).toBe('https://a.test/x?monkey=1&keys=2&tokens=3&season=2026');
  });
});

describe('nflverse usage (hgs.py game_logs)', () => {
  const roster = [
    'gsis_id,pfr_id,full_name,team,position',
    '00-1,CookJa01,James Cook,BUF,RB',
    '00-2,,Dalton Kincaid,BUF,TE', // no pfr id: matched by name and team
    '00-3,AllenJo02,Josh Allen,BUF,QB',
    '00-4,AchaDe00,De\'Von Achane,MIA,RB',
  ].join('\n');
  const snaps = [
    'game_id,week,player,pfr_player_id,position,team,offense_snaps,offense_pct',
    '2026_09_MIA_BUF,9,James Cook,CookJa01,RB,BUF,50,0.75',
    '2026_09_MIA_BUF,9,Dalton Kincaid,KincDa00,TE,BUF,40,0.6',
    '2026_09_MIA_BUF,9,Josh Allen,AllenJo02,QB,BUF,66,1',
    '2026_09_MIA_BUF,9,Spencer Brown,BrowSp00,T,BUF,66,1', // not a skill position
  ].join('\n');
  const pbp = [
    'game_id,week,posteam,yardline_100,play_type,rusher_player_id,passer_player_id,receiver_player_id,td_player_id,touchdown,desc',
    '2026_09_MIA_BUF,9,BUF,8,run,00-1,,,,0,"Cook, up the middle"',
    '2026_09_MIA_BUF,9,BUF,3,run,00-1,,,00-1,1,"Cook, 3 yard TD"',
    '2026_09_MIA_BUF,9,BUF,9,pass,,00-3,00-2,,0,"incomplete"',
    '2026_09_MIA_BUF,9,BUF,45,pass,,00-3,00-2,00-2,1,"long TD"',
    '2026_09_MIA_BUF,9,BUF,12,no_play,00-1,,,,0,"penalty"',
    // A game with no snap counts yet: anyone who ran, caught or threw counts, with no snap share.
    '2026_10_BUF_MIA,10,MIA,5,run,00-4,,,00-4,1,"Achane TD"',
    '2026_10_BUF_MIA,10,,,,,,,,,"End of quarter"',
  ].join('\n');

  it('counts inside 10 carries, targets and touchdowns per player game', () => {
    const { lines, unmatchedSnaps } = buildUsage(pbp, snaps, roster);
    expect(unmatchedSnaps).toEqual([]);
    const by = (id: string, game: string) => lines.find((l) => l.playerExternalId === id && l.gameExternalId === game);
    expect(by('00-1', '2026_09_MIA_BUF')).toMatchObject({ team: 'BUF', position: 'RB', snapPct: 0.75, rzCarries: 2, rzCarryTds: 1, touchdowns: 1 });
    expect(by('00-2', '2026_09_MIA_BUF')).toMatchObject({ snapPct: 0.6, rzTargets: 1, rzTargetTds: 0, touchdowns: 1 });
    expect(by('00-3', '2026_09_MIA_BUF')).toMatchObject({ position: 'QB', touchdowns: 0 });
    expect(by('00-4', '2026_10_BUF_MIA')).toMatchObject({ team: 'MIA', snapPct: null, rzCarries: 1, rzCarryTds: 1, touchdowns: 1 });
    expect(lines).toHaveLength(4);
  });

  it('calls a play by play file without its columns ours to fix', () => {
    expect(() => buildUsage('game_id,week\n1,2', snaps, roster)).toThrow(JobError);
  });

  it('reads the latest injury report week only', () => {
    const r = normalizeInjuries(['week,gsis_id,report_status', '8,00-1,Out', '9,00-1,Questionable', '9,00-2,NA', '9,00-3,'].join('\n'));
    expect(r).toEqual({ week: 9, statuses: [{ playerExternalId: '00-1', status: 'Questionable' }] });
  });

  it('keeps one row per player from the roster', () => {
    const text = fixture('nflverse-roster.csv');
    const lines = text.trim().split('\n');
    const doubled = [...lines, lines[1]!].join('\n');
    expect(normalizeRoster(doubled)).toHaveLength(normalizeRoster(text).length);
  });
});
