// Where the backtest reads and writes. Raw provider responses live under cache/ and are never committed.
export const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
export const CACHE_DIR = `${ROOT}/experiments/backtest/cache`;
export const NFLVERSE_DIR = `${CACHE_DIR}/nflverse`;
export const ODDS_DIR = process.env.BACKTEST_ODDS_DIR ?? `${CACHE_DIR}/odds`;
export const PLAN_PATH = `${ROOT}/experiments/backtest/plan.json`;
export const LEDGER_DIR = process.env.BACKTEST_LEDGER_DIR ?? `${ROOT}/experiments/ledger`;
export const OUT_DIR = process.env.BACKTEST_OUT_DIR ?? `${ROOT}/experiments/backtest`;
export const SUMMARY_PATH = `${OUT_DIR}/results.json`;
export const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];
