// Snapshots: the slate and data health as two JSON documents, for hosts that cannot query Postgres
// (the claude.ai artifact reads them from its db). Values are display-ready but unformatted.
import { BOOKS, impliedFromDecimal, marketById } from '@hiddengems/core';
import { type Db, games, picks, players, providerUsage, runs } from '@hiddengems/db';
import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import type { DataMode } from './providers';

export const SOURCES = [
  { job: 'pull-odds', label: 'Odds', cadence: 'Every 5 minutes near kickoff, hourly within 3 days' },
  { job: 'pull-schedule', label: 'Schedule', cadence: 'Daily' },
  { job: 'pull-rosters', label: 'Rosters', cadence: 'Daily' },
  { job: 'pull-results', label: 'Results', cadence: 'Hourly' },
  { job: 'build-picks', label: 'Picks', cadence: 'After every odds pull' },
] as const;

const BOOK_NAMES: Record<string, string> = Object.fromEntries(BOOKS.map((b) => [b.id, b.name]));

export interface SlateSnapshot {
  generatedAt: string;
  dataMode: DataMode;
  model: string | null;
  oddsUpdatedAt: string | null;
  picks: {
    key: string; name: string; teamId: string | null; number: number | null; position: string | null;
    market: string; side: string; line: number | null; kickoff: string; book: string;
    price: number; priced: number; estimate: number; gap: number; signals: Record<string, string>; verdict: string; tier: string | null;
  }[];
}

export interface HealthSnapshot {
  generatedAt: string;
  dataMode: DataMode;
  sources: { job: string; label: string; cadence: string; provider: string | null; status: string | null; owner: string | null; startedAt: string | null }[];
  runs: { id: string; job: string; status: string; owner: string | null; message: string | null; startedAt: string; durationMs: number | null }[];
  usage: { provider: string; used: number | null; remaining: number | null; updatedAt: string }[];
}

export async function buildSnapshots(db: Db, dataMode: DataMode, now = new Date(), limit = 300): Promise<{ slate: SlateSnapshot; health: HealthSnapshot }> {
  const rows = await db.select({ pick: picks, game: games, player: players })
    .from(picks).innerJoin(games, eq(games.id, picks.gameId)).leftJoin(players, eq(players.id, picks.playerId))
    .where(gt(games.kickoffAt, now)).orderBy(desc(picks.gapPts), asc(picks.selectionKey)).limit(limit);
  const [lastOdds] = await db.select().from(runs)
    .where(and(eq(runs.job, 'pull-odds'), inArray(runs.status, ['succeeded', 'warned']))).orderBy(desc(runs.startedAt)).limit(1);

  const slate: SlateSnapshot = {
    generatedAt: now.toISOString(),
    dataMode,
    model: rows[0]?.pick.model ?? null,
    oddsUpdatedAt: lastOdds?.finishedAt?.toISOString() ?? null,
    picks: rows.map(({ pick, game, player }) => ({
      key: pick.selectionKey,
      name: player?.name ?? pick.playerName ?? 'Game market',
      teamId: player?.teamId ?? null,
      number: player?.jerseyNumber ?? null,
      position: player?.position ?? null,
      market: marketById(pick.marketId)?.label ?? pick.marketId,
      side: pick.side,
      line: pick.line,
      kickoff: game.kickoffAt.toISOString(),
      book: BOOK_NAMES[pick.bestBookId] ?? pick.bestBookId,
      price: pick.bestPrice,
      priced: impliedFromDecimal(pick.bestPrice),
      estimate: pick.estimate,
      gap: pick.gapPts,
      signals: pick.signals,
      verdict: pick.verdict,
      tier: pick.tier,
    })),
  };

  const sources = await Promise.all(SOURCES.map(async (s) => {
    const [last] = await db.select().from(runs).where(eq(runs.job, s.job)).orderBy(desc(runs.startedAt)).limit(1);
    return { ...s, provider: last?.provider ?? null, status: last?.status ?? null, owner: last?.failureOwner ?? null, startedAt: last?.startedAt.toISOString() ?? null };
  }));
  const log = await db.select().from(runs).orderBy(desc(runs.startedAt)).limit(50);
  const usage = await db.select().from(providerUsage);
  const health: HealthSnapshot = {
    generatedAt: now.toISOString(),
    dataMode,
    sources,
    runs: log.map((r) => ({ id: r.id, job: r.job, status: r.status, owner: r.failureOwner, message: r.message, startedAt: r.startedAt.toISOString(), durationMs: r.durationMs })),
    usage: usage.map((u) => ({ provider: u.provider, used: u.used, remaining: u.remaining, updatedAt: u.updatedAt.toISOString() })),
  };
  return { slate, health };
}
