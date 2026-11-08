// The history buy (WK9 Coach brief, Nov 8 2026): every regular season game in Weeks 2 to 8, Thursday, Sunday and
// Monday, with the board it is picked from, its close (kickoff minus 20 minutes) and the markets each snapshot needs.
// Sunday and Monday games use the Saturday 7:47 PM Mountain board; Thursday games use the last 7:47 PM Mountain
// snapshot before kickoff (Wednesday). Sunday games already hold the first four markets (fetch-odds.mjs), so they buy
// only the new ones. Writes experiments/backtest/history-plan.json, which fetch-history.mjs reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { FREEZE_LEAD_MINUTES, SNAPSHOT_ZONE, findTeam, gameId, zonedTimeToUtc } from '../../packages/core/src/index';
import { normalizeGames } from '../../packages/ingest/src/providers/nflverse';
import { NFLVERSE_DIR, ROOT } from './paths';
import { segmentOf, type Segment } from './plan';

export const HISTORY_PLAN_PATH = `${ROOT}/experiments/backtest/history-plan.json`;
export const HISTORY_WEEKS = [2, 3, 4, 5, 6, 7, 8];

/** Markets the first buy already holds for Sunday games. */
export const FIRST_MARKETS = ['player_anytime_td', 'player_receptions_alternate', 'player_reception_yds_alternate', 'player_rush_yds_alternate'];
const BOTH = ['pass_yds', 'rush_reception_yds', 'pass_rush_yds', 'rush_attempts', 'pass_completions', 'pass_attempts'];
const MAIN_ONLY = ['reception_yds', 'rush_yds', 'receptions'];
/** The 15 keys new to every game. */
export const NEW_MARKETS = [...BOTH.flatMap((s) => [`player_${s}`, `player_${s}_alternate`]), ...MAIN_ONLY.map((s) => `player_${s}`)];
/** Spreads and totals frame game script; bought once per board for every game at once (historical odds list). */
export const GAME_MARKETS = ['spreads', 'totals'];

export type Day = 'thu' | 'sun' | 'mon';

export interface HistoryGame {
  gameId: string;
  nflverseId: string;
  week: number;
  day: Day;
  segment: Segment | 'TNF' | 'MNF';
  kickoff: string;
  boardAt: string;
  closeAt: string;
  away: string;
  home: string;
  /** Markets to buy at each snapshot. */
  buy: string[];
}

export interface HistoryBoard { week: number; day: 'wed' | 'sat'; boardAt: string; games: string[] }

const parts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: SNAPSHOT_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
}).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;

/** 7:47 PM Mountain on the given number of days before the kickoff's Mountain date. */
const boardBefore = (kickoff: Date, daysBack: number) => {
  const m = parts(kickoff);
  const day = new Date(Date.UTC(+m.year!, +m.month! - 1, +m.day! - daysBack)).toISOString().slice(0, 10);
  return zonedTimeToUtc(day, '19:47', SNAPSHOT_ZONE);
};

export function buildHistoryPlan(gamesCsv: string): { games: HistoryGame[]; boards: HistoryBoard[] } {
  const all = normalizeGames(gamesCsv, 2026, new Date()).filter((g) => g.seasonType === 'reg' && g.week !== null && HISTORY_WEEKS.includes(g.week));
  const games: HistoryGame[] = all.map((g) => {
    const wd = parts(g.kickoff).weekday;
    const day: Day = wd === 'Thu' ? 'thu' : wd === 'Sun' ? 'sun' : wd === 'Mon' ? 'mon' : (() => { throw new Error(`${g.externalId} kicks off on ${wd}`); })();
    const away = findTeam(g.awayTeam)?.id, home = findTeam(g.homeTeam)?.id;
    if (!away || !home) throw new Error(`Unknown team in ${g.externalId}`);
    // Thursday: the night before. Sunday: the night before. Monday: the Saturday two nights before.
    const boardAt = boardBefore(g.kickoff, day === 'mon' ? 2 : 1);
    if (!(boardAt < g.kickoff)) throw new Error(`${g.externalId} board is not before kickoff`);
    return {
      gameId: gameId(g.kickoff, away, home), nflverseId: g.externalId, week: g.week!, day,
      segment: (day === 'thu' ? 'TNF' : day === 'mon' ? 'MNF' : segmentOf(g.kickoff)) as HistoryGame['segment'],
      kickoff: g.kickoff.toISOString(), boardAt: boardAt.toISOString(),
      closeAt: new Date(g.kickoff.getTime() - FREEZE_LEAD_MINUTES * 60_000).toISOString(), away, home,
      buy: day === 'sun' ? NEW_MARKETS : [...NEW_MARKETS, ...FIRST_MARKETS],
    };
  }).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const boards = new Map<string, HistoryBoard>();
  for (const g of games) {
    const b = boards.get(g.boardAt) ?? { week: g.week, day: g.day === 'thu' ? 'wed' : 'sat', boardAt: g.boardAt, games: [] };
    b.games.push(g.gameId);
    boards.set(g.boardAt, b);
  }
  return { games, boards: [...boards.values()] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const plan = buildHistoryPlan(readFileSync(`${NFLVERSE_DIR}/games.csv`, 'utf8'));
  writeFileSync(HISTORY_PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`);
  for (const b of plan.boards) console.log(`Week ${b.week} ${b.day} board ${b.boardAt} ${b.games.length} games`);
}
