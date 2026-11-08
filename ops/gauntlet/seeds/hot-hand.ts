// Hot hand. The projection from the last 3 games alone, equal weight: whatever he did lately is who he is now.
// Silent with fewer than 4 games this season (3 games against a season of 3 is no comparison).
import type { Seed } from '../contract';
import { speakFromProjection } from './projection';

/** From the README: last 3 games against a season needs a 4th game for the season to say anything else. */
const MIN_GAMES = 4;

export const hotHand: Seed = {
  id: 'hot_hand',
  name: 'Hot hand',
  read: (world) => speakFromProjection(world, (line, proj) => (proj.history(line.playerId).now.length < MIN_GAMES ? null : { window: 'last3' })),
};
