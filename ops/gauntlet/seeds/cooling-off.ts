// Cooling off. When a player's last 3 games ran above his season average for the stat, the projection from the whole
// season, equal weight: hot runs come back to the mean. When they did not, it has nothing to say and stays silent, as
// it does with fewer than 4 games this season.
import type { Seed } from '../contract';
import { speakFromProjection, statValue } from './projection';
import { mean } from './shared';

/** From the README: the same games on record as hot hand. */
const MIN_GAMES = 4;

export const coolingOff: Seed = {
  id: 'cooling_off',
  name: 'Cooling off',
  read: (world) => speakFromProjection(world, (line, proj) => {
    const now = proj.history(line.playerId).now;
    if (now.length < MIN_GAMES) return null;
    const season = mean(now.map((l) => statValue(l, line.betType)));
    const last3 = mean(now.slice(-3).map((l) => statValue(l, line.betType)));
    return last3 > season ? { window: 'season' } : null;
  }),
};
