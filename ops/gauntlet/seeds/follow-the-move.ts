// Follow the move. DraftKings' price on the same over at the same line 3 days before the board, against its price now.
// The move (in log odds of the price's own chance, so the cut cancels) is carried on past the fair chance in the
// direction it went. Silent with no early quote for that line, and when the price did not move.
import type { Seed } from '../contract';
import { DK, clamp, logit, sigmoid } from './shared';

/**
 * How far a move carries: half again. Lines move on news and sharp money that keep arriving after the first bets, so
 * three days of movement is a trend still in progress at the board, not one finished.
 */
const CARRY = 0.5;

export const followTheMove: Seed = {
  id: 'follow_the_move',
  name: 'Follow the move',
  read(world) {
    const out = new Map<string, number>();
    if (!world.early) return out;
    const early = new Map<string, { alt: boolean; price: number }[]>();
    for (const q of world.early) {
      if (q.book !== DK || q.side !== 'over') continue;
      const k = `${q.gameId}|${q.playerId}|${q.betType}|${q.line}`;
      early.set(k, [...(early.get(k) ?? []), { alt: q.alt, price: q.price }]);
    }
    for (const l of world.lines) {
      const qs = early.get(`${l.gameId}|${l.playerId}|${l.betType}|${l.line}`);
      const then = qs?.find((q) => q.alt === l.alt) ?? qs?.[0];
      if (!then) continue;
      const move = logit(clamp(1 / l.price)) - logit(clamp(1 / then.price));
      if (move === 0) continue;
      out.set(l.key, clamp(sigmoid(logit(clamp(l.fair)) + CARRY * move)));
    }
    return out;
  },
};
