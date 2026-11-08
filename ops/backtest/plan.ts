// The replay plan: every 2026 Sunday game in Weeks 1 to 8, its segment, the Saturday 7:47 PM board it is picked
// from and the close 20 minutes before its kickoff. Thursday, Saturday and Monday games are skipped.
// Writes experiments/backtest/plan.json, which fetch-odds.mjs reads to know what to buy.
import { readFileSync, writeFileSync } from 'node:fs';
import { FREEZE_LEAD_MINUTES, SNAPSHOT_ZONE, findTeam, gameId, zonedTimeToUtc } from '../../packages/core/src/index';
import { normalizeGames } from '../../packages/ingest/src/providers/nflverse';
import { NFLVERSE_DIR, PLAN_PATH, WEEKS } from './paths';

export type Segment = 'AM' | 'PM' | 'SNF';

export interface PlanGame {
  gameId: string;
  nflverseId: string;
  week: number;
  segment: Segment;
  kickoff: string;
  closeAt: string;
  away: string;
  home: string;
}

export interface PlanWeek {
  week: number;
  /** The Saturday 7:47 PM Mountain board before this week's Sunday. */
  boardAt: string;
  /** Sunday in Mountain time, the day every game below kicks off. */
  sunday: string;
  /** Week 1 has no 2026 games before it, so no MOD can pick and no odds are bought. */
  buy: boolean;
  games: PlanGame[];
}

const mountain = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: SNAPSHOT_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short',
}).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;

/** AM before noon Mountain, PM noon to 4 PM, SNF 4 PM on. */
export function segmentOf(kickoff: Date): Segment {
  const h = Number(mountain(kickoff).hour);
  return h < 12 ? 'AM' : h < 16 ? 'PM' : 'SNF';
}

export function buildPlan(gamesCsv: string): PlanWeek[] {
  const all = normalizeGames(gamesCsv, 2026, new Date()).filter((g) => g.seasonType === 'reg' && g.week !== null && WEEKS.includes(g.week));
  return WEEKS.map((week) => {
    const sundayGames = all.filter((g) => g.week === week && mountain(g.kickoff).weekday === 'Sun').sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
    if (!sundayGames.length) throw new Error(`Week ${week} has no Sunday games in nflverse`);
    const m = mountain(sundayGames[0]!.kickoff);
    const sunday = `${m.year}-${m.month}-${m.day}`;
    const sat = new Date(Date.UTC(+m.year!, +m.month! - 1, +m.day! - 1));
    const boardAt = zonedTimeToUtc(sat.toISOString().slice(0, 10), '19:47', SNAPSHOT_ZONE);
    return {
      week, sunday, boardAt: boardAt.toISOString(), buy: week > 1,
      games: sundayGames.map((g) => {
        const away = findTeam(g.awayTeam)?.id, home = findTeam(g.homeTeam)?.id;
        if (!away || !home) throw new Error(`Unknown team in ${g.externalId}`);
        return {
          gameId: gameId(g.kickoff, away, home), nflverseId: g.externalId, week, segment: segmentOf(g.kickoff), kickoff: g.kickoff.toISOString(),
          closeAt: new Date(g.kickoff.getTime() - FREEZE_LEAD_MINUTES * 60_000).toISOString(), away, home,
        };
      }),
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const plan = buildPlan(readFileSync(`${NFLVERSE_DIR}/games.csv`, 'utf8'));
  writeFileSync(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`);
  for (const w of plan) console.log(`Week ${w.week} board ${w.boardAt} ${w.games.length} Sunday games${w.buy ? '' : ' (not bought)'}`);
}
