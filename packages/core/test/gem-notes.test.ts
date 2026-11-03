import { describe, expect, it } from 'vitest';
import {
  type EstimateInputs, FRESH_MS, NOTE_LIMIT, NOTE_THRESHOLDS, blowoutNote, freshnessState, gemNotes, impliedNote, injuryNote, readEstimateInputs,
  snapNote,
} from '../src';

const form = { snapRecent: 0.7, snapSeason: 0.7 };
const inputs = (over: Partial<EstimateInputs> = {}): EstimateInputs => ({ impliedFactor: 1, form, ...over });

describe('injuryNote', () => {
  it('costs when listed Questionable, Doubtful or Out', () => {
    expect(injuryNote('Questionable')).toEqual({ kind: 'injury', effect: 'cost', status: 'Questionable' });
    expect(injuryNote('doubtful')?.status).toBe('Doubtful');
    expect(injuryNote('Out')?.effect).toBe('cost');
  });
  it('says nothing for other statuses or none', () => {
    expect(injuryNote(null)).toBeNull();
    expect(injuryNote('Probable')).toBeNull();
    expect(injuryNote('')).toBeNull();
  });
});

describe('blowoutNote', () => {
  const big = NOTE_THRESHOLDS.blowoutSpread;
  it('needs a line at the threshold or past it', () => {
    expect(blowoutNote(null, true, 'RB')).toBeNull();
    expect(blowoutNote(big - 0.5, true, 'RB')).toBeNull();
    expect(blowoutNote(big, true, 'RB')).toEqual({ kind: 'blowout', effect: 'cost', side: 'favorite' });
  });
  it('reads the spread from his side: spreadLine above zero favors the home team', () => {
    expect(blowoutNote(-big, false, 'WR')).toEqual({ kind: 'blowout', effect: 'cost', side: 'favorite' });
    expect(blowoutNote(big, false, 'WR')).toEqual({ kind: 'blowout', effect: 'add', side: 'underdog' });
  });
  it('a big underdog trails and throws: a cost for backs and quarterbacks, an add for receivers', () => {
    expect(blowoutNote(-12, true, 'RB')?.effect).toBe('cost');
    expect(blowoutNote(-12, true, 'QB')?.effect).toBe('cost');
    expect(blowoutNote(-12, true, 'TE')?.effect).toBe('add');
    expect(blowoutNote(-12, true, null)).toBeNull();
  });
});

describe('impliedNote', () => {
  it('adds or costs once implied team points sit 5% off the league average', () => {
    expect(impliedNote(1.05)).toEqual({ kind: 'implied', effect: 'add' });
    expect(impliedNote(0.9)).toEqual({ kind: 'implied', effect: 'cost' });
    expect(impliedNote(0.97)).toBeNull();
    expect(impliedNote(null)).toBeNull();
  });
});

describe('snapNote', () => {
  it('snap share over his last 3 games, up or falling against his season', () => {
    expect(snapNote({ snapRecent: 0.81, snapSeason: 0.7 })).toEqual({ kind: 'snaps', effect: 'add' });
    expect(snapNote({ snapRecent: 0.5, snapSeason: 0.7 })).toEqual({ kind: 'snaps', effect: 'cost' });
    expect(snapNote({ snapRecent: 0.6, snapSeason: 0.7 })).toBeNull();
    expect(snapNote({ snapRecent: 0.6, snapSeason: 0 })).toBeNull();
    expect(snapNote(null)).toBeNull();
  });
});

describe('readEstimateInputs', () => {
  it('reads what build-picks stores', () => {
    const raw = {
      books: { draftkings: 3.2 }, statsChance: 0.31, statsWeight: 0.5, fair: 0.28, impliedFactor: 1.1, impliedPoints: 25, injury: null,
      clarity: { sample: 40 }, form: { games: 8, tdGames: 3, lambda: 0.3, rzCarriesPerGame: 1, rzTargetsPerGame: 0.4, ...form },
    };
    expect(readEstimateInputs(raw)).toEqual({ impliedFactor: 1.1, form });
  });
  it('drops what is missing or malformed', () => {
    expect(readEstimateInputs(null)).toBeNull();
    expect(readEstimateInputs('x')).toBeNull();
    expect(readEstimateInputs({ impliedFactor: 'high', form: { snapRecent: 1 } })).toEqual({ impliedFactor: null, form: null });
  });
});

describe('gemNotes', () => {
  it('ranks adds first, then costs, injury leading the costs', () => {
    const notes = gemNotes({
      injuryStatus: 'Questionable', spreadLine: -11, home: true, position: 'WR',
      inputs: inputs({ impliedFactor: 1.2, form: { snapRecent: 0.4, snapSeason: 0.7 } }),
    });
    expect(notes.map((n) => `${n.effect} ${n.kind}`)).toEqual(['add implied', 'add blowout', 'cost injury', 'cost snaps']);
  });
  it('holds at most five and nothing without data', () => {
    expect(gemNotes({ injuryStatus: null, spreadLine: null, home: null, position: null, inputs: null })).toEqual([]);
    expect(gemNotes({ injuryStatus: 'Out', spreadLine: 14, home: true, position: 'RB', inputs: inputs({ impliedFactor: 1.3 }) }).length)
      .toBeLessThanOrEqual(NOTE_LIMIT);
  });
  it('skips blowout risk when his side is unknown', () => {
    expect(gemNotes({ injuryStatus: null, spreadLine: 14, home: null, position: 'RB', inputs: null })).toEqual([]);
  });
});

describe('freshnessState', () => {
  const now = new Date('2026-11-05T15:00:00Z');
  it('reads live under 6 hours, stale from 6, queued when nothing was pulled', () => {
    expect(freshnessState(new Date(now.getTime() - FRESH_MS + 1), now)).toBe('live');
    expect(freshnessState(new Date(now.getTime() - FRESH_MS), now)).toBe('stale');
    expect(freshnessState('2026-11-04T15:00:00Z', now.toISOString())).toBe('stale');
    expect(freshnessState(null, now)).toBe('queued');
    expect(freshnessState('not a time', now)).toBe('queued');
  });
});
