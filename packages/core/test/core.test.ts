import { describe, expect, it } from 'vitest';
import {
  americanToDecimal, decimalToAmerican, findTeam, gameId, gapPoints, impliedFromDecimal, isOddsPullDue, nameKey,
  oddsIntervalMinutes, overround, removeVig, selectionKey, signalSummary, tierOf, verdictOf, type Signals,
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
  it('removes the vig from a two-way market', () => {
    const fair = removeVig([1.91, 1.91]);
    expect(fair[0]).toBeCloseTo(0.5);
    expect(overround([1.91, 1.91])).toBeCloseTo(0.0471, 3);
  });
});

describe('picks', () => {
  it('measures the gap in whole points', () => {
    expect(gapPoints(0.44, 1 / 3.2)).toBe(13);
  });
  it('ranks gaps on the specimen ladder', () => {
    expect([13, 12, 10, 9, 6, 5, 1, 0, -3].map(tierOf)).toEqual(['flawless', 'flawless', 'polished', 'polished', 'cut', 'rough', 'rough', null, null]);
  });
  const s = (states: string): Signals => {
    const map = { G: 'go', W: 'wait', R: 'stop', N: 'none' } as const;
    const [setup, trackRecord, sample, priceGap, matchup, market] = [...states].map((c) => map[c as keyof typeof map]);
    return { setup: setup!, trackRecord: trackRecord!, sample: sample!, priceGap: priceGap!, matchup: matchup!, market: market! };
  };
  it('reaches the specimen verdicts', () => {
    expect(verdictOf(s('WGWGWW'))).toBe('wait');
    expect(verdictOf(s('GGWGRW'))).toBe('wait');
    expect(verdictOf(s('GGWGGG'))).toBe('go');
    expect(verdictOf(s('NGWGWG'))).toBe('none');
    expect(verdictOf(s('GGWWGG'))).toBe('go');
    expect(verdictOf(s('RGGGGG'))).toBe('stop');
    expect(verdictOf(s('GRGGRG'))).toBe('stop');
  });
  it('summarizes the strip for screen readers', () => {
    expect(signalSummary(s('GGWGGG'))).toBe('5 go, 1 wait');
  });
});

describe('cadence', () => {
  const now = new Date('2026-11-08T17:00:00Z');
  const at = (h: number) => new Date(now.getTime() + h * 3_600_000);
  it('pulls every 5 minutes near kickoff and during games', () => {
    expect(oddsIntervalMinutes({ now, kickoffs: [at(2)] })).toBe(5);
    expect(oddsIntervalMinutes({ now, kickoffs: [at(-2)] })).toBe(5);
  });
  it('slows down away from games', () => {
    expect(oddsIntervalMinutes({ now, kickoffs: [at(30)] })).toBe(60);
    expect(oddsIntervalMinutes({ now, kickoffs: [at(100)] })).toBe(360);
    expect(oddsIntervalMinutes({ now, kickoffs: [at(-5)] })).toBe(360);
  });
  it('decides when a pull is due', () => {
    expect(isOddsPullDue({ now, kickoffs: [at(2)], lastSuccessAt: null })).toBe(true);
    expect(isOddsPullDue({ now, kickoffs: [at(2)], lastSuccessAt: new Date(now.getTime() - 4.5 * 60_000) })).toBe(true);
    expect(isOddsPullDue({ now, kickoffs: [at(2)], lastSuccessAt: new Date(now.getTime() - 3 * 60_000) })).toBe(false);
  });
});

describe('identity', () => {
  it('names games by Eastern date and teams', () => {
    // 8:20 PM ET Sunday is already Monday in UTC
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
