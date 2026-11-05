// The market catalog. Ids are ours; providers map their own keys onto them in their adapters.
// This season covers anytime TD only (docs/build-brief.md): the free odds plan prices TD props only.

export type Side = 'yes';

export interface Market {
  id: string;
  label: string;
}

export const MARKETS = [{ id: 'anytime_td', label: 'Anytime TD scorer' }] as const satisfies readonly Market[];

export type MarketId = (typeof MARKETS)[number]['id'];

const byId = new Map<string, Market>(MARKETS.map((m) => [m.id, m]));
export function marketById(id: string): Market | undefined {
  return byId.get(id);
}

/** How a row names the bet, short: the prop is the gem, so every gem shows it. */
const BETS: Record<MarketId, string> = { anytime_td: 'Anytime TD' };
export function betLabel(id: string): string {
  return BETS[id as MarketId] ?? marketById(id)?.label ?? id;
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
