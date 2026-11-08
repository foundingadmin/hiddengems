// Follow the move. DraftKings' main line for a player and stat 3 days before the board, against its main line now. If
// the point moved, the move is in yards; if the point held and the price moved, it is in log odds of the over's fair
// chance. The move is carried one more step the same way by shifting DraftKings' board ladder curve for that player
// and stat (ladderCurve in shared.ts), and every board line for him at that stat is read off the shifted curve. With
// no move the read is the curve itself. Silent only when he has no early main line for that stat.
import type { Line, Quote, Seed, WeekWorld } from '../contract';
import { DK, clamp, ladderCurve, logit, median, phi, sigmoid } from './shared';

/**
 * One more step: half the move already seen. Lines move on news and sharp money that keep arriving after the first
 * bets (final injury reports, inactives, weather, limits rising toward kickoff), so three days of movement is a trend
 * still in progress at the board, not one finished. The board sits under a day from kickoff, a fraction of the three
 * day window behind it, so the step still to come is shorter than the one already taken: half again.
 */
export const ONE_MORE_STEP = 0.5;

/** A yardage line never goes below half a yard: the shifted curve is read no lower than that. */
const MIN_YARDS = 0.5;

const ladderKey = (x: { gameId: string; playerId: string; betType: string }) => `${x.gameId}|${x.playerId}|${x.betType}`;

/** The early main line per player and stat: its point and the over's chance, two-way where the under is posted. */
function earlyMains(early: Quote[]): Map<string, { line: number; chance: number; twoWay: boolean }> {
  const by = new Map<string, Quote[]>();
  for (const q of early) if (q.book === DK && !q.alt) by.set(ladderKey(q), [...(by.get(ladderKey(q)) ?? []), q]);
  const out = new Map<string, { line: number; chance: number; twoWay: boolean }>();
  for (const [k, qs] of by) {
    // One main line per player and stat; if a snapshot ever holds two, the later posting order is not known, so the
    // point with both sides posted is the main one, then the lowest.
    const points = [...new Set(qs.filter((q) => q.side === 'over').map((q) => q.line))].sort((a, b) => a - b);
    const point = points.find((p) => qs.some((q) => q.side === 'under' && q.line === p)) ?? points[0];
    if (point === undefined) continue;
    const over = qs.find((q) => q.side === 'over' && q.line === point)!;
    const under = qs.find((q) => q.side === 'under' && q.line === point);
    const chance = under ? (1 / over.price) / (1 / over.price + 1 / under.price) : 1 / over.price;
    out.set(k, { line: point, chance, twoWay: !!under });
  }
  return out;
}

/** Each bet type's median ladder slope on this board, for a player whose own ladder is too short to fit. */
function boardSlopes(ladders: Map<string, Line[]>): { byType: Map<string, number>; all: number } {
  const byType = new Map<string, number[]>();
  for (const lines of ladders.values()) {
    const c = ladderCurve(lines);
    // The same bar as ladder math: three rungs, chances falling as the line rises.
    if (c.rungs >= 3 && c.slope < 0) byType.set(lines[0]!.betType, [...(byType.get(lines[0]!.betType) ?? []), c.slope]);
  }
  return { byType: new Map([...byType].map(([b, xs]) => [b, median(xs)])), all: median([...byType.values()].flat()) };
}

export const followTheMove: Seed = {
  id: 'follow_the_move',
  name: 'Follow the move',
  read(world: WeekWorld) {
    const out = new Map<string, number>();
    if (!world.early) return out;
    const mains = earlyMains(world.early);
    const ladders = new Map<string, Line[]>();
    for (const l of world.lines) if (l.line > 0) ladders.set(ladderKey(l), [...(ladders.get(ladderKey(l)) ?? []), l]);
    let slopes: ReturnType<typeof boardSlopes> | null = null;

    for (const [k, lines] of ladders) {
      const then = mains.get(k);
      if (!then) continue;
      // The board curve: his own fit from two rungs on, else his rungs' centre with this board's typical slope.
      const own = ladderCurve(lines);
      let slope = own.slope;
      if (!(slope < 0)) {
        slopes ??= boardSlopes(ladders);
        slope = slopes.byType.get(lines[0]!.betType) ?? slopes.all;
      }
      if (!(slope < 0)) continue; // no ladder on the board to shape any curve: nothing to shift
      const curve = (yards: number) => phi(own.mz + slope * (Math.log(Math.max(MIN_YARDS, yards)) - own.mx));

      const main = lines.find((l) => !l.alt);
      // The board's main point; with only alt rungs posted, the curve's even-money point stands in for it.
      const now = main?.line ?? Math.exp(own.mx - own.mz / slope);
      let read: (l: Line) => number;
      if (now !== then.line) {
        const yards = ONE_MORE_STEP * (now - then.line);
        read = (l) => curve(l.line - yards);
      } else {
        const nowChance = then.twoWay ? main!.fair : 1 / main!.price;
        const step = ONE_MORE_STEP * (logit(clamp(nowChance)) - logit(clamp(then.chance)));
        read = (l) => sigmoid(logit(clamp(curve(l.line))) + step);
      }
      for (const l of lines) out.set(l.key, clamp(read(l)));
    }
    return out;
  },
};
