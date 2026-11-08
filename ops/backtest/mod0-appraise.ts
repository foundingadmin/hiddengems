// MOD0: the gem rules as they were before PR 51 (packages/core/src/gems.ts at 99590a7), kept only so the
// backtest can replay them. A gem at any edge over the posted price, any price, no injury or roster blocks.
// The rating, fair price and cut are still core's; only the gate is the retired one.
import { type GemRead, fairChance, gemRating, impliedFromDecimal } from '../../packages/core/src/index';

export function appraiseMod0({ hitChance, price, clarity, hasStats }: { hitChance: number; price: number; clarity: number; hasStats: boolean }): GemRead {
  const priced = impliedFromDecimal(price);
  const fair = fairChance(price);
  const carat = (hitChance - fair) * 100;
  const gapToPosted = (hitChance - priced) * 100;
  const base = { carat, gapToPosted, fair, priced };
  if (!hasStats) return { kind: 'unrated', rating: null, ...base };
  if (gapToPosted > 0) return { kind: 'gem', rating: gemRating(carat, clarity), ...base };
  return { kind: carat > 0 ? 'fools-gold' : 'none', rating: null, ...base };
}
