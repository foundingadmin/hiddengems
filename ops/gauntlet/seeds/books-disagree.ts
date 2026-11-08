// Books disagree. Every other book's chance for the same over at the same line, cut removed, and their median (MOD4's
// consensus with no margin, price band or market list). A book that shows the under at that line gives a two-way
// chance; one that shows only the over is cut by that book's own typical hold, measured from its two-way quotes on this
// board. Silent when fewer than 2 other books post the line.
import type { Quote, Seed, WeekWorld } from '../contract';
import { DK, clamp, median } from './shared';

/** From the README: one other book is an opinion, two make a consensus. */
const MIN_BOOKS = 2;

const at = (q: Quote) => `${q.gameId}|${q.playerId}|${q.betType}|${q.line}`;

/** Each book's median overround on its two-way yardage quotes in this world. */
export function bookHolds(quotes: Quote[]): Map<string, number> {
  const unders = new Map<string, Quote>();
  for (const q of quotes) if (q.side === 'under') unders.set(`${q.book}|${at(q)}|${q.alt}`, q);
  const holds = new Map<string, number[]>();
  for (const q of quotes) {
    if (q.side !== 'over') continue;
    const u = unders.get(`${q.book}|${at(q)}|${q.alt}`);
    if (u) holds.set(q.book, [...(holds.get(q.book) ?? []), 1 / q.price + 1 / u.price - 1]);
  }
  return new Map([...holds].map(([b, xs]) => [b, median(xs)]));
}

export const booksDisagree: Seed = {
  id: 'books_disagree',
  name: 'Books disagree',
  read(world: WeekWorld) {
    const others = world.board.filter((q) => q.book !== DK);
    const hold = bookHolds(others);
    const byLine = new Map<string, Quote[]>();
    for (const q of others) byLine.set(at(q), [...(byLine.get(at(q)) ?? []), q]);
    const out = new Map<string, number>();
    for (const l of world.lines) {
      const qs = byLine.get(`${l.gameId}|${l.playerId}|${l.betType}|${l.line}`) ?? [];
      const chances: number[] = [];
      for (const book of [...new Set(qs.map((q) => q.book))].sort()) {
        const mine = qs.filter((q) => q.book === book);
        const over = mine.find((q) => q.side === 'over' && q.alt === l.alt) ?? mine.find((q) => q.side === 'over');
        if (!over) continue;
        const under = mine.find((q) => q.side === 'under' && q.alt === over.alt) ?? mine.find((q) => q.side === 'under');
        if (under) chances.push((1 / over.price) / (1 / over.price + 1 / under.price));
        else if (hold.has(book)) chances.push((1 / over.price) / (1 + hold.get(book)!));
      }
      if (chances.length >= MIN_BOOKS) out.set(l.key, clamp(median(chances)));
    }
    return out;
  },
};
