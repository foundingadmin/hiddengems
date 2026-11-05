// Walk-forward backtest of model v3.0 (docs/prd.md goal 2 and section 11): for each completed week from Week 4,
// every player game's stats chance from only the weeks before it, scored by Brier against whether he scored.
// It scores the stats side the constants were fit on (statsChance with implied points); past prices are not
// part of it. No I/O: the backtest job hands it the season's usage, the schedule's lines and the results.
import { type GameLine, MODEL_V3, type UsageGame, impliedFactor, leagueRates, playerForms, statsChance } from './model';

export const BACKTEST = {
  /** Weeks 4 to 8 of 2026 with implied points (section 11.8): the score to stay at or under. */
  baseline: 0.136,
  /** The first week scored: three weeks of history before it. */
  firstWeek: 4,
} as const;

export interface BacktestWeek {
  week: number;
  /** Player games scored: those with at least one earlier game this season. */
  games: number;
  brier: number;
}

export interface BacktestResult {
  model: string;
  baseline: number;
  weeks: BacktestWeek[];
  games: number;
  /** Mean Brier over every player game scored; null when nothing was scored. */
  brier: number | null;
  /** Brier minus the baseline; above zero is worse. */
  delta: number | null;
  aboveBaseline: boolean;
}

export interface BacktestInput {
  /** Every player game this season: the model's inputs, and the games to score. */
  logs: readonly UsageGame[];
  lines: readonly GameLine[];
  /** Weeks to score, completed ones only. Default: every week in logs from BACKTEST.firstWeek. */
  weeks?: readonly number[];
  /** Whether he scored in that game. Default: his usage touchdowns. */
  scored?: (game: UsageGame) => boolean;
}

/** Brier score: the mean squared gap between each chance and what happened (1 or 0). Lower is better. */
export function brierScore(pairs: readonly { chance: number; hit: boolean }[]): number | null {
  if (!pairs.length) return null;
  return pairs.reduce((s, p) => s + (p.chance - (p.hit ? 1 : 0)) ** 2, 0) / pairs.length;
}

/** Each player game's stats chance in week W, read from weeks before W only, with his team's implied points. */
export function weekReads(logs: readonly UsageGame[], lines: readonly GameLine[], week: number): { game: UsageGame; chance: number }[] {
  const before = logs.filter((g) => g.week < week);
  if (!before.length) return [];
  const forms = playerForms(before, leagueRates(before));
  const lineBy = new Map(lines.map((l) => [l.gameId, l]));
  const out: { game: UsageGame; chance: number }[] = [];
  for (const game of logs) {
    if (game.week !== week) continue;
    const form = forms.get(game.playerId);
    if (!form) continue;
    const line = lineBy.get(game.gameId);
    const factor = line ? impliedFactor(line, game.team, lines)?.factor : undefined;
    out.push({ game, chance: statsChance(form, factor).chance });
  }
  return out;
}

/** The walk-forward backtest: per-week and overall Brier, player games scored, and the gap to the baseline. */
export function walkForward(input: BacktestInput): BacktestResult {
  const scored = input.scored ?? ((g: UsageGame) => g.touchdowns > 0);
  const weeks = [...new Set(input.weeks ?? input.logs.map((g) => g.week))].filter((w) => w >= BACKTEST.firstWeek).sort((a, b) => a - b);
  const all: { chance: number; hit: boolean }[] = [];
  const perWeek: BacktestWeek[] = [];
  for (const week of weeks) {
    const pairs = weekReads(input.logs, input.lines, week).map(({ game, chance }) => ({ chance, hit: scored(game) }));
    const brier = brierScore(pairs);
    if (brier === null) continue;
    perWeek.push({ week, games: pairs.length, brier });
    all.push(...pairs);
  }
  const brier = brierScore(all);
  const delta = brier === null ? null : brier - BACKTEST.baseline;
  return { model: MODEL_V3, baseline: BACKTEST.baseline, weeks: perWeek, games: all.length, brier, delta, aboveBaseline: delta !== null && delta > 0 };
}
