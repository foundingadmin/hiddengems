// Trend lines for the gem sheet's Notes (docs/prd.md F2.1): three plain lines with percents, ranked by
// strength times sample, score = abs(rate - 0.5) * sqrt(n_games). A line never cites fewer than 3 games, and the
// season rate comes before the last 10. Candidates use only data we hold: his games this season, where they
// were played, the schedule's spread and his red zone chances.

/** One game he played this season, before the one being priced. */
export interface TrendGame {
  week: number;
  home: boolean;
  /** His team was favored by the spread; null without a spread or at a pick'em. */
  favored: boolean | null;
  touchdowns: number;
  /** Carries plus targets inside the 10; null when usage for the game is not in yet. */
  redZone: number | null;
}

/** This game's setup, so the venue and role lines speak to it. */
export interface TrendSetup {
  home: boolean;
  favored: boolean | null;
}

/**
 * season    scored in hits of games this season
 * last10    scored in hits of his last 10 (only past 10 games, else it is the season)
 * venue     scored in hits of his home (or away) games, as this game is
 * role      scored in hits of his games as a favorite (or underdog), as this game is
 * redZone   had a red zone chance in hits of games; trend says whether his last 3 run above or below the rest
 */
export type TrendKind = 'season' | 'last10' | 'venue' | 'role' | 'redZone';

export interface Trend {
  kind: TrendKind;
  hits: number;
  games: number;
  rate: number;
  score: number;
  /** venue: home or away. role: favorite or underdog. redZone: up, down or flat over the last 3. */
  side?: 'home' | 'away' | 'favorite' | 'underdog' | 'up' | 'down' | 'flat';
}

/** A trend line never cites a sample smaller than this. */
export const TREND_MIN_GAMES = 3;
/** Lines shown. */
export const TREND_LINES = 3;
/** Red zone chances per game the last 3 must move from the earlier games to read as up or down. */
export const TREND_RED_ZONE_SHIFT = 0.5;

export function trendScore(rate: number, games: number): number {
  return Math.abs(rate - 0.5) * Math.sqrt(games);
}

const ORDER: TrendKind[] = ['season', 'last10', 'venue', 'role', 'redZone'];

function trend(kind: TrendKind, games: readonly TrendGame[], hit: (g: TrendGame) => boolean, side?: Trend['side']): Trend | null {
  if (games.length < TREND_MIN_GAMES) return null;
  const hits = games.filter(hit).length;
  const rate = hits / games.length;
  return { kind, hits, games: games.length, rate, score: trendScore(rate, games.length), ...(side ? { side } : {}) };
}

/** Every candidate line, strongest first, before the cut to TREND_LINES. */
export function trendCandidates(games: readonly TrendGame[], setup: TrendSetup): Trend[] {
  const played = [...games].sort((a, b) => a.week - b.week);
  const scored = (g: TrendGame) => g.touchdowns > 0;
  const out: (Trend | null)[] = [
    trend('season', played, scored),
    played.length > 10 ? trend('last10', played.slice(-10), scored) : null,
    trend('venue', played.filter((g) => g.home === setup.home), scored, setup.home ? 'home' : 'away'),
    setup.favored == null ? null : trend('role', played.filter((g) => g.favored === setup.favored), scored, setup.favored ? 'favorite' : 'underdog'),
  ];
  const usage = played.filter((g): g is TrendGame & { redZone: number } => g.redZone != null);
  const rz = trend('redZone', usage, (g) => (g.redZone ?? 0) > 0);
  if (rz) {
    const recent = usage.slice(-3), before = usage.slice(0, -3);
    const perGame = (xs: readonly { redZone: number }[]) => xs.reduce((n, g) => n + g.redZone, 0) / xs.length;
    const shift = before.length >= TREND_MIN_GAMES ? perGame(recent) - perGame(before) : 0;
    out.push({ ...rz, side: shift >= TREND_RED_ZONE_SHIFT ? 'up' : shift <= -TREND_RED_ZONE_SHIFT ? 'down' : 'flat' });
  }
  return out.filter((t): t is Trend => t !== null)
    .sort((a, b) => b.score - a.score || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** The lines the Notes show: the strongest TREND_LINES, with the season rate placed before the last 10. */
export function trendLines(games: readonly TrendGame[], setup: TrendSetup, limit = TREND_LINES): Trend[] {
  const top = trendCandidates(games, setup).slice(0, limit);
  const season = top.findIndex((t) => t.kind === 'season'), last10 = top.findIndex((t) => t.kind === 'last10');
  if (season > last10 && last10 >= 0) top.splice(last10, 0, top.splice(season, 1)[0]!);
  return top;
}

/** Whether his team was favored, from the schedule's spread (above zero: the home team is favored). */
export function favoredBySpread(spreadLine: number | null, home: boolean): boolean | null {
  if (spreadLine == null || spreadLine === 0) return null;
  return home ? spreadLine > 0 : spreadLine < 0;
}
