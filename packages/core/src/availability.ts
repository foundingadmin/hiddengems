// Who can play (Nov 7 2026): the official injury report and roster moves, read before any gem is called.
// Out or Doubtful means no gem. So does a player whose stats come from another team: a waiver claim or trade
// makes his numbers someone else's offense. Questionable and a limited week of practice stay gems with less clarity.

export interface Availability {
  /** Game status on the latest injury report: Out, Doubtful, Questionable; null when not listed. */
  status: string | null;
  /** Last practice of the week: Full, Limited, Did not participate; null when not listed. */
  practice: string | null;
  /** The injury listed ("Ribs"), or a non-injury reason ("Rest"). */
  injury: string | null;
  /** His team now, from the roster. */
  team: string | null;
  /** The team he played his most recent game for, from this season's stats. */
  lastGameTeam: string | null;
}

export type Block = 'out' | 'doubtful' | 'new-team';

/** Why a prop cannot be a gem, or null when he is expected to play for the team his stats came from. */
export function availabilityBlock(a: Availability): Block | null {
  if (a.status === 'Out') return 'out';
  if (a.status === 'Doubtful') return 'doubtful';
  if (a.team && a.lastGameTeam && a.team !== a.lastGameTeam) return 'new-team';
  return null;
}

/** Practice participation as nflverse spells it, shortened for the sheet. */
export function practiceLabel(practice: string | null): string | null {
  if (!practice) return null;
  if (/did not/i.test(practice)) return 'Did not practice';
  if (/limited/i.test(practice)) return 'Limited in practice';
  if (/full/i.test(practice)) return 'Full practice';
  return practice;
}

/**
 * One line for the injury report on a gem ("Questionable · Ribs · Limited in practice"). Null when he is not
 * listed, or practiced in full without a game status: that is a clean bill, not news.
 */
export function injuryLine(a: Pick<Availability, 'status' | 'practice' | 'injury'>): string | null {
  if (!a.status && !practicePenalty(a.practice)) return null;
  const injury = a.injury && /not injury related/i.test(a.injury) ? 'Rest' : a.injury;
  return [a.status, injury, practiceLabel(a.practice)].filter(Boolean).join(' · ');
}

/** How loud the line is: Out and Doubtful stop a bet, anything else is a caution. */
export const injuryLevel = (line: string): 'error' | 'warning' => (/^(Out|Doubtful)\b/.test(line) ? 'error' : 'warning');

/** A limited or missed last practice costs clarity even without a game status. */
export const PRACTICE_SETUP_PENALTY = 4;
export function practicePenalty(practice: string | null): number {
  return practice && /(limited|did not)/i.test(practice) ? PRACTICE_SETUP_PENALTY : 0;
}
