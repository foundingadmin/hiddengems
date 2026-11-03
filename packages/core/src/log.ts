// The Last 10 game log (docs/prd.md F0.3) for anytime TD: one cell per game played, oldest first, with the
// team's bye where it falls inside that span. The season record sits beside it, because it outranks the last 10.

export interface LogGame {
  week: number;
  /** The other team's id. */
  opponent: string;
  home: boolean;
  /** Touchdowns he scored (rushing, receiving, returns, recoveries, never thrown); null when he did not play. */
  touchdowns: number | null;
}

export type LogCell =
  | { kind: 'hit' | 'miss'; week: number; opponent: string; home: boolean; touchdowns: number }
  | { kind: 'bye'; week: number };

export interface GameLog {
  cells: LogCell[];
  /** Every game he played this season, and the ones he scored in. */
  season: { games: number; hits: number };
}

/** Games the log shows. */
export const LOG_GAMES = 10;

/**
 * leagueWeeks: every week with league games before the one being priced. games: his team's games in those
 * weeks, plus any he played for another team. A week with league games and none for him is a bye; a game he
 * did not play is left out, since it is neither a hit nor a miss.
 */
export function gameLog(leagueWeeks: readonly number[], games: readonly LogGame[], limit = LOG_GAMES): GameLog {
  const played = games.filter((g): g is LogGame & { touchdowns: number } => g.touchdowns !== null).sort((a, b) => a.week - b.week);
  const season = { games: played.length, hits: played.filter((g) => g.touchdowns > 0).length };
  const last = played.slice(-limit);
  if (!last.length) return { cells: [], season };
  const from = last[0]!.week;
  const busy = new Set(games.map((g) => g.week));
  const byes = [...new Set(leagueWeeks)].filter((w) => w > from && !busy.has(w)).map((week): LogCell => ({ kind: 'bye', week }));
  const cells = [...last.map((g): LogCell => ({ kind: g.touchdowns > 0 ? 'hit' : 'miss', week: g.week, opponent: g.opponent, home: g.home, touchdowns: g.touchdowns })), ...byes]
    .sort((a, b) => a.week - b.week);
  return { cells, season };
}
