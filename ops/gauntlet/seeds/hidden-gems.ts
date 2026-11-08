// Hidden gems. The public bets the overs of the fantasy names it knows, so books shade those overs up and leave the
// rest alone. Players rank by season fantasy points so far (last season's per game average counts for its first
// weeks); the top 24 at the position get fair nudged down, everyone else up. Silent with no fantasy history.
import type { GameLog, Seed } from '../contract';
import { LAST_SEASON_GAMES } from './projection';
import { clamp, logit, posGroup, seasons, sigmoid } from './shared';

/** Two starters per team in a 12-team league: the names every fantasy player starts and the public bets. */
const TOP_RANK = 24;
/** Books shade within their cut: a tenth in log odds is about 2.5 points of chance at even money, half a -110 market's hold per side. */
const NUDGE = 0.1;

export const hiddenGems: Seed = {
  id: 'hidden_gems',
  name: 'Hidden gems',
  read(world) {
    const byPlayer = new Map<string, GameLog[]>();
    for (const l of world.logs) byPlayer.set(l.playerId, [...(byPlayer.get(l.playerId) ?? []), l]);
    // Points this season plus last season's per game average as LAST_SEASON_GAMES games (the shared prior's weight).
    const score = new Map<string, { pos: string; points: number }>();
    for (const [pid, logs] of byPlayer) {
      const { now, last } = seasons(world, logs.sort((a, b) => a.season - b.season || a.week - b.week));
      if (!now.length && !last.length) continue;
      const pts = now.reduce((a, l) => a + l.fantasyPoints, 0)
        + (last.length ? (LAST_SEASON_GAMES * last.reduce((a, l) => a + l.fantasyPoints, 0)) / last.length : 0);
      score.set(pid, { pos: posGroup((now.at(-1) ?? last.at(-1)!).position), points: pts });
    }
    const out = new Map<string, number>();
    for (const l of world.lines) {
      const me = score.get(l.playerId);
      if (!me) continue;
      const pos = posGroup(l.position);
      const ahead = [...score].filter(([pid, s]) => pid !== l.playerId && s.pos === pos && s.points > me.points).length;
      const known = ahead < TOP_RANK;
      out.set(l.key, clamp(sigmoid(logit(clamp(l.fair)) + (known ? -NUDGE : NUDGE))));
    }
    return out;
  },
};
