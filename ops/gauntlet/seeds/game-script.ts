// Game script. The projection shifted by the team's implied points and its run or pass lean, from the spread and total
// on the board. Speaks for every player with a projection whose game has a spread and total posted.
import type { Seed } from '../contract';
import { speakFromProjection } from './projection';
import { teamScript } from './shared';

/** Yards move about half as fast as points: points also come from field position, turnovers and red zone finishing. */
const YARDS_PER_POINTS = 0.5;
/** Leaders run to bleed the clock and trailers throw to catch up: each point of expected margin moves about 1% of the work. */
const RUN_LEAN_PER_POINT = 0.01;

export const gameScript: Seed = {
  id: 'game_script',
  name: 'Game script',
  read(world) {
    const implied = world.games.flatMap((g) => [teamScript(world, g.gameId, g.home), teamScript(world, g.gameId, g.away)])
      .filter((s) => s != null).map((s) => s.implied);
    const avg = implied.reduce((a, b) => a + b, 0) / (implied.length || 1);
    return speakFromProjection(world, (line) => {
      const s = teamScript(world, line.gameId, line.team);
      if (!s || !(avg > 0) || !(s.implied > 0)) return null;
      const points = (s.implied / avg) ** YARDS_PER_POINTS;
      const lean = RUN_LEAN_PER_POINT * s.margin;
      return { window: 'recent', scale: { rush: points * (1 + lean), rec: points * (1 - lean), pass: points * (1 - lean) } };
    });
  },
};
