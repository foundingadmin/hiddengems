import 'server-only';
// The slip as pages read it: the week's slip from the slip store (packages/db/src/slips.ts) plus the numbers core
// derives from it (lose it all, payout, the DraftKings link, reminders). Every page and the rail read this.
import {
  type LoseItAll, type Reminder, type SlipLink, buildSlipLink, loseItAll, seasonOf, slipPayout, slipReminders,
} from '@hiddengems/core';
import { type SlipView, openSlip, slipForWeek } from '@hiddengems/db';
import { weeks } from '@/lib/board';
import { db } from '@/lib/db';

export interface SlipSummary {
  slip: SlipView;
  loseItAll: LoseItAll;
  pays: number | null;
  link: SlipLink;
  reminders: Reminder[];
  /** Legs whose game shares a game with another leg. */
  sameGame: Set<string>;
}

export function summarize(slip: SlipView): SlipSummary {
  const lose = loseItAll(slip.legs);
  return {
    slip,
    loseItAll: lose,
    pays: slipPayout(slip.stake, slip.legs.map((l) => l.price)),
    link: buildSlipLink(slip.bookId, slip.legs),
    // No usual stake range has been set, so no stake reminder (core slipReminders()).
    reminders: slipReminders(slip.legs, slip.stake),
    sameGame: new Set(lose.sameGame),
  };
}

async function weekOf(week: number | null | undefined, now: Date): Promise<number | null> {
  return week ?? (await weeks(now)).current;
}

/** The slip in progress (draft, assessed or sent) for a week, default this week; null when there is none or it has no legs. */
export async function getCurrentSlip(week?: number | null, now = new Date()): Promise<SlipSummary | null> {
  const w = await weekOf(week, now);
  if (w == null) return null;
  const slip = await openSlip((await db()).db, seasonOf(now), w);
  return slip && slip.legs.length ? summarize(slip) : null;
}

/** What Slips, This week shows: the open slip, else the week's last placed slip. */
export async function weekSlip(week: number | null, now = new Date()): Promise<SlipSummary | null> {
  if (week == null) return null;
  const slip = await slipForWeek((await db()).db, seasonOf(now), week);
  return slip ? summarize(slip) : null;
}
