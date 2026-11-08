// Ladder math. Every rung DraftKings posts for a player and bet type (main and alts), fair chances, fit with one smooth
// curve: a straight line in normal score against log yards, the lognormal shape yards take. Each rung's chance is read
// off the curve, so a rung priced out of step with its neighbours is pulled back in line. Silent with fewer than 3 rungs.
import type { Line, Seed } from '../contract';
import { clamp, invPhi, phi } from './shared';

/** From the README: two points fix any line, the third is the first that can disagree with it. */
const MIN_RUNGS = 3;

export const ladderMath: Seed = {
  id: 'ladder_math',
  name: 'Ladder math',
  read(world) {
    const ladders = new Map<string, Line[]>();
    for (const l of world.lines) {
      const k = `${l.gameId}|${l.playerId}|${l.betType}`;
      ladders.set(k, [...(ladders.get(k) ?? []), l]);
    }
    const out = new Map<string, number>();
    for (const lines of ladders.values()) {
      // One point per threshold, the main line's where a threshold is posted on both.
      const rungs = new Map<number, Line>();
      for (const l of lines) if (l.line > 0 && (!rungs.has(l.line) || !l.alt)) rungs.set(l.line, l);
      if (rungs.size < MIN_RUNGS) continue;
      const pts = [...rungs.values()].map((l) => ({ x: Math.log(l.line), z: invPhi(clamp(l.fair)) }));
      const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, mz = pts.reduce((a, p) => a + p.z, 0) / pts.length;
      const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
      const slope = pts.reduce((a, p) => a + (p.x - mx) * (p.z - mz), 0) / sxx;
      // A ladder whose chances do not fall as the line rises is not a ladder: no read.
      if (!(slope < 0)) continue;
      for (const l of lines) if (l.line > 0) out.set(l.key, clamp(phi(mz + slope * (Math.log(l.line) - mx))));
    }
    return out;
  },
};
