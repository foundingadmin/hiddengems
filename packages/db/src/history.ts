// What Slips, History reads (docs/prd.md F1.1, F1.2): every graded gem of a season, and placed slips with each
// leg's bet and grade. Reads return null while the grades or slips migration has not run, so the page can say so.
import type { GradeBox, SlipPlay } from '@hiddengems/core';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { type Db, isMissingTable } from './client';
import { bets, games, grades, players, slipLegs, slips } from './schema';

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export interface GemGrade {
  week: number | null;
  clv: number;
  box: GradeBox;
}

/** Every graded gem record whose game is in the season. Null until the grades migration has run. */
export function gemGrades(db: Db, season: number): Promise<GemGrade[] | null> {
  return orNull(async () => {
    const rows = await db.select({ week: games.week, clv: grades.clv, box: grades.box }).from(grades)
      .innerJoin(games, eq(games.id, grades.gameId))
      .where(and(eq(grades.subject, 'gem'), eq(games.season, season)));
    return rows.map((r) => ({ ...r, box: r.box as GradeBox }));
  });
}

export interface HistoryLeg {
  selectionKey: string;
  gameId: string;
  name: string;
  teamId: string | null;
  number: number | null;
  position: string | null;
  awayTeamId: string;
  homeTeamId: string;
  kickoffAt: Date;
  /** The price the bet was placed at (the leg's price when it has no bet). */
  price: number;
  /** The bet's status: open, won, lost, push or void. */
  status: string;
  /** The closing price: the grade's close, else the bet's. */
  closePrice: number | null;
  /** Null until graded. */
  clv: number | null;
  box: GradeBox | null;
  hit: boolean | null;
  gradedAt: Date | null;
}

export interface PlacedSlipView {
  id: string;
  season: number;
  week: number;
  /** Its order among the week's placed slips, from 1, and how many the week has. */
  number: number;
  ofWeek: number;
  play: SlipPlay;
  stake: number;
  placedAt: Date | null;
  legs: HistoryLeg[];
}

async function placed(db: Db, where: ReturnType<typeof and>): Promise<PlacedSlipView[]> {
  const rows = await db.select().from(slips).where(and(eq(slips.state, 'placed'), where))
    .orderBy(desc(slips.week), desc(slips.placedAt), desc(slips.createdAt));
  if (!rows.length) return [];
  const legRows = await db.select({ leg: slipLegs, game: games, player: players, bet: bets, grade: grades })
    .from(slipLegs)
    .innerJoin(games, eq(games.id, slipLegs.gameId))
    .leftJoin(players, eq(players.id, slipLegs.playerId))
    .leftJoin(bets, eq(bets.id, slipLegs.betId))
    .leftJoin(grades, eq(grades.betId, slipLegs.betId))
    .where(inArray(slipLegs.slipId, rows.map((r) => r.id)))
    .orderBy(asc(games.kickoffAt), asc(slipLegs.addedAt));
  // Number each slip among its week's placed slips, oldest first, from every placed slip that week.
  const weekRows = await db.select({ id: slips.id, season: slips.season, week: slips.week }).from(slips)
    .where(and(eq(slips.state, 'placed'), inArray(slips.week, [...new Set(rows.map((r) => r.week))])))
    .orderBy(asc(slips.placedAt), asc(slips.createdAt));
  return rows.map((row) => {
    const peers = weekRows.filter((w) => w.season === row.season && w.week === row.week);
    return {
      id: row.id, season: row.season, week: row.week, number: peers.findIndex((p) => p.id === row.id) + 1, ofWeek: peers.length,
      play: row.play as SlipPlay, stake: Number(row.stake ?? 0), placedAt: row.placedAt,
      legs: legRows.filter((l) => l.leg.slipId === row.id).map(({ leg, game, player, bet, grade }) => ({
        selectionKey: leg.selectionKey, gameId: leg.gameId, name: player?.name ?? leg.playerName ?? 'Unknown player', teamId: player?.teamId ?? null,
        number: player?.jerseyNumber ?? null, position: player?.position ?? null, awayTeamId: game.awayTeamId, homeTeamId: game.homeTeamId,
        kickoffAt: game.kickoffAt, price: bet?.priceDecimal ?? leg.priceDecimal, status: bet?.status ?? 'open',
        closePrice: grade?.closePrice ?? bet?.closingPrice ?? null, clv: grade?.clv ?? null, box: (grade?.box as GradeBox | undefined) ?? null,
        hit: grade?.hit ?? null, gradedAt: grade?.gradedAt ?? null,
      })),
    };
  });
}

/** The season's placed slips, newest week first. Null until the slips and grades migrations have run. */
export function placedSlips(db: Db, season: number): Promise<PlacedSlipView[] | null> {
  return orNull(() => placed(db, eq(slips.season, season)));
}

/** One placed slip by id; null when there is none (or the migrations have not run). */
export async function placedSlip(db: Db, id: string): Promise<PlacedSlipView | null> {
  return (await orNull(() => placed(db, eq(slips.id, id))))?.[0] ?? null;
}
