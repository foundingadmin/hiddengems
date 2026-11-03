// Game conditions for the gem sheet (docs/prd.md F2.5). Implied team points move the rating (model v3.0, see
// impliedFactor in model.ts). The matchup is context only and never moves it: the opponent's rank in
// touchdowns allowed to the player's position, on a 1 to 32 track, with its last four games beside it.
import { TREND_MIN_GAMES } from './trends';

/** A final game this season whose usage is in. */
export interface MatchupGame {
  gameId: string;
  week: number;
  home: string;
  away: string;
}

/** Touchdowns one player scored in one game, with the team he played for and his position there. */
export interface MatchupScore {
  gameId: string;
  team: string;
  position: string;
  touchdowns: number;
}

export interface MatchupWeek {
  week: number;
  /** The offense the defense faced. */
  against: string;
  /** Touchdowns it allowed to the position. */
  touchdowns: number;
}

export interface Matchup {
  /** The defense being read. */
  defense: string;
  position: string;
  /** 1 allows the most touchdowns per game to the position. Ties share a rank. */
  rank: number;
  /** Another defense allows the same rate, so the rank is shared. */
  tied: boolean;
  /** Teams ranked: 32 once every team has played. */
  teams: number;
  perGame: number;
  games: number;
  /** Its last games, oldest first, at most MATCHUP_WEEKS. */
  recent: MatchupWeek[];
}

/** Games in the matchup strip. */
export const MATCHUP_WEEKS = 4;

/** A fullback scores like a running back; every other position stands alone. */
export const matchupPosition = (position: string): string => (position === 'FB' ? 'RB' : position);

/**
 * The defense's rank in touchdowns allowed per game to a position. games: final games this season before the
 * one being priced, only those whose usage is in, so a game with no scorer at the position counts as none
 * allowed. scores: the touchdowns players scored in them. Null when the defense has no game.
 */
export function matchup(games: readonly MatchupGame[], scores: readonly MatchupScore[], position: string, defense: string, weeks = MATCHUP_WEEKS): Matchup | null {
  const pos = matchupPosition(position);
  const allowed = new Map<string, number>();
  for (const s of scores) {
    if (matchupPosition(s.position) !== pos) continue;
    allowed.set(`${s.gameId}:${s.team}`, (allowed.get(`${s.gameId}:${s.team}`) ?? 0) + s.touchdowns);
  }
  const byDefense = new Map<string, MatchupWeek[]>();
  for (const g of games) {
    for (const [def, off] of [[g.home, g.away], [g.away, g.home]] as const) {
      const list = byDefense.get(def) ?? [];
      list.push({ week: g.week, against: off, touchdowns: allowed.get(`${g.gameId}:${off}`) ?? 0 });
      byDefense.set(def, list);
    }
  }
  const own = byDefense.get(defense);
  if (!own?.length) return null;
  const rate = (list: readonly MatchupWeek[]) => list.reduce((n, w) => n + w.touchdowns, 0) / list.length;
  const perGame = rate(own);
  const rates = [...byDefense.values()].map(rate);
  return {
    defense, position: pos,
    rank: 1 + rates.filter((r) => r > perGame + 1e-9).length,
    tied: rates.filter((r) => Math.abs(r - perGame) <= 1e-9).length > 1,
    teams: rates.length, perGame, games: own.length,
    recent: [...own].sort((a, b) => a.week - b.week).slice(-weeks),
  };
}

/**
 * Where the defense sits on the rank track: 0 at rank 1 (the most allowed), 1 at the last rank. One that has
 * allowed none sits at the last rank. Null under TREND_MIN_GAMES games, too few to rank.
 */
export function matchupTrack(m: Matchup): number | null {
  if (m.games < TREND_MIN_GAMES) return null;
  if (m.perGame === 0 || m.teams <= 1) return m.perGame === 0 ? 1 : 0;
  return (m.rank - 1) / (m.teams - 1);
}
