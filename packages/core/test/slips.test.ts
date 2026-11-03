import { describe, expect, it } from 'vitest';
import { SHORT_PRICE, buildSlipLink, loseItAll, parlayPrice, parseStake, slipPayout, slipReminders, touchdownsNeeded } from '../src';

describe('lose it all', () => {
  it('is 1 - p1 * p2 for legs from different games', () => {
    const r = loseItAll([{ gameId: 'a', hitChance: 0.49 }, { gameId: 'b', hitChance: 0.47 }]);
    expect(r.correlated).toBe(false);
    expect(r.allHit).toBeCloseTo(0.2303);
    expect(r.value).toBeCloseTo(0.7697);
  });
  it('never gives a number for same game legs', () => {
    const r = loseItAll([{ gameId: 'a', hitChance: 0.49 }, { gameId: 'a', hitChance: 0.3 }, { gameId: 'b', hitChance: 0.4 }]);
    expect(r).toEqual({ allHit: null, value: null, correlated: true, sameGame: ['a'] });
  });
  it('gives nothing for an empty slip or a leg with no read', () => {
    expect(loseItAll([]).value).toBeNull();
    const r = loseItAll([{ gameId: 'a', hitChance: 0.5 }, { gameId: 'b', hitChance: null }]);
    expect(r.value).toBeNull();
    expect(r.correlated).toBe(false);
  });
  it('is one minus the chance for a single', () => {
    expect(loseItAll([{ gameId: 'a', hitChance: 0.4 }]).value).toBeCloseTo(0.6);
  });
});

describe('payout', () => {
  it('multiplies decimal prices and the stake, to the cent', () => {
    expect(parlayPrice([2.6, 2.55])).toBeCloseTo(6.63);
    expect(slipPayout(15, [2.6, 2.55])).toBe(99.45);
    expect(slipPayout(10, [3.2])).toBe(32);
  });
  it('needs a stake and real prices', () => {
    expect(slipPayout(null, [2.6])).toBeNull();
    expect(slipPayout(15, [])).toBeNull();
    expect(slipPayout(15, [1])).toBeNull();
  });
  it('reads a typed stake', () => {
    expect(parseStake('15')).toBe(15);
    expect(parseStake(' $1,250.50 ')).toBe(1250.5);
    expect(parseStake(12.5)).toBe(12.5);
    for (const bad of ['', '0', '-5', '1.234', 'abc', '15 dollars', '9999999', null, undefined, {}]) expect(parseStake(bad), String(bad)).toBeNull();
  });
});

describe('slip link', () => {
  // Outcome ids from Josh's links (docs/prd.md F3.6); # is written %23.
  const a = 'https://sportsbook.draftkings.com/event/34118031?outcomes=0QA382703107%232336266924_13L88808Q1-1377166492Q20';
  const b = 'https://sportsbook.draftkings.com/?outcomes=0QA382703200%232336266999_13L88808Q1-1377166500Q20';
  it('joins outcome ids with + under the first leg\'s event', () => {
    expect(buildSlipLink('draftkings', [{ link: a }, { link: b }])).toEqual({
      url: 'https://sportsbook.draftkings.com/event/34118031?outcomes=0QA382703107%232336266924_13L88808Q1-1377166492Q20+0QA382703200%232336266999_13L88808Q1-1377166500Q20',
      missing: [],
    });
  });
  it('uses the bare slip path when the first linked leg has no event', () => {
    expect(buildSlipLink('draftkings', [{ link: b }]).url).toBe(`${b}`);
  });
  it('keeps ids already joined in one link and drops repeats', () => {
    const both = 'https://sportsbook.draftkings.com/?outcomes=X1+X2';
    expect(buildSlipLink('draftkings', [{ link: both }, { link: 'https://sportsbook.draftkings.com/?outcomes=X2' }]).url)
      .toBe('https://sportsbook.draftkings.com/?outcomes=X1+X2');
  });
  it('lists legs it cannot link and never builds a link to another host', () => {
    const r = buildSlipLink('draftkings', [{ link: null }, { link: a }, { link: 'https://evil.example/?outcomes=X1' }, { link: 'not a url' }]);
    expect(r.missing).toEqual([0, 2, 3]);
    expect(r.url).toContain('sportsbook.draftkings.com/event/34118031');
    expect(buildSlipLink('draftkings', [{ link: null }])).toEqual({ url: null, missing: [0] });
  });
  it('has no adapter for other books yet', () => {
    expect(buildSlipLink('fanduel', [{ link: a }])).toEqual({ url: null, missing: [0] });
  });
});

describe('guardrails', () => {
  const leg = (price: number, line: number | null = null) => ({ price, marketId: 'anytime_td', line });
  it('reminds on legs under 2.5 and props that need two touchdowns', () => {
    expect(slipReminders([leg(2.6), leg(2.2), leg(4, 1.5)], 15)).toEqual([
      { kind: 'short-price', leg: 1 },
      { kind: 'multi-td', leg: 2 },
    ]);
    expect(slipReminders([leg(SHORT_PRICE)], 15)).toEqual([]);
    expect(touchdownsNeeded({ line: null })).toBe(1);
    expect(touchdownsNeeded({ line: 0.5 })).toBe(1);
    expect(touchdownsNeeded({ line: 1.5 })).toBe(2);
  });
  it('checks the stake only against a usual range it is given', () => {
    expect(slipReminders([leg(3)], 500)).toEqual([]);
    expect(slipReminders([leg(3)], 500, { min: 5, max: 50 })).toEqual([{ kind: 'stake', side: 'above' }]);
    expect(slipReminders([leg(3)], 2, { min: 5, max: 50 })).toEqual([{ kind: 'stake', side: 'below' }]);
  });
});
