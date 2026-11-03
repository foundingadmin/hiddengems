import { describe, expect, it } from 'vitest';
import { type PlacedSlipRecord, averageClv, resultsLine, seasonRecord, slipOutcome } from '../src';

describe('results line', () => {
  it('counts every graded gem, its average CLV and each box', () => {
    const r = resultsLine([
      { clv: 0.05, box: 'earned' }, { clv: 0.01, box: 'unlucky' }, { clv: -0.02, box: 'wrong-read' }, { clv: 0.04, box: 'earned' },
    ]);
    expect(r.graded).toBe(4);
    expect(r.averageClv).toBeCloseTo(0.02);
    expect(r.boxes).toEqual({ earned: 2, unlucky: 1, lucky: 0, 'wrong-read': 1 });
  });
  it('has no average before anything is graded', () => {
    expect(resultsLine([])).toEqual({ graded: 0, averageClv: null, boxes: { earned: 0, unlucky: 0, lucky: 0, 'wrong-read': 0 } });
    expect(averageClv([])).toBeNull();
  });
});

describe('slip outcome', () => {
  it('pays the parlay when every leg scores', () => {
    const o = slipOutcome(15, [{ price: 2.4, status: 'won', clv: 0.067 }, { price: 3.2, status: 'won', clv: 0.032 }]);
    expect(o).toMatchObject({ result: 'earned', returned: 115.2, profit: 100.2, legs: 2, scored: 2, graded: 2 });
    expect(o.clv).toBeCloseTo(0.0495);
  });
  it('loses the stake when any leg misses, even with another still open', () => {
    expect(slipOutcome(15, [{ price: 2.4, status: 'won', clv: null }, { price: 3.2, status: 'lost', clv: null }]))
      .toMatchObject({ result: 'missed', returned: 0, profit: -15, scored: 1, graded: 0, clv: null });
    expect(slipOutcome(10, [{ price: 2.4, status: 'open', clv: null }, { price: 3.2, status: 'lost', clv: null }]).result).toBe('missed');
  });
  it('waits while a leg is open', () => {
    expect(slipOutcome(10, [{ price: 2.4, status: 'won', clv: 0.01 }, { price: 3.2, status: 'open', clv: null }]))
      .toMatchObject({ result: 'pending', returned: null, profit: null });
    expect(slipOutcome(10, []).result).toBe('pending');
  });
  it('drops a void leg from the parlay and refunds an all void slip', () => {
    expect(slipOutcome(10, [{ price: 2.5, status: 'won', clv: null }, { price: 3, status: 'void', clv: null }]))
      .toMatchObject({ result: 'earned', returned: 25, profit: 15 });
    expect(slipOutcome(10, [{ price: 2.5, status: 'push', clv: null }])).toMatchObject({ result: 'void', returned: 10, profit: 0 });
  });
});

describe('season record', () => {
  const slip = (week: number, play: 'suggested' | 'own', stake: number, legs: [number, 'won' | 'lost' | 'open', number | null][]): PlacedSlipRecord => {
    const outcome = slipOutcome(stake, legs.map(([price, status, clv]) => ({ price, status, clv })));
    const boxes = legs.map(([, status, clv]) => (clv == null ? null : {
      clv, box: clv > 0 ? (status === 'won' ? 'earned' as const : 'unlucky' as const) : (status === 'won' ? 'lucky' as const : 'wrong-read' as const),
    }));
    return { week, play, stake, outcome, legs: boxes };
  };

  it('sums settled profit by play and averages CLV over graded legs', () => {
    const r = seasonRecord([
      slip(8, 'suggested', 15, [[2.4, 'won', 0.067], [3.2, 'won', 0.032]]),
      slip(6, 'suggested', 15, [[2.5, 'lost', 0.05]]),
      slip(5, 'own', 10, [[3, 'lost', -0.014], [2.2, 'won', 0.01]]),
      slip(9, 'own', 20, [[3, 'open', null]]),
    ]);
    expect(r).toMatchObject({ legs: 5, weeks: { first: 5, last: 8 }, settled: 3, staked: 40, profit: 75.2, suggested: 85.2, own: -10, wrongReads: 1 });
    expect(r.averageClv).toBeCloseTo((0.067 + 0.032 + 0.05 - 0.014 + 0.01) / 5);
  });
  it('leaves a play with no settled slips empty', () => {
    const r = seasonRecord([slip(8, 'own', 10, [[3, 'lost', -0.02]])]);
    expect(r).toMatchObject({ suggested: null, own: -10, profit: -10 });
    expect(seasonRecord([])).toMatchObject({ legs: 0, averageClv: null, weeks: null, settled: 0, profit: 0, suggested: null, own: null });
  });
});
