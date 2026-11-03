import 'server-only';
// Slips, History as the page reads it: the results line over every graded gem, the season record and each placed
// slip's outcome, from the history reads (packages/db/src/history.ts) and core's history rules.
import {
  type ResultsLine, type SeasonRecord, type SlipOutcome, resultsLine, seasonOf, seasonRecord, slipOutcome,
} from '@hiddengems/core';
import { type PlacedSlipView, gemGrades, placedSlip, placedSlips } from '@hiddengems/db';
import { db } from '@/lib/db';

export interface GradedSlip {
  slip: PlacedSlipView;
  outcome: SlipOutcome;
  /** When its last leg was graded; null until one is. */
  gradedAt: Date | null;
}

export interface History {
  /** False until the grades migration has run. Slips read empty until theirs has too. */
  ready: boolean;
  gems: ResultsLine & { weeks: { first: number; last: number } | null };
  slips: GradedSlip[];
  season: SeasonRecord;
}

function graded(slip: PlacedSlipView): GradedSlip {
  const outcome = slipOutcome(slip.stake, slip.legs.map((l) => ({ price: l.price, status: l.status, clv: l.clv })));
  const times = slip.legs.flatMap((l) => (l.gradedAt ? [l.gradedAt.getTime()] : []));
  return { slip, outcome, gradedAt: times.length ? new Date(Math.max(...times)) : null };
}

export async function getHistory(now = new Date()): Promise<History> {
  const { db: d } = await db();
  const season = seasonOf(now);
  const [gems, placed] = await Promise.all([gemGrades(d, season), placedSlips(d, season)]);
  const slips = (placed ?? []).map(graded);
  const weeks = (gems ?? []).flatMap((g) => (g.week == null ? [] : [g.week]));
  return {
    ready: gems != null,
    gems: { ...resultsLine(gems ?? []), weeks: weeks.length ? { first: Math.min(...weeks), last: Math.max(...weeks) } : null },
    slips,
    season: seasonRecord(slips.map(({ slip, outcome }) => ({
      week: slip.week, play: slip.play, stake: slip.stake, outcome,
      legs: slip.legs.map((l) => (l.clv != null && l.box ? { clv: l.clv, box: l.box } : null)),
    }))),
  };
}

export async function getGradedSlip(id: string): Promise<GradedSlip | null> {
  const slip = await placedSlip((await db()).db, id);
  return slip ? graded(slip) : null;
}
