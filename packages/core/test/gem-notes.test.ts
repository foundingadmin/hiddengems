import { describe, expect, it } from 'vitest';
import { type EstimateInputs, NOTE_LIMIT, NOTE_THRESHOLDS, blowoutNote, gemNotes, injuryNote, modelNotes, readEstimateInputs } from '../src';

const form = { rzCarriesPerGame: 1.2, rzTargetsPerGame: 0.4, snapRecent: 0.7, snapSeason: 0.7 };
const inputs = (over: Partial<EstimateInputs> = {}): EstimateInputs => ({
  statsChance: 0.4, statsWeight: 0.5, fair: 0.4, impliedFactor: 1, form, ...over,
});

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

describe('modelNotes', () => {
  it('reads nothing without inputs or when every part sits near the market and the average', () => {
    expect(modelNotes(null)).toEqual([]);
    expect(modelNotes(inputs())).toEqual([]);
  });
  it('the stats read lifts or lowers the hit chance once it moves it a point', () => {
    expect(modelNotes(inputs({ statsChance: 0.5 }))).toEqual([{ kind: 'stats', effect: 'add' }]);
    expect(modelNotes(inputs({ statsChance: 0.3 }))[0]).toMatchObject({ kind: 'stats', effect: 'cost' });
    // 0.5 x 0.019 moves it under a point.
    expect(modelNotes(inputs({ statsChance: 0.419 }))).toEqual([]);
  });
  it('implied team points past 5% of the average', () => {
    expect(modelNotes(inputs({ impliedFactor: 1.05 }))).toEqual([{ kind: 'implied', effect: 'add' }]);
    expect(modelNotes(inputs({ impliedFactor: 0.9 }))).toEqual([{ kind: 'implied', effect: 'cost' }]);
    expect(modelNotes(inputs({ impliedFactor: 0.97 }))).toEqual([]);
  });
  it('snap share over his last 3 games, up or falling', () => {
    expect(modelNotes(inputs({ form: { ...form, snapRecent: 0.81, snapSeason: 0.7 } }))).toEqual([{ kind: 'snaps', effect: 'add' }]);
    expect(modelNotes(inputs({ form: { ...form, snapRecent: 0.5, snapSeason: 0.7 } }))).toEqual([{ kind: 'snaps', effect: 'cost' }]);
    expect(modelNotes(inputs({ form: { ...form, snapRecent: 0.6, snapSeason: 0.7 } }))).toEqual([]);
  });
  it('keeps two lines: stats, then implied points, then snaps', () => {
    const all = modelNotes(inputs({ statsChance: 0.5, impliedFactor: 0.8, form: { ...form, snapRecent: 0.9 } }));
    expect(all.map((n) => n.kind)).toEqual(['stats', 'implied']);
  });
});

describe('readEstimateInputs', () => {
  it('reads what build-picks stores', () => {
    const raw = {
      books: { draftkings: 3.2 }, statsChance: 0.31, statsWeight: 0.5, fair: 0.28, impliedFactor: 1.1, impliedPoints: 25, injury: null,
      clarity: { sample: 40 }, form: { games: 8, tdGames: 3, lambda: 0.3, ...form },
    };
    expect(readEstimateInputs(raw)).toEqual({ statsChance: 0.31, statsWeight: 0.5, fair: 0.28, impliedFactor: 1.1, form });
  });
  it('drops what is missing or malformed', () => {
    expect(readEstimateInputs(null)).toBeNull();
    expect(readEstimateInputs('x')).toBeNull();
    expect(readEstimateInputs({ statsChance: 'high', form: { rzCarriesPerGame: 1 } })).toEqual({
      statsChance: null, statsWeight: null, fair: null, impliedFactor: null, form: null,
    });
  });
});

describe('gemNotes', () => {
  it('ranks adds first, then costs, injury leading the costs', () => {
    const notes = gemNotes({
      injuryStatus: 'Questionable', spreadLine: -11, home: true, position: 'WR', inputs: inputs({ statsChance: 0.3, impliedFactor: 1.2 }),
    });
    expect(notes.map((n) => `${n.effect} ${n.kind}`)).toEqual(['add implied', 'add blowout', 'cost injury', 'cost stats']);
  });
  it('holds at most five and nothing without data', () => {
    expect(gemNotes({ injuryStatus: null, spreadLine: null, home: null, position: null, inputs: null })).toEqual([]);
    expect(gemNotes({ injuryStatus: 'Out', spreadLine: 14, home: true, position: 'RB', inputs: inputs({ statsChance: 0.6, impliedFactor: 1.3 }) }).length)
      .toBeLessThanOrEqual(NOTE_LIMIT);
  });
  it('skips blowout risk when his side is unknown', () => {
    expect(gemNotes({ injuryStatus: null, spreadLine: 14, home: null, position: 'RB', inputs: null })).toEqual([]);
  });
});
