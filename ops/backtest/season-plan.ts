// The season history buy (Josh, Nov 8 2026): 2025 Weeks 1 to 18 and 2026 Week 1, eight yardage keys, board and close,
// then an early snapshot (4 main yardage keys, 3 days before each board) for 2025 and 2026 Weeks 1 to 8.
// Boards follow one rule: Sunday and Monday games use the Saturday 7:47 PM Mountain board, every other game uses
// 7:47 PM Mountain on the night before its game day. The close is kickoff minus 20 minutes.
// Writes experiments/backtest/season-plan.json (jobs in priority order), which fetch-seasons.ts reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { FREEZE_LEAD_MINUTES, SNAPSHOT_ZONE, findTeam, gameId, zonedTimeToUtc } from '../../packages/core/src/index';
import { normalizeGames } from '../../packages/ingest/src/providers/nflverse';
import { NFLVERSE_DIR, ROOT } from './paths';

export const SEASON_PLAN_PATH = `${ROOT}/experiments/backtest/season-plan.json`;
const YARDS = ['rush_yds', 'reception_yds', 'pass_yds', 'rush_reception_yds'];
export const YARD_KEYS = YARDS.flatMap((s) => [`player_${s}`, `player_${s}_alternate`]);
export const EARLY_KEYS = YARDS.map((s) => `player_${s}`);
export const EARLY_DAYS = 3;

export interface SeasonGame {
  season: number; week: number; gameId: string; nflverseId: string; weekday: string; kickoff: string;
  boardAt: string; closeAt: string; earlyAt: string; away: string; home: string;
}
/** One purchase: a game's snapshot (board, close or early), or a board's event list or game lines. */
export interface Job {
  priority: 1 | 2 | 3; season: number; week: number; kind: 'events' | 'lines' | 'board' | 'close' | 'early';
  at: string; gameId?: string; boardAt?: string; markets: string[]; cost: number;
}

const mtParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: SNAPSHOT_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
}).formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;

/** 7:47 PM Mountain, a number of days before the kickoff's Mountain date. */
function evening(kickoff: Date, daysBack: number): Date {
  const m = mtParts(kickoff);
  const day = new Date(Date.UTC(+m.year!, +m.month! - 1, +m.day! - daysBack)).toISOString().slice(0, 10);
  return zonedTimeToUtc(day, '19:47', SNAPSHOT_ZONE);
}

export function seasonGames(gamesCsv: string, season: number, weeks: number[]): SeasonGame[] {
  return normalizeGames(gamesCsv, season, new Date()).filter((g) => g.seasonType === 'reg' && g.week !== null && weeks.includes(g.week)).map((g) => {
    const wd = mtParts(g.kickoff).weekday!;
    const daysBack = wd === 'Sun' ? 1 : wd === 'Mon' ? 2 : 1;
    const boardAt = evening(g.kickoff, daysBack);
    if (!(boardAt < g.kickoff)) throw new Error(`${g.externalId} board is not before kickoff`);
    const away = findTeam(g.awayTeam)?.id, home = findTeam(g.homeTeam)?.id;
    if (!away || !home) throw new Error(`Unknown team in ${g.externalId}`);
    return {
      season, week: g.week!, gameId: gameId(g.kickoff, away, home), nflverseId: g.externalId, weekday: wd, kickoff: g.kickoff.toISOString(),
      boardAt: boardAt.toISOString(), closeAt: new Date(g.kickoff.getTime() - FREEZE_LEAD_MINUTES * 60_000).toISOString(),
      earlyAt: new Date(boardAt.getTime() - EARLY_DAYS * 86_400_000).toISOString(), away, home,
    };
  }).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

/** Priority 1 and 2: per board an event list (1) and spreads and totals (20), per game board and close (10 per key). */
function boardJobs(games: SeasonGame[], priority: 1 | 2): Job[] {
  const jobs: Job[] = [];
  const boards = [...new Set(games.map((g) => g.boardAt))].sort();
  for (const at of boards) {
    const gs = games.filter((g) => g.boardAt === at);
    const { season, week } = gs[0]!;
    jobs.push({ priority, season, week, kind: 'events', at, markets: [], cost: 1 });
    jobs.push({ priority, season, week, kind: 'lines', at, markets: ['spreads', 'totals'], cost: 20 });
    for (const g of gs) {
      jobs.push({ priority, season, week: g.week, kind: 'board', at: g.boardAt, gameId: g.gameId, boardAt: g.boardAt, markets: YARD_KEYS, cost: 10 * YARD_KEYS.length });
      jobs.push({ priority, season, week: g.week, kind: 'close', at: g.closeAt, gameId: g.gameId, boardAt: g.boardAt, markets: YARD_KEYS, cost: 10 * YARD_KEYS.length });
    }
  }
  return jobs;
}

export function buildSeasonPlan(gamesCsv: string) {
  const g2025 = seasonGames(gamesCsv, 2025, Array.from({ length: 18 }, (_, i) => i + 1));
  const g2026w1 = seasonGames(gamesCsv, 2026, [1]);
  const g2026 = seasonGames(gamesCsv, 2026, [1, 2, 3, 4, 5, 6, 7, 8]);
  const early = [...g2025.filter((g) => g.week <= 8), ...g2026].map((g): Job => ({
    priority: 3, season: g.season, week: g.week, kind: 'early', at: g.earlyAt, gameId: g.gameId, boardAt: g.boardAt, markets: EARLY_KEYS, cost: 10 * EARLY_KEYS.length,
  }));
  const jobs = [...boardJobs(g2025, 1), ...boardJobs(g2026w1, 2), ...early];
  return { games: [...g2025, ...g2026], jobs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const plan = buildSeasonPlan(readFileSync(`${NFLVERSE_DIR}/games.csv`, 'utf8'));
  writeFileSync(SEASON_PLAN_PATH, `${JSON.stringify(plan, null, 1)}\n`);
  for (const p of [1, 2, 3]) {
    const j = plan.jobs.filter((x) => x.priority === p);
    console.log(`Priority ${p}: ${j.length} calls, upper bound ${j.reduce((a, x) => a + x.cost, 0).toLocaleString('en-US')} credits, ${new Set(j.filter((x) => x.gameId).map((x) => x.gameId)).size} games`);
  }
  console.log(`Total upper bound ${plan.jobs.reduce((a, x) => a + x.cost, 0).toLocaleString('en-US')} credits`);
}
