import 'server-only';
// One gem for the gem sheet (docs/build-brief.md, Gem sheet): the stored pick with its own numbers, the best
// price on offer, the Last 10 game log from player_game_stats (player_usage where stats lag), and the read:
// the purchase book's price over time with the gem record and its grade, trend lines, the core sample and
// game conditions (docs/prd.md F2.1, F2.4, F2.5, F2.7), the splits behind the loupe (F2.2), loaded once so
// toggling a condition redraws on the client, and the notes that add to or cost it (F2.3, context only).
import {
  type CoreSample, type GameLine, type GameLog, type GemKind, type GemNote, type LogGame, type Matchup, type MatchupScore, type SplitNote, type Trend, type TrendGame,
  type UsageGame, coreSample, fairPriceFor, favoredBySpread, findTeam, gameLog, impliedFactor, matchup, matchupPosition, newGemReason, priceTrail,
  gemNotes, readEstimateInputs, splitNotes, trendLines,
} from '@hiddengems/core';
import {
  type PlayerSplits, books, estimates, gemMarks, gemRecords, games, getGameWeather, getSplits, grades, isMissingTable, oddsLatest, oddsSnapshots, picks,
  playerGameStats, playerUsage, players, runs,
} from '@hiddengems/db';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db';

/** The purchase book's price from its first snapshot to kickoff, with our fair price and, once played, the record. */
export interface Appraisal {
  /** One point per price change, oldest first (ISO times). */
  trail: { at: string; price: number }[];
  /** When this price was last pulled; null before any pull. */
  pulledAt: string | null;
  /** Our fair price: 1 / our hit chance (at the freeze once the game is on record). */
  fairPrice: number;
  /** The board at the freeze, once the game is on record (gem_records). */
  record: { decisionAt: string; decisionPrice: number; freezeAt: string; freezePrice: number } | null;
  /** Closing line value once graded (grades). */
  clv: number | null;
}

/** Game conditions. Implied points are in the model; the matchup and the weather are context only. */
export interface Conditions {
  implied: { points: number; average: number } | null;
  matchup: Matchup | null;
  /** The kickoff forecast's line when it matters at an open stadium (core weatherNote()), else null. */
  weather: { note: string; pulledAt: string } | null;
}

/** A note with where it came from and when that was pulled (ISO, null when unknown). */
export interface SourcedNote {
  note: GemNote;
  /** The injury report's week, for injury notes. */
  week: number | null;
  /** The model that read it ("v3.0"), for the model's lines. */
  model: string | null;
  at: string | null;
}

/** His splits for this game (core splitsFor()), each game's opponent, and the splits the Notes cite. */
export interface Loupe extends PlayerSplits {
  opponents: Record<string, { opponent: string; home: boolean }>;
  notes: SplitNote[];
}

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
  /** When the server read it, so the chart's now matches the page. */
  now: string;
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
  appraisal: Appraisal;
  trends: Trend[];
  sample: CoreSample | null;
  conditions: Conditions;
  /** Null when he has no games this season before this one. */
  loupe: Loupe | null;
  /** What adds to or costs this gem, adds first (core gemNotes()). Context only. */
  notes: SourcedNote[];
}

/** A table a pending migration adds reads as empty until the owner runs it (docs/architecture.md, Database). */
async function unlessMissing<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if (isMissingTable(e)) return fallback;
    throw e;
  }
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

  const history = player ? await playerSeason(player.id, player.teamId, game) : null;
  const team = player?.teamId ?? history?.usage.at(-1)?.team ?? null;
  const position = player?.position ?? history?.usage.at(-1)?.position ?? null;
  const [appraisal, conditions, loupe, notes] = await Promise.all([
    appraisalOf(pick, game.kickoffAt),
    conditionsOf(game, team, position),
    player ? loupeOf(player.id, game.id) : null,
    notesOf(pick, game, team, position, player ?? null),
  ]);
  const home = team === game.homeTeamId;
  return {
    key, kind: pick.kind as GemKind, rating: pick.rating,
    name: player?.name ?? pick.playerName ?? 'Unknown player', teamId: team && findTeam(team) ? team : null,
    number: player?.jerseyNumber ?? null, position: player?.position ?? null, marketId: pick.marketId,
    matchup: `${game.awayTeamId.toUpperCase()} @ ${game.homeTeamId.toUpperCase()}`, kickoff: game.kickoffAt.toISOString(), now: now.toISOString(),
    fresh: pick.kind === 'gem' && game.kickoffAt > now && !!mark && !!newGemReason(pick.rating, mark),
    price: pick.price, book: row.book, priced: pick.priced, fair: pick.fair, hitChance: pick.hitChance,
    carat: pick.carat, gapToPosted: pick.gapToPosted, clarity: pick.clarity,
    best: best ?? null,
    log: history?.log ?? gameLog([], []),
    appraisal,
    trends: history && team ? trendLines(history.trends, { home, favored: favoredBySpread(game.spreadLine, home) }) : [],
    sample: history ? coreSample(history.usage, history.teamUsage, player?.position ?? null) : null,
    conditions,
    loupe,
    notes,
  };
}

/**
 * The notes and their sources: the injury report as of the last usage pull, the spread as of the last schedule
 * pull, and the model's lines from the estimate behind this pick.
 */
async function notesOf(
  pick: typeof picks.$inferSelect, game: typeof games.$inferSelect, team: string | null, position: string | null,
  player: typeof players.$inferSelect | null,
): Promise<SourcedNote[]> {
  const { db: d } = await db();
  const [[estimate], [usagePull]] = await Promise.all([
    d.select({ inputs: estimates.inputs, model: estimates.model, computedAt: estimates.computedAt }).from(estimates)
      .where(eq(estimates.selectionKey, pick.selectionKey)).orderBy(desc(estimates.computedAt)).limit(1),
    player?.injuryStatus
      ? d.select({ at: runs.finishedAt }).from(runs)
        .where(and(eq(runs.job, 'pull-usage'), inArray(runs.status, ['succeeded', 'warned']))).orderBy(desc(runs.startedAt)).limit(1)
      : [],
  ]);
  const notes = gemNotes({
    injuryStatus: player?.injuryStatus ?? null,
    spreadLine: game.spreadLine,
    home: team === game.homeTeamId ? true : team === game.awayTeamId ? false : null,
    position,
    inputs: readEstimateInputs(estimate?.inputs),
  });
  return notes.map((note): SourcedNote => {
    if (note.kind === 'injury') return { note, week: player?.injuryWeek ?? null, model: null, at: usagePull?.at?.toISOString() ?? null };
    if (note.kind === 'blowout') return { note, week: null, model: null, at: game.updatedAt.toISOString() };
    return { note, week: null, model: estimate?.model.replace(/^hg-/, '') ?? null, at: estimate?.computedAt.toISOString() ?? null };
  });
}

async function loupeOf(playerId: string, gameId: string): Promise<Loupe | null> {
  const { db: d } = await db();
  const splits = await getSplits(d, playerId, gameId);
  if (!splits) return null;
  const rows = await d.select({ id: games.id, home: games.homeTeamId, away: games.awayTeamId }).from(games)
    .where(inArray(games.id, splits.log.map((g) => g.gameId)));
  const opponents: Loupe['opponents'] = {};
  for (const g of splits.log) {
    const r = rows.find((x) => x.id === g.gameId);
    const home = g.sides.venue ? g.sides.venue === 'home' : r?.home === splits.teamId;
    if (r) opponents[g.gameId] = { opponent: home ? r.away : r.home, home };
  }
  return { ...splits, opponents, notes: splitNotes(splits) };
}

/** His regular season games before this game's week: the Last 10, the trend games and his usage with his team's. */
async function playerSeason(playerId: string, team: string | null, game: typeof games.$inferSelect) {
  const { db: d } = await db();
  if (game.week == null) return null;
  const before = and(eq(games.season, game.season), eq(games.seasonType, 'reg'), lt(games.week, game.week));
  const league = await d.selectDistinct({ week: games.week }).from(games).where(before);
  const mine = or(
    eq(playerGameStats.playerId, playerId), eq(playerUsage.playerId, playerId),
    ...(team ? [eq(games.awayTeamId, team), eq(games.homeTeamId, team)] : []),
  );
  const rows = await d.select({ game: games, statTds: playerGameStats.touchdowns, usage: playerUsage })
    .from(games)
    .leftJoin(playerGameStats, and(eq(playerGameStats.gameId, games.id), eq(playerGameStats.playerId, playerId)))
    .leftJoin(playerUsage, and(eq(playerUsage.gameId, games.id), eq(playerUsage.playerId, playerId)))
    .where(and(before, mine));
  const sides = rows.map(({ game: g, statTds, usage }) => {
    const side = usage?.teamId ?? team;
    const home = side === g.homeTeamId;
    return { g, home, touchdowns: statTds ?? usage?.touchdowns ?? null, usage };
  });
  const log = gameLog(league.map((l) => l.week!).filter((w) => w != null), sides.map(({ g, home, touchdowns }): LogGame => ({
    week: g.week!, opponent: home ? g.awayTeamId : g.homeTeamId, home, touchdowns,
  })));
  const trends = sides.filter((s) => s.touchdowns != null).map(({ g, home, touchdowns, usage }): TrendGame => ({
    week: g.week!, home, favored: favoredBySpread(g.spreadLine, home), touchdowns: touchdowns!,
    redZone: usage ? usage.rzCarries + usage.rzTargets : null,
  }));
  const usage = sides.flatMap(({ usage: u }) => (u ? [toUsage(u)] : [])).sort((a, b) => a.week - b.week);
  const ids = usage.map((u) => u.gameId);
  const teamUsage = ids.length ? (await d.select().from(playerUsage).where(inArray(playerUsage.gameId, ids))).map(toUsage) : [];
  return { log, trends, usage, teamUsage };
}

const toUsage = (u: typeof playerUsage.$inferSelect): UsageGame => ({
  playerId: u.playerId, gameId: u.gameId, week: u.week, team: u.teamId, position: u.position, snapPct: u.snapPct,
  rzCarries: u.rzCarries, rzTargets: u.rzTargets, rzCarryTds: u.rzCarryTds, rzTargetTds: u.rzTargetTds, touchdowns: u.touchdowns,
});

/** The purchase book's snapshots for this selection, its last pull, and once played the gem record and grade. */
async function appraisalOf(pick: typeof picks.$inferSelect, kickoff: Date): Promise<Appraisal> {
  const { db: d } = await db();
  const [snaps, [latest], record] = await Promise.all([
    d.select({ priceDecimal: oddsSnapshots.priceDecimal, observedAt: oddsSnapshots.observedAt }).from(oddsSnapshots)
      .where(and(eq(oddsSnapshots.selectionKey, pick.selectionKey), eq(oddsSnapshots.bookId, pick.bookId))),
    d.select({ pulledAt: oddsLatest.pulledAt }).from(oddsLatest)
      .where(and(eq(oddsLatest.selectionKey, pick.selectionKey), eq(oddsLatest.bookId, pick.bookId))),
    unlessMissing(async () => {
      const [r] = await d.select({ record: gemRecords, clv: grades.clv }).from(gemRecords)
        .leftJoin(grades, and(eq(grades.gemRecordId, gemRecords.id), eq(grades.subject, 'gem')))
        .where(and(eq(gemRecords.selectionKey, pick.selectionKey), eq(gemRecords.bookId, pick.bookId))).limit(1);
      return r ?? null;
    }, null),
  ]);
  const r = record?.record;
  return {
    trail: priceTrail(snaps, kickoff).map((p) => ({ at: p.at.toISOString(), price: p.price })),
    pulledAt: latest?.pulledAt.toISOString() ?? null,
    fairPrice: fairPriceFor(r?.hitChance ?? pick.hitChance),
    record: r ? {
      decisionAt: r.decisionAt.toISOString(), decisionPrice: r.decisionPrice, freezeAt: r.freezeAt.toISOString(), freezePrice: r.freezePrice,
    } : null,
    clv: record?.clv ?? null,
  };
}

/** Implied team points from the schedule's lines, and the opponent's rank in touchdowns allowed to the position. */
async function conditionsOf(game: typeof games.$inferSelect, team: string | null, position: string | null): Promise<Conditions> {
  const { db: d } = await db();
  const forecast = await getGameWeather(d, game.id);
  const weather = forecast?.note ? { note: forecast.note, pulledAt: forecast.pulledAt.toISOString() } : null;
  if (!team || game.week == null) return { implied: null, matchup: null, weather };
  const season = await d.select().from(games).where(and(eq(games.season, game.season), eq(games.seasonType, 'reg')));
  const lines: GameLine[] = season.filter((g) => g.week != null).map((g) => ({
    gameId: g.id, week: g.week!, homeTeam: g.homeTeamId, awayTeam: g.awayTeamId, spreadLine: g.spreadLine, totalLine: g.totalLine,
  }));
  const own = lines.find((l) => l.gameId === game.id);
  const factor = own ? impliedFactor(own, team, lines) : null;
  const implied = factor ? { points: factor.points, average: factor.points / factor.factor } : null;
  if (!position) return { implied, matchup: null, weather };

  const played = season.filter((g) => g.week != null && g.week < game.week! && g.status === 'final');
  const pos = matchupPosition(position);
  const scores: MatchupScore[] = played.length ? (await d.select({
    gameId: playerUsage.gameId, team: playerUsage.teamId, position: playerUsage.position, touchdowns: playerUsage.touchdowns,
  }).from(playerUsage).where(and(
    inArray(playerUsage.gameId, played.map((g) => g.id)),
    inArray(playerUsage.position, pos === 'RB' ? ['RB', 'FB'] : [pos]),
  ))) : [];
  // Every final game with any usage counts, so a defense that allowed none to the position still has its games.
  const counted = new Set(played.length ? (await d.selectDistinct({ id: playerUsage.gameId }).from(playerUsage)
    .where(inArray(playerUsage.gameId, played.map((g) => g.id)))).map((r) => r.id) : []);
  const opponent = team === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
  return {
    implied,
    weather,
    matchup: matchup(
      played.filter((g) => counted.has(g.id)).map((g) => ({ gameId: g.id, week: g.week!, home: g.homeTeamId, away: g.awayTeamId })),
      scores, position, opponent,
    ),
  };
}
