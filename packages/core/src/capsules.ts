// Time capsules (Nov 7 2026): every input a future MOD could read, saved as it stood, so backtests replay our own
// record instead of buying history or trusting files that get rewritten. Two captures per NFL week. The Saturday
// board at 7:47 PM Denver (every player prop and game market across every US book, plus the nflverse files that
// change week to week), and a close for each game shortly before kickoff (odds only). Raw files go to the private
// backup repository (capsules/<season>/wk<nn>/...), never this public one. News is the reading half, saved by
// the Saturday session in experiments/capsules.

import { SNAPSHOT_ZONE, WEEKDAYS, wallParts } from './snapshots';

/** Every NFL player prop The Odds API lists, standard and alternate. Only markets a book returns are billed. */
export const CAPSULE_PLAYER_MARKETS = [
  'player_assists', 'player_defensive_interceptions', 'player_field_goals', 'player_kicking_points',
  'player_pass_attempts', 'player_pass_completions', 'player_pass_interceptions', 'player_pass_longest_completion',
  'player_pass_rush_yds', 'player_pass_rush_reception_tds', 'player_pass_rush_reception_yds', 'player_pass_tds',
  'player_pass_yds', 'player_pass_yds_q1', 'player_pats', 'player_receptions', 'player_reception_longest',
  'player_reception_tds', 'player_reception_yds', 'player_rush_attempts', 'player_rush_longest',
  'player_rush_reception_tds', 'player_rush_reception_yds', 'player_rush_tds', 'player_rush_yds', 'player_sacks',
  'player_solo_tackles', 'player_tackles_assists', 'player_tds_over', 'player_tds', 'player_1st_td',
  'player_anytime_td', 'player_last_td',
  'player_assists_alternate', 'player_field_goals_alternate', 'player_kicking_points_alternate',
  'player_pass_attempts_alternate', 'player_pass_completions_alternate', 'player_pass_interceptions_alternate',
  'player_pass_longest_completion_alternate', 'player_pass_rush_yds_alternate', 'player_pass_rush_reception_tds_alternate',
  'player_pass_rush_reception_yds_alternate', 'player_pass_tds_alternate', 'player_pass_yds_alternate',
  'player_pats_alternate', 'player_receptions_alternate', 'player_reception_longest_alternate',
  'player_reception_tds_alternate', 'player_reception_yds_alternate', 'player_rush_attempts_alternate',
  'player_rush_longest_alternate', 'player_rush_reception_tds_alternate', 'player_rush_reception_yds_alternate',
  'player_rush_tds_alternate', 'player_rush_yds_alternate', 'player_sacks_alternate', 'player_solo_tackles_alternate',
  'player_tackles_assists_alternate',
] as const;

/** Game markets: sides, totals and team totals frame every player prop (a 27 point team total, a 10 point favorite). */
export const CAPSULE_GAME_MARKETS = ['h2h', 'spreads', 'totals', 'alternate_spreads', 'alternate_totals', 'team_totals', 'alternate_team_totals'] as const;

export const CAPSULE_MARKETS: readonly string[] = [...CAPSULE_PLAYER_MARKETS, ...CAPSULE_GAME_MARKETS];

export const CAPSULE_RULES = {
  /** The Saturday board, Denver wall time. Retried every cron tick until it lands or the window closes. */
  board: { weekday: 6, time: '19:47' },
  /** The board window closes Sunday at this time, before the first kickoff. */
  boardUntil: { weekday: 0, time: '10:30' },
  /** Games kicking off within this many days of the board belong to its week (through Monday night). */
  horizonDays: 4,
  /** A game's close is captured once inside this many minutes before kickoff. */
  closeLeadMinutes: 25,
  /** The smallest monthly plan that carries capsules. The free plan's 500 credits cannot. */
  minPlanCredits: 5000,
} as const;

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h! * 60 + m!; };

export interface DueCapsules<G> {
  /** The Saturday board, when due: slot "capsule-sat:<Saturday date>". */
  board: { slot: string; saturday: string } | null;
  /** Games whose close is due: slot "capsule-close:<gameId>". */
  closes: G[];
}

/** What a capsule run should capture now. Slots already taken never repeat. */
export function dueCapsules<G extends { id: string; kickoff: Date }>(now: Date, games: readonly G[], taken: ReadonlySet<string>): DueCapsules<G> {
  const p = wallParts(now, SNAPSHOT_ZONE);
  const weekday = WEEKDAYS.indexOf(p.weekday!);
  const clock = Number(p.hour) * 60 + Number(p.minute);
  const today = `${p.year}-${p.month}-${p.day}`;
  const { board: b, boardUntil: u } = CAPSULE_RULES;
  let saturday: string | null = null;
  if (weekday === b.weekday && clock >= minutes(b.time)) saturday = today;
  if (weekday === u.weekday && clock < minutes(u.time)) saturday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const slot = saturday ? `capsule-sat:${saturday}` : null;
  const t = now.getTime();
  return {
    board: slot && !taken.has(slot) ? { slot, saturday: saturday! } : null,
    closes: games.filter((g) => {
      const until = g.kickoff.getTime() - t;
      return until > 0 && until <= CAPSULE_RULES.closeLeadMinutes * 60_000 && !taken.has(`capsule-close:${g.id}`);
    }),
  };
}

/** Where a capsule file lives in the backup repository: capsules/2026/wk09/sat/odds/<gameId>.json.gz */
export const capsulePath = (season: number, week: number | null, kind: 'sat' | 'close', file: string) =>
  `capsules/${season}/wk${String(week ?? 0).padStart(2, '0')}/${kind}/${file}`;
