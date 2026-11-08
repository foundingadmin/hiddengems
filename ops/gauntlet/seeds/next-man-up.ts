// Next man up. A starter Out or Doubtful on the final injury report hands his work to the best healthy player behind
// him on the depth chart (MOD6's newsEvents, events only: no shift sizes). The heir's projection takes on the starter's
// recent volume (carries, targets, passing yards) at the heir's own rates. Silent for everyone who inherits nothing.
import type { DepthRow, Seed, WeekWorld } from '../contract';
import { type Part, projector, speakFromProjection } from './projection';
import { posGroup } from './shared';

const GROUPS = ['QB', 'RB', 'WR', 'TE'] as const;

export interface Inheritance { team: string; heir: string; starter: string; group: (typeof GROUPS)[number] }

/** Who inherits work this week: a starter (first at his spot now or a week ago) Out or Doubtful, and his heir. */
export function inheritances(world: WeekWorld): Inheritance[] {
  const status = new Map(world.injuries.map((i) => [i.playerId, i.status]));
  const hurt = (pid: string) => status.get(pid) === 'Out' || status.get(pid) === 'Doubtful';
  const chart = (d: DepthRow[], team: string, group: string) => d.filter((x) => x.team === team && posGroup(x.position) === group).sort((a, b) => a.rank - b.rank);
  const teams = [...new Set(world.games.flatMap((g) => [g.away, g.home]))].sort();
  const out: Inheritance[] = [];
  for (const team of teams) for (const group of GROUPS) {
    const now = chart(world.depth, team, group), prev = chart(world.depthPrev, team, group);
    const starters = [...new Set([...prev, ...now].filter((x) => x.rank === 1).map((x) => x.playerId))].sort();
    for (const pid of starters) {
      if (!hurt(pid)) continue;
      const spot = [...now, ...prev].find((x) => x.playerId === pid)!;
      const heir = now.filter((x) => x.playerId !== pid && !hurt(x.playerId) && x.position === spot.position)[0]
        ?? now.filter((x) => x.playerId !== pid && !hurt(x.playerId) && !starters.includes(x.playerId))[0];
      if (heir) out.push({ team, heir: heir.playerId, starter: pid, group });
    }
  }
  return out;
}

export const nextManUp: Seed = {
  id: 'next_man_up',
  name: 'Next man up',
  read(world) {
    const proj = projector(world);
    const added = new Map<string, Record<Part, number>>();
    for (const e of inheritances(world)) {
      const v = proj.volume(e.starter);
      if (!v) continue;
      const cur = added.get(e.heir) ?? { rush: 0, rec: 0, pass: 0 };
      added.set(e.heir, { rush: cur.rush + v.rush, rec: cur.rec + v.rec, pass: cur.pass + v.pass });
    }
    return speakFromProjection(world, (line) => {
      const add = added.get(line.playerId);
      return add ? { window: 'recent', addVolume: add } : null;
    });
  },
};
