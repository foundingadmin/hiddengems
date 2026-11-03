import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_GRACE_MINUTES, americanToDecimal, appraise, clarityScore, compareRecommended, decimalToAmerican, dueFreezes, dueSnapshot,
  fairChance, findTeam, gameId, gemRating, houseCut, impliedFromDecimal, nameKey, newGemReason, recommendedScore, selectionKey, zonedTimeToUtc,
  type Rankable,
} from '../src';

describe('odds', () => {
  it('converts between formats', () => {
    expect(impliedFromDecimal(3.2)).toBeCloseTo(0.3125);
    expect(americanToDecimal(220)).toBeCloseTo(3.2);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
    expect(decimalToAmerican(3.2)).toBe(220);
    expect(decimalToAmerican(1.5)).toBe(-200);
  });
  it('rejects impossible prices', () => {
    expect(() => impliedFromDecimal(1)).toThrow(RangeError);
    expect(() => americanToDecimal(50)).toThrow(RangeError);
  });
  it('assumes a cut of 5% plus 1% per point of odds, at most 35%', () => {
    expect(houseCut(2)).toBeCloseTo(0.07);
    expect(houseCut(10)).toBeCloseTo(0.15);
    expect(houseCut(40)).toBeCloseTo(0.35);
    expect(fairChance(2)).toBeCloseTo(0.5 * 0.93);
  });
});

describe('gem rating', () => {
  it('is edge times clarity: round(100 * clamp(carat / 10, 0, 1) * clarity / 100)', () => {
    expect(gemRating(10, 100)).toBe(100);
    expect(gemRating(5, 80)).toBe(40);
    expect(gemRating(25, 70)).toBe(70); // carat caps at 10 points
    expect(gemRating(0, 90)).toBe(0);
    expect(gemRating(-3, 90)).toBe(0);
    expect(gemRating(7.4, 63)).toBe(47);
  });

  it('rates a prop that clears the posted price', () => {
    // posted 3.20 is 31.25% implied; fair is 31.25 x (1 - 0.082) = 28.69%
    const r = appraise({ hitChance: 0.4, price: 3.2, clarity: 80, hasStats: true });
    expect(r.kind).toBe('gem');
    expect(r.gapToPosted).toBeCloseTo(8.75);
    expect(r.carat).toBeCloseTo(11.31, 1);
    expect(r.rating).toBe(80);
  });

  it("calls it Fool's Gold when it beats the fair price but not the posted price", () => {
    const r = appraise({ hitChance: 0.3, price: 3.2, clarity: 90, hasStats: true });
    expect(r.carat).toBeGreaterThan(0);
    expect(r.gapToPosted).toBeLessThan(0);
    expect(r).toMatchObject({ kind: 'fools-gold', rating: null });
  });

  it('is no gem when it beats neither price', () => {
    expect(appraise({ hitChance: 0.2, price: 3.2, clarity: 90, hasStats: true })).toMatchObject({ kind: 'none', rating: null });
  });

  it('gives no rating without 2026 stats, however good the price', () => {
    expect(appraise({ hitChance: 0.6, price: 3.2, clarity: 90, hasStats: false })).toMatchObject({ kind: 'unrated', rating: null });
  });

  it('scores clarity out of 100 from its four capped parts', () => {
    expect(clarityScore({ sample: 40, consistency: 30, booksAgree: 15, setup: 15 })).toBe(100);
    expect(clarityScore({ sample: 55, consistency: -4, booksAgree: 10, setup: 10 })).toBe(60);
  });
});

describe('Recommended order', () => {
  const g = (kind: Rankable['kind'], hitChance: number, clarity: number, rating: number | null = null): Rankable => ({ kind, hitChance, clarity, rating });

  it('scores gems by hit chance times clarity', () => {
    expect(recommendedScore(g('gem', 0.5, 80))).toBeCloseTo(0.4);
    expect(recommendedScore(g('fools-gold', 0.5, 80))).toBeNull();
  });

  it("puts the likeliest real gem first and Fool's Gold last", () => {
    const list = [
      g('fools-gold', 0.6, 90),
      g('gem', 0.3, 90, 70), // 0.27
      g('unrated', 0.7, 0),
      g('gem', 0.5, 60, 55), // 0.30
      g('gem', 0.2, 100, 90), // 0.20: a higher rating does not outrank a likelier gem
    ];
    const sorted = [...list].sort(compareRecommended);
    expect(sorted.map((x) => [x.kind, x.hitChance])).toEqual([
      ['gem', 0.5], ['gem', 0.3], ['gem', 0.2], ['unrated', 0.7], ['fools-gold', 0.6],
    ]);
  });
});

describe('snapshot schedule', () => {
  const denver = (date: string, time: string) => zonedTimeToUtc(date, time, 'America/Denver');

  it('converts Denver wall time across daylight saving', () => {
    expect(denver('2026-11-07', '19:47').toISOString()).toBe('2026-11-08T02:47:00.000Z');
    expect(denver('2026-10-31', '19:47').toISOString()).toBe('2026-11-01T01:47:00.000Z');
  });

  it('is due right after its time, once, and never late', () => {
    const at = denver('2026-11-07', '19:47');
    const plus = (m: number) => new Date(at.getTime() + m * 60_000);
    expect(dueSnapshot(plus(-1), new Set())).toBeNull();
    expect(dueSnapshot(plus(3), new Set())).toMatchObject({ slot: 'sat:2026-11-07', horizonDays: 4 });
    expect(dueSnapshot(plus(3), new Set(['sat:2026-11-07']))).toBeNull();
    expect(dueSnapshot(plus(SNAPSHOT_GRACE_MINUTES + 1), new Set())).toBeNull();
  });

  it('knows the Sunday and opening snapshots', () => {
    expect(dueSnapshot(new Date(denver('2026-11-08', '08:43').getTime() + 60_000), new Set())?.slot).toBe('sun:2026-11-08');
    expect(dueSnapshot(new Date(denver('2026-11-03', '10:07').getTime() + 60_000), new Set())?.slot).toBe('open:2026-11-03');
  });

  it('is quiet the rest of the week', () => {
    let pulls = 0;
    const taken = new Set<string>();
    const start = denver('2026-11-02', '00:00').getTime();
    for (let t = start; t < start + 7 * 86_400_000; t += 5 * 60_000) {
      const due = dueSnapshot(new Date(t), taken);
      if (due) { taken.add(due.slot); pulls++; }
    }
    expect(pulls).toBe(3);
  });

  it('freezes each game once, just before kickoff', () => {
    const kickoff = new Date('2026-11-08T18:00:00Z');
    const games = [{ id: '2026-11-08-mia-buf', kickoff }, { id: 'late', kickoff: new Date('2026-11-08T21:25:00Z') }];
    expect(dueFreezes(new Date('2026-11-08T17:30:00Z'), games, new Set())).toEqual([]);
    expect(dueFreezes(new Date('2026-11-08T17:45:00Z'), games, new Set()).map((g) => g.id)).toEqual(['2026-11-08-mia-buf']);
    expect(dueFreezes(new Date('2026-11-08T17:45:00Z'), games, new Set(['freeze:2026-11-08-mia-buf']))).toEqual([]);
    expect(dueFreezes(new Date('2026-11-08T18:01:00Z'), games, new Set())).toEqual([]);
  });
});

describe('identity', () => {
  it('names games by Eastern date and teams', () => {
    expect(gameId(new Date('2026-11-09T01:20:00Z'), 'buf', 'kc')).toBe('2026-11-08-buf-kc');
  });
  it('keys selections', () => {
    expect(selectionKey({ gameId: 'g', marketId: 'anytime_td', playerId: 'p', side: 'yes', line: null })).toBe('g:anytime_td:p:yes:-');
  });
  it('matches names across providers', () => {
    expect(nameKey("D'Andre Swift Jr.")).toBe(nameKey('Dandre Swift'));
    expect(nameKey('Ollie Gordon II')).toBe(nameKey('Ollie Gordon'));
  });
  it('resolves teams from the Facet kit', () => {
    expect(findTeam('Kansas City Chiefs')?.id).toBe('kc');
    expect(findTeam('JAC')?.id).toBe('jax');
  });
});

describe('new gems', () => {
  it('surfaces a gem that crosses 90 until it is read', () => {
    expect(newGemReason(92, null)).toEqual({ kind: 'crossed', from: 92 });
    expect(newGemReason(92, { foundRating: 92, readRating: null })).toMatchObject({ kind: 'crossed' });
    expect(newGemReason(93, { foundRating: 92, readRating: 92 })).toBeNull();
    expect(newGemReason(91, { foundRating: 70, readRating: 85 })).toEqual({ kind: 'crossed', from: 85 });
  });
  it('surfaces a jump of 15 or more since it was found or read', () => {
    expect(newGemReason(88, { foundRating: 71, readRating: null })).toEqual({ kind: 'jumped', from: 71 });
    expect(newGemReason(80, { foundRating: 71, readRating: null })).toBeNull();
    expect(newGemReason(75, { foundRating: 40, readRating: 60 })).toEqual({ kind: 'jumped', from: 60 });
  });
  it('never surfaces a prop without a rating', () => {
    expect(newGemReason(null, null)).toBeNull();
  });
});
