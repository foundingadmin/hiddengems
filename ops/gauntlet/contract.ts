// The gauntlet contract. MOD7 walks forward from 2025 Week 1 to 2026 Week 8 holding ten seeds, and the only thing it
// may change each week is how much it trusts each seed. Three builds code against these types, in parallel:
//
//   1. Loader   ops/gauntlet/world.ts     openWeek(ref) and reveal(ref, picks) over the owned capsules and nflverse
//   2. Seeds    ops/gauntlet/seeds/*.ts   the ten seeds, each a pure read of one WeekWorld
//   3. Learner  ops/gauntlet/learner.ts   blend, pick, score and reweight, plus run.ts and the report
//
// The wall: a WeekWorld holds only what existed when that week's board was taken. Results, closing prices and box
// scores for the week arrive only through reveal(), which takes the week's picks first and records them before it
// answers. Nothing in this folder may read experiments/mods/sealed, experiments/mods/runs or any graded outcome.

/** Seasons the gauntlet walks. 2025 is fully owned (Weeks 1 to 18), 2026 Weeks 1 to 8. */
export type Season = 2025 | 2026;
export interface WeekRef { season: Season; week: number }

/** The four yardage bet types bought for both seasons. Overs only. */
export const BET_TYPES = ['rush_yds', 'reception_yds', 'pass_yds', 'rush_reception_yds'] as const;
export type BetType = (typeof BET_TYPES)[number];

/** One DraftKings over, main or alt, as posted on the board. The unit every seed speaks to. */
export interface Line {
  /** `${season}|${gameId}|${playerId}|${betType}|${line}`, stable across board, close and reveal. */
  key: string;
  gameId: string;
  playerId: string;
  player: string;
  team: string;
  opponent: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | string;
  betType: BetType;
  alt: boolean;
  /** The over's threshold, e.g. 59.5 or 60 (alt rungs are "60+"). */
  line: number;
  /** DraftKings decimal price for the over. */
  price: number;
  /** DraftKings' own chance for the over with its cut removed. The market's read, and every seed's fallback. */
  fair: number;
}

/** Any book's quote on any yardage line at a snapshot. Books disagree and ladder math read these. */
export interface Quote { book: string; gameId: string; playerId: string; betType: BetType; alt: boolean; side: 'over' | 'under'; line: number; price: number }

export interface Game { gameId: string; kickoff: Date; home: string; away: string; boardAt: Date; roof: string | null }

/** One player's finished game, from nflverse, only for games before this week's board. */
export interface GameLog {
  /** 2024 games feed the logs too (every season owned), though the gauntlet walks only 2025 and 2026. */
  season: Season | 2024; week: number; gameId: string; playerId: string; name: string; team: string; opponent: string; position: string;
  rushYds: number; recYds: number; passYds: number; carries: number; targets: number; receptions: number; routes: number | null;
  snapPct: number | null; fantasyPoints: number;
}

export interface Injury { playerId: string; name: string; team: string; position: string; status: 'Out' | 'Doubtful' | 'Questionable' | null; practice: string | null }
export interface DepthRow { team: string; playerId: string; name: string; position: string; rank: number }

/** Everything that existed by this week's board. The only thing a seed may read. */
export interface WeekWorld {
  ref: WeekRef;
  games: Game[];
  /** DraftKings yardage overs on the board. */
  lines: Line[];
  /** Every book's yardage quotes at the board. */
  board: Quote[];
  /** Every book's quotes 3 days before the board, or null where none were bought or posted. */
  early: Quote[] | null;
  /** Spread and total from the board, home team's view. */
  scripts: Map<string, { homeSpread: number; total: number }>;
  /** All finished games before the board, this season and every earlier season owned (2024 on). */
  logs: GameLog[];
  /** Each team's final injury report before the board. */
  injuries: Injury[];
  /** Last depth chart before the board, and the one before last week's board. */
  depth: DepthRow[];
  depthPrev: DepthRow[];
}

/** What Monday tells the MOD, only after its picks are recorded. */
export interface Reveal {
  ref: WeekRef;
  /** Every board line's result: the stat he put up and whether the over hit, or null when he did not play (refund). */
  outcomes: Map<string, { value: number; hit: boolean } | null>;
  /** DraftKings' closing price for each board line that was still posted at the close. */
  close: Map<string, number>;
}

export const SEED_IDS = ['books_disagree', 'usage', 'next_man_up', 'game_script', 'matchup', 'follow_the_move', 'ladder_math', 'hot_hand', 'cooling_off', 'hidden_gems'] as const;
export type SeedId = (typeof SEED_IDS)[number];

/**
 * A seed reads one WeekWorld and returns its own chance for the over on the lines it has an opinion about.
 * Lines it leaves out are silent and count as DraftKings' fair chance. Rules for every seed:
 * - Pure: same world in, same chances out. No network, no clock, no files beyond the world.
 * - Raw: no edge floors, thresholds or sizes fitted to any week. Constants are declared in the seed file with the
 *   football reason for them, never chosen by looking at results.
 * - Honest silence: if the seed has nothing to say about a line, it leaves it out rather than echoing fair.
 */
export interface Seed {
  id: SeedId;
  name: string;
  read(world: WeekWorld): Map<string, number>;
}

/** Trust shares. Each set adds to 1. Bet types start at the shared set. */
export interface Weights { shared: Record<SeedId, number>; byBetType: Record<BetType, Record<SeedId, number>> }

export interface Pick { key: string; line: Line; chance: number; edge: number; contributions: Record<SeedId, number> }

/** The frozen rules (ops/gauntlet/rules.json), hashed before the first run. */
export interface Rules {
  frozen: boolean;
  /** The MOD these rules are, e.g. "MOD8". Left out for MOD7, whose rules.json predates the field. */
  mod?: string;
  /** Where the seeded batch generator drew these rules from (ops/gauntlet/batch.ts). */
  generator?: { seed: number; draw: number };
  /** Starting trust shares, adding to 1, the same for the shared set and every bet type. Left out: 10% each. */
  startWeights?: Record<SeedId, number>;
  /**
   * A seed whose chances have only ever sat at or below fair (every line it has spoken on so far, this Saturday's
   * board included) can push a line down but never up, so it can block a pick but never lead one, and it is left out
   * of the two heaviest seeds the top seeds check counts. Off or left out: every seed blends the same way.
   */
  vetoAsFilter?: boolean;
  /** A seed's push away from fair is scaled by its graded lines spoken in that bet type / (those lines + poolingLines). */
  capByLines?: boolean;
  /**
   * Each seed's chance is shrunk toward fair by its own track record before the blend: logit(fair) + k times its
   * log odds gap from fair, with k the value on 0, 0.05 ... 1 that gave the lowest log loss on every graded line the
   * seed has spoken on in that bet type so far. Every k starts at 0, so a seed moves nothing until its own past lines
   * show its gaps were real. How far a seed can move a pick then matches how far it has been right.
   */
  calibrate?: boolean;
  picksPerWeek: number;
  minPrice: number;
  maxPrice: number;
  perPlayer: number;
  /** Largest relative change to any weight in one week. */
  maxStep: number;
  /** Lines a bet type needs before its own evidence counts as much as the shared set. */
  poolingLines: number;
  warmup: WeekRef[];
  stake: number;
  purse: number;
  pass: { luckBandSd: number; beatCloseShare: number; bothSeasons: boolean; topSeedsShare: number };
}
