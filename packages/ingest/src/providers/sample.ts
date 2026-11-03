// The sample provider: a deterministic week of games, players, prices and results built around the
// current date, so every job runs end to end with no API keys (local dev, CI, previews).
// Prices drift in 15-minute steps, so repeated pulls build real-looking line history.
import { type BookId, seasonOf } from '@hiddengems/core';
import { memoryBackup } from './backup';
import { easternKickoff } from './nflverse';
import type { InjuryReport, OddsEvent, OddsQuote, Providers, RosterPlayer, ScheduleGame, StatLine, UsageLine } from './types';

const DAY = 86_400_000;

/** FNV-1a, mapped to [0, 1): stable noise from any string. */
export function noise(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 2 ** 32;
}

export const SAMPLE_PLAYERS = [
  { id: 'gesicki', name: 'Mike Gesicki', position: 'TE', team: 'CIN', number: 88, td: 0.27, rec: 3.5 },
  { id: 'chase', name: "Ja'Marr Chase", position: 'WR', team: 'CIN', number: 1, td: 0.44, rec: 6.5 },
  { id: 'flowers', name: 'Zay Flowers', position: 'WR', team: 'BAL', number: 4, td: 0.3, rec: 5.5 },
  { id: 'henry', name: 'Derrick Henry', position: 'RB', team: 'BAL', number: 22, td: 0.56, rec: null },
  { id: 'cook', name: 'James Cook', position: 'RB', team: 'BUF', number: 4, td: 0.52, rec: null },
  { id: 'gordon', name: 'Ollie Gordon II', position: 'RB', team: 'MIA', number: 31, td: 0.24, rec: null },
  { id: 'achane', name: "De'Von Achane", position: 'RB', team: 'MIA', number: 28, td: 0.45, rec: 4.5 },
  { id: 'diggs', name: 'Stefon Diggs', position: 'WR', team: 'NE', number: 8, td: 0.29, rec: 4.5 },
  { id: 'jsn', name: 'Jaxon Smith-Njigba', position: 'WR', team: 'SEA', number: 11, td: 0.38, rec: 6.5 },
  { id: 'mcbride', name: 'Trey McBride', position: 'TE', team: 'ARI', number: 85, td: 0.31, rec: 5.5 },
  { id: 'olave', name: 'Chris Olave', position: 'WR', team: 'NO', number: 12, td: 0.3, rec: 4.5 },
  { id: 'kelce', name: 'Travis Kelce', position: 'TE', team: 'KC', number: 87, td: 0.33, rec: 4.5 },
  { id: 'bowers', name: 'Brock Bowers', position: 'TE', team: 'LV', number: 89, td: 0.34, rec: 5.5 },
] as const;

// Away, home, Eastern kickoff time. Last week's games are final, with scores.
const THIS_WEEK = [['MIA', 'BUF', '13:00'], ['CIN', 'BAL', '13:00'], ['ARI', 'NO', '16:05'], ['NE', 'SEA', '16:25'], ['KC', 'LV', '20:20']] as const;
const LAST_WEEK = [['BUF', 'CIN', '13:00', 24, 27], ['SEA', 'ARI', '16:05', 20, 17], ['BAL', 'NE', '20:20', 31, 21]] as const;

const BOOK_MARGINS: Partial<Record<BookId, number>> = { draftkings: 0.08, fanduel: 0.07, betmgm: 0.09, caesars: 0.1 };

/** The coming Sunday (today, if it is Sunday), as an Eastern calendar date. */
function sundays(now: Date): { thisWeek: string; lastWeek: string; week: number; season: number } {
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const ahead = (7 - eastern.getDay()) % 7;
  const sunday = new Date(Date.UTC(eastern.getFullYear(), eastern.getMonth(), eastern.getDate() + ahead));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const season = seasonOf(now);
  const opener = Date.UTC(season, 8, 7);
  const week = Math.min(18, Math.max(1, Math.floor((sunday.getTime() - opener) / (7 * DAY)) + 1));
  return { thisWeek: iso(sunday), lastWeek: iso(new Date(sunday.getTime() - 7 * DAY)), week, season };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** history: pull-results also writes graded history for final games (the app's sample mode); tests leave it off. */
export function sampleProviders({ history = false }: { history?: boolean } = {}): Providers {
  const scheduleFor = (now: Date): ScheduleGame[] => {
    const { thisWeek, lastWeek, week, season } = sundays(now);
    const game = (date: string, away: string, home: string, time: string, wk: number, final: boolean, a: number | null, h: number | null): ScheduleGame => {
      const kickoff = easternKickoff(date, time);
      const live = !final && now.getTime() >= kickoff.getTime();
      return {
        externalId: `sample-${date}-${away}-${home}`, season, seasonType: 'reg', week: wk, kickoff, awayTeam: away, homeTeam: home, neutralSite: false,
        status: final ? 'final' : live ? (now.getTime() - kickoff.getTime() > 4 * 3_600_000 ? 'final' : 'in_progress') : 'scheduled',
        awayScore: a, homeScore: h,
        spreadLine: Math.round((noise(`${away}${home}:spread`) * 14 - 7) * 2) / 2, totalLine: 40 + Math.round(noise(`${away}${home}:total`) * 14),
      };
    };
    return [
      ...LAST_WEEK.map(([away, home, time, a, h]) => game(lastWeek, away, home, time, Math.max(1, week - 1), true, a, h)),
      ...THIS_WEEK.map(([away, home, time]) => game(thisWeek, away, home, time, week, false, null, null)),
    ];
  };

  return {
    schedule: { id: 'sample', async schedule(ctx) { return scheduleFor(ctx.now); } },
    rosters: {
      id: 'sample',
      async players(): Promise<RosterPlayer[]> {
        return SAMPLE_PLAYERS.map((p) => ({ externalId: p.id, name: p.name, position: p.position, team: p.team, jerseyNumber: p.number, status: 'Active' }));
      },
    },
    odds: {
      id: 'sample',
      async events(ctx): Promise<OddsEvent[]> {
        return scheduleFor(ctx.now).filter((g) => g.status === 'scheduled')
          .map((g) => ({ externalId: g.externalId, kickoff: g.kickoff, awayTeam: g.awayTeam, homeTeam: g.homeTeam }));
      },
      async eventOdds(ctx, event, markets): Promise<OddsQuote[]> {
        const bucketMs = 15 * 60_000;
        const bucket = Math.floor(ctx.now.getTime() / bucketMs);
        const observedAt = new Date(bucket * bucketMs);
        const quotes: OddsQuote[] = [];
        const players = SAMPLE_PLAYERS.filter((p) => p.team === event.awayTeam || p.team === event.homeTeam);
        for (const p of players) {
          for (const [bookId, margin] of Object.entries(BOOK_MARGINS) as [BookId, number][]) {
            if (noise(`${bookId}:${p.id}:listed`) < 0.12) continue; // not every book lists every player
            const drift = (noise(`${bookId}:${p.id}:${bucket}`) - 0.5) * 0.16;
            // Now and then one book hangs a stale price: these are the gems.
            const stale = noise(`${bookId}:${p.id}:stale:${Math.floor(bucket / 8)}`) < 0.1 ? -0.3 : 0;
            if (markets.includes('anytime_td')) {
              const price = round2(1 / Math.min(0.95, p.td * (1 + margin) * (1 + drift + stale)));
              quotes.push({ bookId, marketId: 'anytime_td', playerName: p.name, side: 'yes', line: null, priceDecimal: price, observedAt, link: null });
            }
          }
        }
        return quotes;
      },
    },
    backup: memoryBackup(),
    usage: {
      id: 'sample',
      async gameUsage(ctx): Promise<UsageLine[]> {
        const finals = scheduleFor(ctx.now).filter((g) => g.status === 'final');
        return finals.flatMap((g) => SAMPLE_PLAYERS.filter((p) => p.team === g.awayTeam || p.team === g.homeTeam).map((p) => {
          const r = noise(`${g.externalId}:${p.id}`);
          const touchdowns = r < p.td ? (r < p.td / 4 ? 2 : 1) : 0;
          const rzCarries = p.position === 'RB' ? Math.round(p.td * 4 * noise(`${g.externalId}:${p.id}:rzc`)) : 0;
          const rzTargets = Math.round(p.td * 3 * noise(`${g.externalId}:${p.id}:rzt`));
          const inside = Math.min(touchdowns, rzCarries + rzTargets);
          return {
            playerExternalId: p.id, gameExternalId: g.externalId, week: g.week ?? 1, team: p.team, position: p.position,
            snapPct: Math.round((0.55 + noise(`${g.externalId}:${p.id}:snap`) * 0.4) * 100) / 100,
            rzCarries, rzTargets, rzCarryTds: Math.min(inside, rzCarries), rzTargetTds: inside - Math.min(inside, rzCarries), touchdowns,
          };
        }));
      },
      async injuries(ctx): Promise<InjuryReport> {
        return { week: sundays(ctx.now).week, statuses: [{ playerExternalId: 'flowers', status: 'Questionable' }] };
      },
    },
    results: {
      id: 'sample',
      sampleHistory: history,
      async stats(ctx): Promise<StatLine[]> {
        const finals = scheduleFor(ctx.now).filter((g) => g.status === 'final');
        return finals.flatMap((g) => SAMPLE_PLAYERS.filter((p) => p.team === g.awayTeam || p.team === g.homeTeam).map((p) => {
          const r = noise(`${g.externalId}:${p.id}`);
          return {
            playerExternalId: p.id, gameExternalId: g.externalId,
            touchdowns: r < p.td ? (r < p.td / 4 ? 2 : 1) : 0,
            receptions: p.rec == null ? null : Math.round(p.rec - 2 + r * 4),
            receivingYards: p.rec == null ? null : Math.round(20 + r * 70),
            rushingYards: p.position === 'RB' ? Math.round(30 + r * 90) : null,
            passingYards: null, passingTds: null,
          };
        }));
      },
    },
    weather: {
      id: 'sample',
      // Colder the further north, with stable noise per stadium and kickoff, so some games get a weather note.
      async forecast(_ctx, { lat, lon }, kickoff) {
        const key = `${lat},${lon}:${kickoff.toISOString()}`;
        const temperatureF = Math.round((75 - (lat - 25) * 1.6 + (noise(`${key}:temp`) - 0.5) * 24) * 10) / 10;
        const windMph = Math.round((4 + noise(`${key}:wind`) * 18) * 10) / 10;
        const gustMph = Math.round(windMph * (1.3 + noise(`${key}:gust`) * 0.5) * 10) / 10;
        const precipChance = Math.round(noise(`${key}:wet`) * 100);
        const wet = precipChance >= 50;
        const precipIn = wet ? round2(0.02 + noise(`${key}:rain`) * 0.2) : 0;
        const snow = wet && temperatureF <= 32;
        return {
          at: new Date(Math.round(kickoff.getTime() / 3_600_000) * 3_600_000), temperatureF, windMph, gustMph, precipChance, precipIn,
          snowIn: snow ? round2(precipIn * 10) : 0, weatherCode: snow ? 73 : wet ? 61 : 3,
        };
      },
    },
  };
}
