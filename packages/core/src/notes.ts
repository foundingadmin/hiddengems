// Notes that add to or cost a gem (docs/prd.md F2.3), as context only: no note moves clarity, the hit chance
// or the rating. Three kinds, each read from data we already hold:
//   injury   his injury report game status (Questionable, Doubtful, Out) is a cost
//   blowout  a big spread: a big favorite may rest starters late; a big underdog trails and throws, which
//            costs a back or a quarterback and adds for a receiver or tight end
//   model    what lifts or lowers his hit chance in model v3.0, read from the estimate's stored inputs:
//            the stats read against the market, implied team points, his snap share over his last 3 games
// Adds come first, then costs, at most five.
import { CLARITY_V3 } from './model';

export type NoteEffect = 'add' | 'cost';

export type GemNote =
  | { kind: 'injury'; effect: 'cost'; status: InjuryStatus }
  | { kind: 'blowout'; effect: NoteEffect; side: 'favorite' | 'underdog' }
  | { kind: 'stats'; effect: NoteEffect }
  | { kind: 'implied'; effect: NoteEffect }
  | { kind: 'snaps'; effect: NoteEffect };

export type InjuryStatus = 'Questionable' | 'Doubtful' | 'Out';
const INJURY: readonly InjuryStatus[] = ['Out', 'Doubtful', 'Questionable'];

export const NOTE_LIMIT = 5;
/** Model lines per gem. */
export const MODEL_NOTE_LIMIT = 2;

export const NOTE_THRESHOLDS = {
  /** A team favored or trailing by this many points or more is in blowout territory. */
  blowoutSpread: 10,
  /** The stats must move the hit chance off the market's fair chance by at least this much (1 point). */
  statsMove: 0.01,
  /** Implied team points at least this share above or below the league average. */
  impliedShare: 0.05,
  /** Snap share over his last 3 games at least this multiple of his season's is up. */
  snapsUp: 1.15,
  /** ...and under the model's own falling line (clarity's setup part) is down. */
  snapsDown: CLARITY_V3.fallingSnaps,
} as const;

/** What the notes read from an estimate's inputs (build-picks stores them with every estimate). */
export interface EstimateInputs {
  statsChance: number | null;
  statsWeight: number | null;
  fair: number | null;
  impliedFactor: number | null;
  form: { rzCarriesPerGame: number; rzTargetsPerGame: number; snapRecent: number; snapSeason: number } | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The estimate's stored inputs, or null when they are missing or not what build-picks writes. */
export function readEstimateInputs(raw: unknown): EstimateInputs | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const f = r.form && typeof r.form === 'object' ? (r.form as Record<string, unknown>) : null;
  const form = f && [f.rzCarriesPerGame, f.rzTargetsPerGame, f.snapRecent, f.snapSeason].every((v) => num(v) != null)
    ? { rzCarriesPerGame: f.rzCarriesPerGame as number, rzTargetsPerGame: f.rzTargetsPerGame as number, snapRecent: f.snapRecent as number, snapSeason: f.snapSeason as number }
    : null;
  return { statsChance: num(r.statsChance), statsWeight: num(r.statsWeight), fair: num(r.fair), impliedFactor: num(r.impliedFactor), form };
}

/** A cost when he is listed Questionable, Doubtful or Out. */
export function injuryNote(status: string | null | undefined): Extract<GemNote, { kind: 'injury' }> | null {
  const s = INJURY.find((x) => x.toLowerCase() === status?.trim().toLowerCase());
  return s ? { kind: 'injury', effect: 'cost', status: s } : null;
}

/**
 * Blowout risk from the schedule's spread (spreadLine above zero: the home team is favored). Null under the
 * threshold, without a line, or for an underdog at a position the game script does not plainly help or hurt.
 */
export function blowoutNote(spreadLine: number | null, home: boolean, position: string | null): GemNote | null {
  if (spreadLine == null) return null;
  const margin = home ? spreadLine : -spreadLine;
  if (Math.abs(margin) < NOTE_THRESHOLDS.blowoutSpread) return null;
  if (margin > 0) return { kind: 'blowout', effect: 'cost', side: 'favorite' };
  const pos = position?.toUpperCase() ?? null;
  if (pos === 'WR' || pos === 'TE') return { kind: 'blowout', effect: 'add', side: 'underdog' };
  if (pos === 'RB' || pos === 'FB' || pos === 'QB') return { kind: 'blowout', effect: 'cost', side: 'underdog' };
  return null;
}

/** What lifts or lowers his hit chance in model v3.0: the stats read, then implied points, then snap share, at most two. */
export function modelNotes(inputs: EstimateInputs | null): GemNote[] {
  if (!inputs) return [];
  const out: GemNote[] = [];
  const t = NOTE_THRESHOLDS;
  const { statsChance, statsWeight, fair, impliedFactor, form } = inputs;
  // The hit chance is the fair chance moved toward the stats read by the stats weight.
  if (statsChance != null && statsWeight != null && fair != null) {
    const move = statsWeight * (statsChance - fair);
    if (Math.abs(move) >= t.statsMove) {
      out.push({ kind: 'stats', effect: move > 0 ? 'add' : 'cost' });
    }
  }
  if (impliedFactor != null && Math.abs(impliedFactor - 1) >= t.impliedShare) {
    out.push({ kind: 'implied', effect: impliedFactor > 1 ? 'add' : 'cost' });
  }
  if (form && form.snapSeason > 0) {
    const ratio = form.snapRecent / form.snapSeason;
    if (ratio >= t.snapsUp) out.push({ kind: 'snaps', effect: 'add' });
    else if (ratio < t.snapsDown) out.push({ kind: 'snaps', effect: 'cost' });
  }
  return out.slice(0, MODEL_NOTE_LIMIT);
}

export interface GemNotesInput {
  injuryStatus: string | null;
  spreadLine: number | null;
  /** Whether his team is the home team; null when his team is unknown (no blowout note). */
  home: boolean | null;
  position: string | null;
  inputs: EstimateInputs | null;
}

/** Every note for one gem: adds first, then costs, at most five. Injury leads the costs. */
export function gemNotes(i: GemNotesInput): GemNote[] {
  const notes = [
    injuryNote(i.injuryStatus),
    ...modelNotes(i.inputs),
    i.home == null ? null : blowoutNote(i.spreadLine, i.home, i.position),
  ].filter((n): n is GemNote => n != null);
  return [...notes.filter((n) => n.effect === 'add'), ...notes.filter((n) => n.effect === 'cost')].slice(0, NOTE_LIMIT);
}
