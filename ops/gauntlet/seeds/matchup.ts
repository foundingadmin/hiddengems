// Matchup. Yards the opponent allowed the player's position in its recent games this season, against the league
// average per team game, scale the projection part by part. Silent when the opponent has fewer than 3 games on record.
import type { Seed, WeekWorld } from '../contract';
import { type Part, speakFromProjection, yards } from './projection';
import { played, posGroup } from './shared';

/** Six games: enough to wash out one blowout, recent enough to reflect that defense's injuries and scheme this year. */
const DEFENSE_GAMES = 6;
/** From the README: fewer opponent games than this is no read on a defense. */
const MIN_DEFENSE_GAMES = 3;
const PART_LIST: Part[] = ['rush', 'rec', 'pass'];

/** Per defense and team game this season: yards each position put up against it, part by part. */
function allowedTable(world: WeekWorld) {
  const games = new Map<string, { defense: string; week: number; sums: Map<string, number> }>();
  for (const l of world.logs) {
    if (l.season !== world.ref.season || !played(l)) continue;
    const k = `${l.gameId}|${l.opponent}`;
    const g = games.get(k) ?? { defense: l.opponent, week: l.week, sums: new Map() };
    for (const p of PART_LIST) {
      const s = `${posGroup(l.position)}|${p}`;
      g.sums.set(s, (g.sums.get(s) ?? 0) + yards(l, p));
    }
    games.set(k, g);
  }
  const all = [...games.values()];
  const league = (pos: string, p: Part) => all.reduce((a, g) => a + (g.sums.get(`${pos}|${p}`) ?? 0), 0) / (all.length || 1);
  const recent = (defense: string) => all.filter((g) => g.defense === defense).sort((a, b) => a.week - b.week).slice(-DEFENSE_GAMES);
  return { league, recent };
}

export const matchup: Seed = {
  id: 'matchup',
  name: 'Matchup',
  read(world) {
    const t = allowedTable(world);
    return speakFromProjection(world, (line) => {
      const games = t.recent(line.opponent);
      if (games.length < MIN_DEFENSE_GAMES) return null;
      const pos = posGroup(line.position);
      const scale: Partial<Record<Part, number>> = {};
      for (const p of PART_LIST) {
        const lg = t.league(pos, p);
        const allowed = games.reduce((a, g) => a + (g.sums.get(`${pos}|${p}`) ?? 0), 0) / games.length;
        scale[p] = lg > 0 ? allowed / lg : 1;
      }
      return { window: 'recent', scale };
    });
  },
};
