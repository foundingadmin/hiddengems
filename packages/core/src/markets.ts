// The market catalog. Ids are ours; providers map their own keys onto them in their adapters.

export type MarketKind = 'binary' | 'over_under';
export type Side = 'yes' | 'over' | 'under';

export interface Market {
  id: string;
  label: string;
  kind: MarketKind;
  /** A player market (anytime TD) or a game market (spread, total). */
  scope: 'player' | 'game';
}

export const MARKETS = [
  { id: 'anytime_td', label: 'Anytime TD scorer', kind: 'binary', scope: 'player' },
  { id: 'first_td', label: 'First TD scorer', kind: 'binary', scope: 'player' },
  { id: 'last_td', label: 'Last TD scorer', kind: 'binary', scope: 'player' },
  { id: 'receptions', label: 'Receptions', kind: 'over_under', scope: 'player' },
  { id: 'receiving_yards', label: 'Receiving yards', kind: 'over_under', scope: 'player' },
  { id: 'rushing_yards', label: 'Rushing yards', kind: 'over_under', scope: 'player' },
  { id: 'passing_yards', label: 'Passing yards', kind: 'over_under', scope: 'player' },
  { id: 'passing_tds', label: 'Passing TDs', kind: 'over_under', scope: 'player' },
] as const satisfies readonly Market[];

export type MarketId = (typeof MARKETS)[number]['id'];

const byId = new Map<string, Market>(MARKETS.map((m) => [m.id, m]));
export function marketById(id: string): Market | undefined {
  return byId.get(id);
}

/** The sportsbooks Hidden Gems compares. Ids are ours; adapters map provider keys onto them. */
export const BOOKS = [
  { id: 'draftkings', name: 'DraftKings' },
  { id: 'fanduel', name: 'FanDuel' },
  { id: 'betmgm', name: 'BetMGM' },
  { id: 'caesars', name: 'Caesars' },
] as const;
export type BookId = (typeof BOOKS)[number]['id'];
