// The ten seeds, in SEED_IDS order. Each is a pure read of one WeekWorld (ops/gauntlet/contract.ts).
import { SEED_IDS, type Seed, type SeedId } from '../contract';
import { booksDisagree } from './books-disagree';
import { coolingOff } from './cooling-off';
import { followTheMove } from './follow-the-move';
import { gameScript } from './game-script';
import { hiddenGems } from './hidden-gems';
import { hotHand } from './hot-hand';
import { ladderMath } from './ladder-math';
import { matchup } from './matchup';
import { nextManUp } from './next-man-up';
import { usage } from './usage';

export { booksDisagree, coolingOff, followTheMove, gameScript, hiddenGems, hotHand, ladderMath, matchup, nextManUp, usage };

const BY_ID: Record<SeedId, Seed> = {
  books_disagree: booksDisagree, usage, next_man_up: nextManUp, game_script: gameScript, matchup,
  follow_the_move: followTheMove, ladder_math: ladderMath, hot_hand: hotHand, cooling_off: coolingOff, hidden_gems: hiddenGems,
};

export const SEEDS: Seed[] = SEED_IDS.map((id) => BY_ID[id]);
