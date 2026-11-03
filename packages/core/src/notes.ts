// Notes that add to or cost a gem (docs/prd.md F2.3), as context only: no note moves clarity, the hit chance
// or the rating. Four kinds, each read from data we already hold:
//   injury   his injury report game status (Questionable, Doubtful, Out) is a cost
//   implied  model v3.0 scales his red zone read by his team's implied points over the league average; the
//            factor stored with the estimate says which way
//   snaps    his snap share over his last 3 games against his season's, from the usage pull
//   blowout  a big spread: a big favorite may rest starters late; a big underdog trails and throws, which
//            costs a back or a quarterback and adds for a receiver or tight end
// Adds come first, then costs, at most five.
import { CLARITY_V3 } from './model';

export type NoteEffect = 'add' | 'cost';

export type GemNote =
  | { kind: 'injury'; effect: 'cost'; status: InjuryStatus }
  | { kind: 'implied'; effect: NoteEffect }
  | { kind: 'snaps'; effect: NoteEffect }
  | { kind: 'blowout'; effect: NoteEffect; side: 'favorite' | 'underdog' };

export type InjuryStatus = 'Questionable' | 'Doubtful' | 'Out';
const INJURY: readonly InjuryStatus[] = ['Out', 'Doubtful', 'Questionable'];

export const NOTE_LIMIT = 5;

export const NOTE_THRESHOLDS = {
  /** A team favored or trailing by this many points or more is in blowout territory. */
  blowoutSpread: 10,
  /** Implied team points at least this share above or below the league average. */
  impliedShare: 0.05,
  /** Snap share over his last 3 games at least this multiple of his season's is up. */
  snapsUp: 1.15,
  /** ...and under the model's own falling line (clarity's setup part) is down. */
  snapsDown: CLARITY_V3.fallingSnaps,
} as const;

/** What the notes read from an estimate's inputs (build-picks stores them with every estimate). */
export interface EstimateInputs {
  impliedFactor: number | null;
  /** Snap shares from his usage this season. */
  form: { snapRecent: number; snapSeason: number } | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The estimate's stored inputs, or null when they are missing or not what build-picks writes. */
export function readEstimateInputs(raw: unknown): EstimateInputs | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const f = r.form && typeof r.form === 'object' ? (r.form as Record<string, unknown>) : null;
  const recent = num(f?.snapRecent);
  const season = num(f?.snapSeason);
  return { impliedFactor: num(r.impliedFactor), form: recent != null && season != null ? { snapRecent: recent, snapSeason: season } : null };
}

/** A cost when he is listed Questionable, Doubtful or Out. */
export function injuryNote(status: string | null | undefined): Extract<GemNote, { kind: 'injury' }> | null {
  const s = INJURY.find((x) => x.toLowerCase() === status?.trim().toLowerCase());
  return s ? { kind: 'injury', effect: 'cost', status: s } : null;
}

/** Implied team points far enough above or below the league average to lift or lower his read in model v3.0. */
export function impliedNote(impliedFactor: number | null | undefined): GemNote | null {
  if (impliedFactor == null || Math.abs(impliedFactor - 1) < NOTE_THRESHOLDS.impliedShare) return null;
  return { kind: 'implied', effect: impliedFactor > 1 ? 'add' : 'cost' };
}

/** His snap share over his last 3 games, up or falling against his season's. */
export function snapNote(form: EstimateInputs['form'] | undefined): GemNote | null {
  if (!form || !(form.snapSeason > 0)) return null;
  const ratio = form.snapRecent / form.snapSeason;
  if (ratio >= NOTE_THRESHOLDS.snapsUp) return { kind: 'snaps', effect: 'add' };
  if (ratio < NOTE_THRESHOLDS.snapsDown) return { kind: 'snaps', effect: 'cost' };
  return null;
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
    impliedNote(i.inputs?.impliedFactor),
    snapNote(i.inputs?.form),
    i.home == null ? null : blowoutNote(i.spreadLine, i.home, i.position),
  ].filter((n): n is GemNote => n != null);
  return [...notes.filter((n) => n.effect === 'add'), ...notes.filter((n) => n.effect === 'cost')].slice(0, NOTE_LIMIT);
}
