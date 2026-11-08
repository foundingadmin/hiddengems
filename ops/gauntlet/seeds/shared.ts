// Math and football reads every seed shares. Pure: nothing here reads a clock, a file or the network.
import type { GameLog, Line, WeekWorld } from '../contract';

/** The book every line on the board is posted by. */
export const DK = 'draftkings';

/** No yardage over is ever certain: injuries, ejections and blowouts end games early. Keeps log odds finite. */
export const CHANCE_FLOOR = 0.01;

export const clamp = (p: number) => Math.min(1 - CHANCE_FLOOR, Math.max(CHANCE_FLOOR, p));
export const logit = (p: number) => Math.log(p / (1 - p));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : NaN;
};

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
/** Standard normal CDF. */
export const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function invPhi(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > 1 - lo) return -invPhi(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/**
 * DraftKings' ladder for one player and bet type as one smooth curve: a straight line in normal score against log
 * yards, the lognormal shape yards take. One point per threshold (the main line's where a threshold is posted on both).
 * `mx` and `mz` are the rungs' mean log yards and mean normal score, `slope` the least squares fit (NaN under 2 rungs).
 */
export function ladderCurve(lines: Line[]): { mx: number; mz: number; slope: number; rungs: number } {
  const rungs = new Map<number, Line>();
  for (const l of lines) if (l.line > 0 && (!rungs.has(l.line) || !l.alt)) rungs.set(l.line, l);
  const pts = [...rungs.values()].map((l) => ({ x: Math.log(l.line), z: invPhi(clamp(l.fair)) }));
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, mz = pts.reduce((a, p) => a + p.z, 0) / pts.length;
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const slope = sxx > 0 ? pts.reduce((a, p) => a + (p.x - mx) * (p.z - mz), 0) / sxx : NaN;
  return { mx, mz, slope, rungs: pts.length };
}

/** QB, RB, WR or TE from any depth chart or roster spelling (LWR, SWR, FB, ...). */
export const posGroup = (pos: string) =>
  pos.includes('QB') ? 'QB' : pos.includes('RB') || pos === 'FB' || pos === 'HB' ? 'RB' : pos.includes('WR') ? 'WR' : pos.includes('TE') ? 'TE' : pos;

/** Under one offensive snap in twenty he was a special teamer or left on the first drive: not a game of his role. */
export const MIN_SNAP_SHARE = 0.05;

/**
 * A game that counts toward a player's role. A game with snaps and no stat line counts as a zero (the loader hands it
 * over with zero stats, and it stays in), so a receiver who ran routes and was never thrown to drags his average down.
 * With no snap count on record, a stat line means he played.
 */
export const played = (l: GameLog) => l.snapPct == null || l.snapPct > MIN_SNAP_SHARE;

const order = (a: GameLog, b: GameLog) => a.season - b.season || a.week - b.week;

/** Every player's played games, oldest first. */
export function gamesByPlayer(world: WeekWorld): Map<string, GameLog[]> {
  const by = new Map<string, GameLog[]>();
  for (const l of world.logs) if (played(l)) by.set(l.playerId, [...(by.get(l.playerId) ?? []), l]);
  for (const v of by.values()) v.sort(order);
  return by;
}

/** This season's games, and the most recent earlier season he has on record ("last season early"). */
export function seasons(world: WeekWorld, games: GameLog[]): { now: GameLog[]; last: GameLog[] } {
  const now = games.filter((g) => g.season === world.ref.season);
  const earlier = games.filter((g) => g.season < world.ref.season);
  const lastSeason = earlier.length ? Math.max(...earlier.map((g) => g.season)) : null;
  return { now, last: earlier.filter((g) => g.season === lastSeason) };
}

/** Implied points and expected margin for a team, from the board's spread and total (home team's view). */
export function teamScript(world: WeekWorld, gameId: string, team: string): { implied: number; margin: number } | null {
  const s = world.scripts.get(gameId);
  const g = world.games.find((x) => x.gameId === gameId);
  if (!s || !g || (team !== g.home && team !== g.away)) return null;
  const home = team === g.home;
  // homeSpread -3.5 means home is favored by 3.5: home scores (total + 3.5) / 2.
  const margin = home ? -s.homeSpread : s.homeSpread;
  return { implied: (s.total + margin) / 2, margin };
}
