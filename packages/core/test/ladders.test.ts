import { describe, expect, it } from 'vitest';
import {
  CAPSULE_MARKETS, appraise, availabilityBlock, betLabel, capsulePath, dueCapsules, injuryLine, injuryLevel, marketsFor, practicePenalty, propHit, readStatProp, slipReminders, statChance, whyNoRating,
} from '../src';

describe('stat ladders', () => {
  it('names a rung the way the book shows it', () => {
    expect(betLabel('receptions', 4.5)).toBe('5+ receptions');
    expect(betLabel('receiving_yds', 69.5)).toBe('70+ receiving yards');
    expect(betLabel('rushing_yds', 79.5)).toBe('80+ rushing yards');
    expect(betLabel('anytime_td')).toBe('Anytime TD');
  });

  it('reads a steady player near his hit rate, a little cooler', () => {
    const r = statChance('receptions', [6, 5, 7, 4, 6, 5, 6, 7], 5.5)!;
    expect(r.hits).toBe(5);
    expect(r.games).toBe(8);
    // Calibrated below the 62.5% raw hit rate: the raw rate ran hot in the backtest.
    expect(r.chance).toBeLessThan(0.625);
    expect(r.chance).toBeGreaterThan(0.4);
  });

  it('weights his recent games more', () => {
    const rising = statChance('receiving_yds', [20, 25, 30, 80, 90, 95], 69.5)!;
    const falling = statChance('receiving_yds', [95, 90, 80, 30, 25, 20], 69.5)!;
    expect(rising.chance).toBeGreaterThan(falling.chance);
  });

  it('has no read without games, so the market stands', () => {
    const r = readStatProp({ market: 'receptions', line: 4.5, values: [], price: 3, bookPrices: [3], injuryStatus: null, snapsFalling: false });
    expect(r.hasStats).toBe(false);
    expect(appraise({ hitChance: r.hitChance, price: 3, clarity: 50, hasStats: r.hasStats }).kind).toBe('unrated');
  });

  it('grades a ladder over from the box score', () => {
    const box = { touchdowns: 0, receptions: 5, receivingYards: 70, rushingYards: null };
    expect(propHit({ marketId: 'receptions', side: 'over', line: 4.5 }, box)).toBe(true);
    expect(propHit({ marketId: 'receptions', side: 'over', line: 5.5 }, box)).toBe(false);
    expect(propHit({ marketId: 'receiving_yds', side: 'over', line: 69.5 }, box)).toBe(true);
    expect(propHit({ marketId: 'rushing_yds', side: 'over', line: 9.5 }, box)).toBe(false);
    expect(propHit({ marketId: 'anytime_td', side: 'yes', line: null }, box)).toBe(false);
  });

  it('carries the ladders on the Sunday morning pull and manual pulls only', () => {
    expect(marketsFor({ snapshot: 'sun', manual: false })).toEqual(['anytime_td', 'receptions', 'receiving_yds', 'rushing_yds']);
    expect(marketsFor({ snapshot: null, manual: true })).toHaveLength(4);
    expect(marketsFor({ snapshot: 'sat', manual: false })).toEqual(['anytime_td']);
    expect(marketsFor({ snapshot: null, manual: false })).toEqual(['anytime_td']);
  });

  it('keeps the two touchdown reminder to touchdown props', () => {
    expect(slipReminders([{ price: 3, marketId: 'receptions', line: 4.5 }], null)).toEqual([]);
    expect(slipReminders([{ price: 3, marketId: 'anytime_td', line: 1.5 }], null)).toEqual([{ kind: 'multi-td', leg: 0 }]);
  });
});

describe('availability', () => {
  const base = { status: null, practice: null, injury: null, team: 'ari', lastGameTeam: 'ari' };

  it('blocks Out, Doubtful and a new team, whatever the numbers say', () => {
    expect(availabilityBlock({ ...base, status: 'Out' })).toBe('out');
    expect(availabilityBlock({ ...base, status: 'Doubtful' })).toBe('doubtful');
    expect(availabilityBlock({ ...base, team: 'no', lastGameTeam: 'cle' })).toBe('new-team');
    expect(availabilityBlock({ ...base, status: 'Questionable' })).toBeNull();
    const gem = appraise({ hitChance: 0.6, price: 3, clarity: 90, hasStats: true, block: 'out' });
    expect(gem).toMatchObject({ kind: 'none', rating: null });
    expect(whyNoRating(gem.kind, 3, 'new-team')).toBe('New team, so his stats are from another offense');
  });

  it('writes one injury line, quiet for a full week of practice', () => {
    expect(injuryLine({ status: null, practice: 'Limited Participation in Practice', injury: 'Ribs' })).toBe('Ribs · Limited in practice');
    expect(injuryLine({ status: 'Questionable', practice: 'Full Participation in Practice', injury: 'Ankle' })).toBe('Questionable · Ankle · Full practice');
    expect(injuryLine({ status: null, practice: 'Full Participation in Practice', injury: 'Knee' })).toBeNull();
    expect(injuryLine({ status: null, practice: 'Did Not Participate In Practice', injury: 'Not injury related - resting player' })).toBe('Rest · Did not practice');
    expect(injuryLevel('Out · Hamstring')).toBe('error');
    expect(injuryLevel('Questionable · Ribs')).toBe('warning');
  });

  it('costs clarity for a limited or missed last practice', () => {
    expect(practicePenalty('Limited Participation in Practice')).toBeGreaterThan(0);
    expect(practicePenalty('Did Not Participate In Practice')).toBeGreaterThan(0);
    expect(practicePenalty('Full Participation in Practice')).toBe(0);
    expect(practicePenalty(null)).toBe(0);
  });
});

describe('time capsules', () => {
  const games = [{ id: 'g1', kickoff: new Date('2026-11-08T18:00:00Z') }];
  it('captures the Saturday board from 7:47 PM Denver until Sunday morning, once', () => {
    expect(dueCapsules(new Date('2026-11-08T02:40:00Z'), games, new Set()).board).toBeNull(); // 7:40 PM
    expect(dueCapsules(new Date('2026-11-08T02:50:00Z'), games, new Set()).board).toEqual({ slot: 'capsule-sat:2026-11-07', saturday: '2026-11-07' });
    expect(dueCapsules(new Date('2026-11-08T16:00:00Z'), games, new Set()).board?.slot).toBe('capsule-sat:2026-11-07'); // 9 AM Sunday
    expect(dueCapsules(new Date('2026-11-08T17:40:00Z'), games, new Set()).board).toBeNull(); // 10:40 AM Sunday
    expect(dueCapsules(new Date('2026-11-08T02:50:00Z'), games, new Set(['capsule-sat:2026-11-07'])).board).toBeNull();
  });
  it('captures each close inside its lead, once', () => {
    expect(dueCapsules(new Date('2026-11-08T17:30:00Z'), games, new Set()).closes).toHaveLength(0);
    expect(dueCapsules(new Date('2026-11-08T17:40:00Z'), games, new Set()).closes).toHaveLength(1);
    expect(dueCapsules(new Date('2026-11-08T17:40:00Z'), games, new Set(['capsule-close:g1'])).closes).toHaveLength(0);
  });
  it('asks for every player prop and game market', () => {
    expect(CAPSULE_MARKETS).toContain('player_anytime_td');
    expect(CAPSULE_MARKETS).toContain('player_pass_yds_alternate');
    expect(CAPSULE_MARKETS).toContain('team_totals');
    expect(new Set(CAPSULE_MARKETS).size).toBe(CAPSULE_MARKETS.length);
    expect(capsulePath(2026, 9, 'sat', 'manifest.json')).toBe('capsules/2026/wk09/sat/manifest.json');
  });
});
