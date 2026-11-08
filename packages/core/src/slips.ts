// Slip rules (docs/prd.md F3.1, F3.2, F3.6): the lose it all chance, the payout, the sportsbook slip link and
// the guardrail reminders. Pure: pages, actions and jobs import these, never re-derive them.

export const SLIP_STATES = ['draft', 'assessed', 'sent', 'placed'] as const;
export type SlipState = (typeof SLIP_STATES)[number];

/** suggested: something (the Jeweler) built it and its appraisal covers it. own: the user built or changed it. */
export const SLIP_PLAYS = ['suggested', 'own'] as const;
export type SlipPlay = (typeof SLIP_PLAYS)[number];

export interface ChanceLeg {
  gameId: string;
  /** Our hit chance; null when the leg has no current read. */
  hitChance: number | null;
}

export interface LoseItAll {
  /** The chance every leg hits; null when correlated or a leg has no read. */
  allHit: number | null;
  /** 1 - product(hit chances); null when correlated or a leg has no read. Never estimated. */
  value: number | null;
  /** Two or more legs share a game, so their chances are not independent. */
  correlated: boolean;
  /** Games with more than one leg. */
  sameGame: string[];
}

/**
 * The chance of losing the whole stake: 1 - p1 * p2 * ... for legs from different games only (F3.2). Same game
 * legs move together, so the result is null with the correlated flag: never a number for correlated legs.
 */
export function loseItAll(legs: readonly ChanceLeg[]): LoseItAll {
  const counts = new Map<string, number>();
  for (const l of legs) counts.set(l.gameId, (counts.get(l.gameId) ?? 0) + 1);
  const sameGame = [...counts].filter(([, n]) => n > 1).map(([g]) => g);
  if (sameGame.length) return { allHit: null, value: null, correlated: true, sameGame };
  if (!legs.length || legs.some((l) => l.hitChance == null || !(l.hitChance >= 0 && l.hitChance <= 1))) {
    return { allHit: null, value: null, correlated: false, sameGame };
  }
  const allHit = legs.reduce((p, l) => p * l.hitChance!, 1);
  return { allHit, value: 1 - allHit, correlated: false, sameGame };
}

/** The parlay's decimal price: every leg's decimal price multiplied. */
export function parlayPrice(prices: readonly number[]): number | null {
  if (!prices.length || prices.some((p) => !(p > 1))) return null;
  return prices.reduce((a, p) => a * p, 1);
}

/** What the slip pays back when every leg hits, stake included, to the cent. */
export function slipPayout(stake: number | null, prices: readonly number[]): number | null {
  const price = parlayPrice(prices);
  if (price == null || stake == null || !(stake > 0)) return null;
  return Math.round(stake * price * 100) / 100;
}

/** The largest stake the app accepts; input validation, not a usual range. */
export const MAX_STAKE = 100_000;

/** A stake typed by a person ("15", "$15.00", "12.5") in dollars to the cent, or null when it is not one. */
export function parseStake(input: unknown): number | null {
  const raw = typeof input === 'number' ? String(input) : typeof input === 'string' ? input.trim().replace(/^\$/, '').replaceAll(',', '') : '';
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 && n <= MAX_STAKE ? n : null;
}

// ---------------------------------------------------------------- Sportsbook slip links (F3.6)

export interface LinkLeg { link: string | null }

export interface SlipLink {
  /** Opens the book's bet slip with every linked leg added; null when no leg has a link. */
  url: string | null;
  /** Legs with no usable link, by index: add them in the book by hand. */
  missing: number[];
}

const DRAFTKINGS_HOST = 'sportsbook.draftkings.com';

/** The raw (still percent-encoded) outcome ids in a DraftKings link, or null when it is not one. */
function draftKingsOutcomes(link: string): { path: string; ids: string[] } | null {
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== DRAFTKINGS_HOST) return null;
  // Read the query raw: outcome ids carry %23 for # and are joined with a literal +, which URLSearchParams would turn into spaces.
  const param = url.search.slice(1).split('&').find((p) => p.startsWith('outcomes='));
  const ids = param?.slice('outcomes='.length).split('+').filter((id) => /^[A-Za-z0-9%_.-]+$/.test(id)) ?? [];
  return ids.length ? { path: url.pathname, ids } : null;
}

/**
 * One link that opens the book's bet slip with every leg (docs/prd.md F3.6). DraftKings joins outcome ids with +;
 * the event in the path is the first leg's and does not limit the others. The link only adds picks: it never
 * places a bet. Book agnostic by signature; DraftKings is the only adapter.
 */
export function buildSlipLink(book: string, legs: readonly LinkLeg[]): SlipLink {
  if (book !== 'draftkings') return { url: null, missing: legs.map((_, i) => i) };
  const missing: number[] = [];
  const ids: string[] = [];
  let path: string | null = null;
  legs.forEach((leg, i) => {
    const parsed = leg.link ? draftKingsOutcomes(leg.link) : null;
    if (!parsed) { missing.push(i); return; }
    path ??= parsed.path;
    for (const id of parsed.ids) if (!ids.includes(id)) ids.push(id);
  });
  if (!ids.length) return { url: null, missing };
  return { url: `https://${DRAFTKINGS_HOST}${path ?? '/'}?outcomes=${ids.join('+')}`, missing };
}

// ---------------------------------------------------------------- Guardrails (F3.1)

/** Legs priced under this decimal price get a reminder. */
export const SHORT_PRICE = 2.5;

export interface ReminderLeg {
  price: number;
  marketId: string;
  /** The prop's line; anytime TD has none. An over 1.5 TD line needs two touchdowns. */
  line: number | null;
}

export type Reminder =
  | { kind: 'short-price'; leg: number }
  | { kind: 'multi-td'; leg: number }
  | { kind: 'stake'; side: 'below' | 'above' };

/** Touchdowns a leg needs to hit: one for anytime TD, more for an over line (1.5 needs 2). */
export function touchdownsNeeded(leg: Pick<ReminderLeg, 'line'>): number {
  return leg.line == null ? 1 : Math.floor(leg.line) + 1;
}

/**
 * Reminders, never blocks (F3.1): legs under 2.5, props that need two or more touchdowns, and a stake outside the
 * usual range. Nobody has set a usual range yet, so the stake reminder stays off until one is passed in.
 */
export function slipReminders(legs: readonly ReminderLeg[], stake: number | null, usualStake?: { min: number; max: number }): Reminder[] {
  const out: Reminder[] = [];
  legs.forEach((l, leg) => {
    if (l.price < SHORT_PRICE) out.push({ kind: 'short-price', leg });
    if (l.marketId === 'anytime_td' && touchdownsNeeded(l) >= 2) out.push({ kind: 'multi-td', leg });
  });
  if (usualStake && stake != null) {
    if (stake < usualStake.min) out.push({ kind: 'stake', side: 'below' });
    else if (stake > usualStake.max) out.push({ kind: 'stake', side: 'above' });
  }
  return out;
}
