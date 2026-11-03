import 'server-only';
// One gem for the gem sheet (docs/build-brief.md, Gem sheet): the stored pick with its own numbers, the best
// price on offer, and the Last 10 game log from player_game_stats, with player_usage where stats lag.
import { type GameLog, type GemKind, type LogGame, findTeam, gameLog, newGemReason } from '@hiddengems/core';
import { books, gemMarks, games, oddsLatest, picks, playerGameStats, playerUsage, players } from '@hiddengems/db';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db';

export interface GemDetail {
  key: string;
  kind: GemKind;
  rating: number | null;
  name: string;
  teamId: string | null;
  number: number | null;
  position: string | null;
  marketId: string;
  matchup: string;
  kickoff: string;
  fresh: boolean;
  /** The posted price and its book. */
  price: number;
  book: string;
  priced: number;
  fair: number;
  hitChance: number;
  carat: number;
  gapToPosted: number;
  clarity: number;
  best: { price: number; book: string } | null;
  log: GameLog;
}

export async function gemDetail(key: string, now = new Date()): Promise<GemDetail | null> {
  const { db: d } = await db();
  const [row] = await d.select({ pick: picks, game: games, player: players, book: books.name, mark: gemMarks })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .innerJoin(books, eq(books.id, picks.bookId))
    .leftJoin(players, eq(players.id, picks.playerId))
    .leftJoin(gemMarks, eq(gemMarks.selectionKey, picks.selectionKey))
    .where(eq(picks.selectionKey, key));
  if (!row) return null;
  const { pick, game, player, mark } = row;

  const [best] = await d.select({ price: oddsLatest.priceDecimal, book: books.name }).from(oddsLatest)
    .innerJoin(books, eq(books.id, oddsLatest.bookId))
    .where(and(eq(oddsLatest.selectionKey, key), eq(oddsLatest.available, true)))
    .orderBy(desc(oddsLatest.priceDecimal)).limit(1);

  const team = player?.teamId ?? null;
  return {
    key, kind: pick.kind as GemKind, rating: pick.rating,
    name: player?.name ?? pick.playerName ?? 'Unknown player', teamId: team && findTeam(team) ? team : null,
    number: player?.jerseyNumber ?? null, position: player?.position ?? null, marketId: pick.marketId,
    matchup: `${game.awayTeamId.toUpperCase()} @ ${game.homeTeamId.toUpperCase()}`, kickoff: game.kickoffAt.toISOString(),
    fresh: pick.kind === 'gem' && game.kickoffAt > now && !!mark && !!newGemReason(pick.rating, mark),
    price: pick.price, book: row.book, priced: pick.priced, fair: pick.fair, hitChance: pick.hitChance,
    carat: pick.carat, gapToPosted: pick.gapToPosted, clarity: pick.clarity,
    best: best ?? null,
    log: player ? await lastTen(player.id, team, game) : gameLog([], []),
  };
}

/** His regular season games before this game's week, with the TDs he scored in each. */
async function lastTen(playerId: string, team: string | null, game: typeof games.$inferSelect): Promise<GameLog> {
  const { db: d } = await db();
  if (game.week == null) return gameLog([], []);
  const before = and(eq(games.season, game.season), eq(games.seasonType, 'reg'), lt(games.week, game.week));
  const league = await d.selectDistinct({ week: games.week }).from(games).where(before);
  const mine = or(
    eq(playerGameStats.playerId, playerId), eq(playerUsage.playerId, playerId),
    ...(team ? [eq(games.awayTeamId, team), eq(games.homeTeamId, team)] : []),
  );
  const rows = await d.select({ game: games, statTds: playerGameStats.touchdowns, usageTds: playerUsage.touchdowns, usageTeam: playerUsage.teamId })
    .from(games)
    .leftJoin(playerGameStats, and(eq(playerGameStats.gameId, games.id), eq(playerGameStats.playerId, playerId)))
    .leftJoin(playerUsage, and(eq(playerUsage.gameId, games.id), eq(playerUsage.playerId, playerId)))
    .where(and(before, mine));
  const log = rows.map(({ game: g, statTds, usageTds, usageTeam }): LogGame => {
    const side = usageTeam ?? team;
    const home = side === g.homeTeamId;
    return { week: g.week!, opponent: home ? g.awayTeamId : g.homeTeamId, home, touchdowns: statTds ?? usageTds ?? null };
  });
  return gameLog(league.map((l) => l.week!).filter((w) => w != null), log);
}
