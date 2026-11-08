// The market catalog. Ids are ours; providers map their own keys onto them in their adapters.
// Anytime TD plus three stat ladders (Nov 7 2026): receptions, receiving yards and rushing yards at every
// line a book hangs, over side only, since the plus-money rungs are where Josh's 2.50 to 5.00 range lives.

/** yes for one-sided props (anytime TD), over for a stat line. */
export type Side = 'yes' | 'over';

export interface Market {
  id: string;
  label: string;
}

export const MARKETS = [
  { id: 'anytime_td', label: 'Anytime TD scorer' },
  { id: 'receptions', label: 'Receptions' },
  { id: 'receiving_yds', label: 'Receiving yards' },
  { id: 'rushing_yds', label: 'Rushing yards' },
] as const satisfies readonly Market[];

export type MarketId = (typeof MARKETS)[number]['id'];

const byId = new Map<string, Market>(MARKETS.map((m) => [m.id, m]));
export function marketById(id: string): Market | undefined {
  return byId.get(id);
}

/** Stat markets: the box score stat each one counts. */
export type StatKey = 'receptions' | 'receivingYards' | 'rushingYards';
export const STAT_MARKETS: Record<Exclude<MarketId, 'anytime_td'>, { stat: StatKey; unit: string; short: string }> = {
  receptions: { stat: 'receptions', unit: 'receptions', short: 'rec' },
  receiving_yds: { stat: 'receivingYards', unit: 'receiving yards', short: 'rec yds' },
  rushing_yds: { stat: 'rushingYards', unit: 'rushing yards', short: 'rush yds' },
};
export type StatMarketId = keyof typeof STAT_MARKETS;
export const isStatMarket = (id: string): id is StatMarketId => id in STAT_MARKETS;

/** The count a stat line needs: over 4.5 needs 5. */
export const statNeeded = (line: number): number => Math.floor(line) + 1;

/**
 * How a row names the bet, short: the prop is the gem, so every gem shows it. Stat lines read the way the
 * book shows the rung ("5+ receptions" for over 4.5); a stat market without its line falls back to the label.
 */
export function betLabel(id: string, line?: number | null): string {
  if (id === 'anytime_td') return 'Anytime TD';
  if (isStatMarket(id) && line != null) return `${statNeeded(line)}+ ${STAT_MARKETS[id].unit}`;
  return marketById(id)?.label ?? id;
}

/** The sportsbooks Hidden Gems compares. Ids are ours; adapters map provider keys onto them. */
export const BOOKS = [
  { id: 'draftkings', name: 'DraftKings' },
  { id: 'fanduel', name: 'FanDuel' },
  { id: 'betmgm', name: 'BetMGM' },
  { id: 'caesars', name: 'Caesars' },
  { id: 'fanatics', name: 'Fanatics' },
] as const;
export type BookId = (typeof BOOKS)[number]['id'];

/** Where Josh buys. Its price is the posted price a gem must beat; other books inform the appraisal. */
export const PURCHASE_BOOK: BookId = 'draftkings';
