// The Odds API, v4 (https://the-odds-api.com/liveapi/guides/v4/). Prices player props from US books.
// Event lists are free; each event odds call costs (markets x regions) credits, read from the
// x-requests-used and x-requests-remaining headers into provider_usage.
import type { BookId, MarketId, Side } from '@hiddengems/core';
import { z } from 'zod';
import { ours } from '../errors';
import type { OddsEvent, OddsProvider, OddsQuote, ProviderContext } from './types';

const BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl';

const MARKET_KEYS: Record<MarketId, string> = {
  anytime_td: 'player_anytime_td',
  first_td: 'player_1st_td',
  last_td: 'player_last_td',
  receptions: 'player_receptions',
  receiving_yards: 'player_reception_yds',
  rushing_yards: 'player_rush_yds',
  passing_yards: 'player_pass_yds',
  passing_tds: 'player_pass_tds',
};
const MARKET_IDS = Object.fromEntries(Object.entries(MARKET_KEYS).map(([id, key]) => [key, id as MarketId]));

const BOOK_KEYS: Record<BookId, string> = { draftkings: 'draftkings', fanduel: 'fanduel', betmgm: 'betmgm', caesars: 'williamhill_us' };
const BOOK_IDS = Object.fromEntries(Object.entries(BOOK_KEYS).map(([id, key]) => [key, id as BookId]));

const Event = z.object({ id: z.string(), commence_time: z.string(), home_team: z.string(), away_team: z.string() });
const Outcome = z.object({ name: z.string(), description: z.string().optional(), price: z.number(), point: z.number().optional() });
const EventOdds = z.object({
  id: z.string(),
  bookmakers: z.array(z.object({
    key: z.string(),
    last_update: z.string().optional(),
    markets: z.array(z.object({ key: z.string(), last_update: z.string().optional(), outcomes: z.array(Outcome) })),
  })),
});

function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const r = schema.safeParse(data);
  if (!r.success) throw ours('payload', `The Odds API ${what} no longer matches our adapter: ${r.error.issues[0]?.message ?? 'invalid'}`, { provider: 'odds-api' });
  return r.data;
}

const SIDES: Record<string, Side | undefined> = { yes: 'yes', over: 'over', under: 'under' };

export function normalizeEventOdds(payload: unknown): OddsQuote[] {
  const data = parse(EventOdds, payload, 'event odds');
  const quotes: OddsQuote[] = [];
  for (const book of data.bookmakers) {
    const bookId = BOOK_IDS[book.key];
    if (!bookId) continue;
    for (const market of book.markets) {
      const marketId = MARKET_IDS[market.key];
      if (!marketId) continue;
      const observedAt = new Date(market.last_update ?? book.last_update ?? Date.now());
      for (const o of market.outcomes) {
        const side = SIDES[o.name.toLowerCase()];
        if (!side || !(o.price > 1)) continue; // "No" sides and junk prices are skipped
        quotes.push({ bookId, marketId, playerName: o.description ?? null, side, line: o.point ?? null, priceDecimal: o.price, observedAt });
      }
    }
  }
  return quotes;
}

export function oddsApi(apiKey: string): OddsProvider {
  const key = encodeURIComponent(apiKey);
  return {
    id: 'odds-api',
    async events(ctx: ProviderContext): Promise<OddsEvent[]> {
      const data = parse(z.array(Event), await ctx.http.getJson(`${BASE}/events?apiKey=${key}&dateFormat=iso`), 'event list');
      return data.map((e) => ({ externalId: e.id, kickoff: new Date(e.commence_time), awayTeam: e.away_team, homeTeam: e.home_team }));
    },
    async eventOdds(ctx, event, markets) {
      const params = new URLSearchParams({
        regions: 'us', oddsFormat: 'decimal', dateFormat: 'iso',
        markets: markets.map((m) => MARKET_KEYS[m]).join(','),
        bookmakers: Object.values(BOOK_KEYS).join(','),
      });
      return normalizeEventOdds(await ctx.http.getJson(`${BASE}/events/${event.externalId}/odds?apiKey=${key}&${params}`));
    },
    usage(res) {
      const num = (h: string) => { const v = res.headers.get(h); return v == null ? null : Number(v); };
      const used = num('x-requests-used'), remaining = num('x-requests-remaining');
      return used == null && remaining == null ? null : { used, remaining };
    },
  };
}
