// Hidden Gems schema. Column names are camelCase here and snake_case in Postgres (casing: 'snake_case').
// History is append-only: odds_snapshots and estimates are never updated, so any past slate can be rebuilt.
// Current state lives in small tables the app reads directly (odds_latest, picks).
import { sql } from 'drizzle-orm';
import {
  bigserial, boolean, doublePrecision, index, integer, jsonb, numeric, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const tstz = () => timestamp({ withTimezone: true });
const uuid = () => text().primaryKey().$defaultFn(() => crypto.randomUUID());

// ---------------------------------------------------------------- Reference data (seeded from @hiddengems/core)

export const teams = pgTable('teams', {
  id: text().primaryKey(),
  abbr: text().notNull(),
  city: text().notNull(),
  name: text().notNull(),
  conference: text().notNull(),
  division: text().notNull(),
});

export const books = pgTable('books', {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const markets = pgTable('markets', {
  id: text().primaryKey(),
  label: text().notNull(),
});

// ---------------------------------------------------------------- Entities

export const players = pgTable('players', {
  id: uuid(),
  name: text().notNull(),
  /** nameKey() from core, for matching providers that only send names (odds feeds). */
  nameKey: text().notNull(),
  position: text(),
  teamId: text().references(() => teams.id),
  jerseyNumber: smallint(),
  status: text(),
  /** Latest injury report game status (Out, Doubtful, Questionable), null when not listed. */
  injuryStatus: text(),
  injuryWeek: smallint(),
  updatedAt: createdAt(),
}, (t) => [index().on(t.nameKey), index().on(t.teamId)]);

export const games = pgTable('games', {
  /** gameId() from core: Eastern kickoff date, away, home ("2026-11-08-buf-kc"). */
  id: text().primaryKey(),
  season: smallint().notNull(),
  seasonType: text().notNull().default('reg'),
  week: smallint(),
  kickoffAt: tstz().notNull(),
  awayTeamId: text().notNull().references(() => teams.id),
  homeTeamId: text().notNull().references(() => teams.id),
  neutralSite: boolean().notNull().default(false),
  /** scheduled, in_progress, final, postponed, canceled */
  status: text().notNull().default('scheduled'),
  awayScore: smallint(),
  homeScore: smallint(),
  /** Schedule lines for implied team points (model v3.0). spreadLine above zero: the home team is favored. */
  spreadLine: doublePrecision(),
  totalLine: doublePrecision(),
  updatedAt: createdAt(),
}, (t) => [index().on(t.kickoffAt), index().on(t.season, t.week)]);

/** Maps each provider's ids onto ours, so a provider can be swapped without touching history. */
export const providerRefs = pgTable('provider_refs', {
  provider: text().notNull(),
  /** player, game */
  entity: text().notNull(),
  externalId: text().notNull(),
  internalId: text().notNull(),
}, (t) => [primaryKey({ columns: [t.provider, t.entity, t.externalId] }), index().on(t.entity, t.internalId)]);

// ---------------------------------------------------------------- Odds history

const selection = {
  /** selectionKey() from core: game, market, player, side, line. */
  selectionKey: text().notNull(),
  gameId: text().notNull().references(() => games.id),
  marketId: text().notNull().references(() => markets.id),
  playerId: text().references(() => players.id),
  /** The name exactly as the provider sent it, kept when no player matched. */
  playerName: text(),
  /** yes (anytime TD is one-sided) */
  side: text().notNull(),
  line: doublePrecision(),
};

/** Every price we have seen, once per change. Never updated. */
export const oddsSnapshots = pgTable('odds_snapshots', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  runId: text().notNull(),
  ...selection,
  bookId: text().notNull().references(() => books.id),
  priceDecimal: doublePrecision().notNull(),
  /** When the book last changed this price, per the provider. */
  observedAt: tstz().notNull(),
  pulledAt: tstz().notNull(),
}, (t) => [
  uniqueIndex().on(t.selectionKey, t.bookId, t.observedAt),
  index().on(t.selectionKey, t.observedAt),
  index().on(t.gameId),
]);

/** The current price per selection and book. */
export const oddsLatest = pgTable('odds_latest', {
  ...selection,
  bookId: text().notNull().references(() => books.id),
  priceDecimal: doublePrecision().notNull(),
  observedAt: tstz().notNull(),
  pulledAt: tstz().notNull(),
  /** False once a book stops offering the selection (suspended or pulled). */
  available: boolean().notNull().default(true),
  /** The book's slip link that adds this pick, when the provider sends one. Never places anything. */
  link: text(),
}, (t) => [primaryKey({ columns: [t.selectionKey, t.bookId] }), index().on(t.gameId)]);

/** Odds pulls taken on the snapshot schedule ("sat:2026-11-07", "freeze:<gameId>"), so none repeats. */
export const oddsSlots = pgTable('odds_slots', {
  slot: text().primaryKey(),
  runId: text().notNull(),
  games: integer().notNull(),
  pulledAt: tstz().notNull(),
});

// ---------------------------------------------------------------- Model output

/** Our probability for a selection, per model run. Never updated. */
export const estimates = pgTable('estimates', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  runId: text().notNull(),
  ...selection,
  probability: doublePrecision().notNull(),
  model: text().notNull(),
  inputs: jsonb().$type<Record<string, unknown>>(),
  computedAt: tstz().notNull(),
}, (t) => [index().on(t.selectionKey, t.computedAt)]);

/** The current board: one row per selection, rebuilt after each odds pull (core appraise()). */
export const picks = pgTable('picks', {
  selectionKey: text().primaryKey(),
  gameId: text().notNull().references(() => games.id),
  marketId: text().notNull().references(() => markets.id),
  playerId: text().references(() => players.id),
  playerName: text(),
  side: text().notNull(),
  line: doublePrecision(),
  /** The posted price at the purchase book (DraftKings). */
  bookId: text().notNull().references(() => books.id),
  price: doublePrecision().notNull(),
  /** Implied chance of the posted price, cut included. */
  priced: doublePrecision().notNull(),
  /** Market fair chance behind the posted price. */
  fair: doublePrecision().notNull(),
  /** Our hit chance. */
  hitChance: doublePrecision().notNull(),
  /** Confidence in the read, 0 to 100. */
  clarity: integer().notNull(),
  /** Our chance minus the fair chance, in points. */
  carat: doublePrecision().notNull(),
  /** Our chance minus the posted price's chance, in points. Above zero clears the cut. */
  gapToPosted: doublePrecision().notNull(),
  /** gem, fools-gold, none, unrated */
  kind: text().notNull(),
  /** 0 to 100 for a gem, otherwise null. */
  rating: integer(),
  /** Hit chance times clarity, the Recommended sort. Null outside gems. */
  recommended: doublePrecision(),
  model: text().notNull(),
  link: text(),
  runId: text().notNull(),
  updatedAt: tstz().notNull(),
}, (t) => [index().on(t.gameId), index().on(t.kind)]);

// ---------------------------------------------------------------- Results and bets

export const playerGameStats = pgTable('player_game_stats', {
  gameId: text().notNull().references(() => games.id),
  playerId: text().notNull().references(() => players.id),
  touchdowns: smallint().notNull().default(0),
  receptions: smallint(),
  receivingYards: smallint(),
  rushingYards: smallint(),
  passingYards: smallint(),
  passingTds: smallint(),
  /** Anything else the provider sends, for later signals. */
  extra: jsonb().$type<Record<string, unknown>>(),
  runId: text().notNull(),
  updatedAt: tstz().notNull(),
}, (t) => [primaryKey({ columns: [t.gameId, t.playerId] })]);

/**
 * When each prop first became a gem, and when it was last marked read, with the rating each time. Feeds
 * the New gems row: a gem is new when it crosses 90 or jumps 15 since it was found or last read.
 */
export const gemMarks = pgTable('gem_marks', {
  selectionKey: text().primaryKey(),
  foundAt: tstz().notNull(),
  foundRating: integer().notNull(),
  readAt: tstz(),
  readRating: integer(),
});

/**
 * The model's inputs: each skill player's usage per game from nflverse play by play and snap counts
 * (core UsageGame). Current state, rebuilt by pull-usage; estimates keep the history of what it produced.
 */
export const playerUsage = pgTable('player_usage', {
  gameId: text().notNull().references(() => games.id),
  playerId: text().notNull().references(() => players.id),
  season: smallint().notNull(),
  week: smallint().notNull(),
  teamId: text().notNull().references(() => teams.id),
  position: text().notNull(),
  /** Offensive snap share, 0 to 1; null until snap counts land. */
  snapPct: doublePrecision(),
  rzCarries: smallint().notNull().default(0),
  rzTargets: smallint().notNull().default(0),
  rzCarryTds: smallint().notNull().default(0),
  rzTargetTds: smallint().notNull().default(0),
  touchdowns: smallint().notNull().default(0),
  runId: text().notNull(),
  updatedAt: tstz().notNull(),
}, (t) => [primaryKey({ columns: [t.gameId, t.playerId] }), index().on(t.season)]);

export const bets = pgTable('bets', {
  id: uuid(),
  placedAt: tstz().notNull(),
  ...selection,
  bookId: text().notNull().references(() => books.id),
  priceDecimal: doublePrecision().notNull(),
  stake: numeric({ precision: 10, scale: 2 }).notNull(),
  /** open, won, lost, push, void */
  status: text().notNull().default('open'),
  payout: numeric({ precision: 10, scale: 2 }),
  /** The last price before kickoff, for beating the closing line. */
  closingPrice: doublePrecision(),
  settledAt: tstz(),
  note: text(),
  createdAt: createdAt(),
}, (t) => [index().on(t.placedAt), index().on(t.status)]);

// ---------------------------------------------------------------- Runs, logs and providers

/** One row per job run: the pull log. */
export const runs = pgTable('runs', {
  id: uuid(),
  job: text().notNull(),
  provider: text(),
  /** cron, manual, cli, test */
  trigger: text().notNull(),
  /** running, succeeded, warned, failed */
  status: text().notNull().default('running'),
  /** On failure, whose move it is: ours (fix it) or provider (wait for them). See Facet patterns/failures.md. */
  failureOwner: text(),
  errorCode: text(),
  /** One sentence with the numbers in it ("Pulled 386 prices across 3 books"). */
  message: text(),
  requestCount: integer().notNull().default(0),
  rowsWritten: integer().notNull().default(0),
  meta: jsonb().$type<Record<string, unknown>>(),
  startedAt: createdAt(),
  finishedAt: tstz(),
  durationMs: integer(),
}, (t) => [index().on(t.job, t.startedAt), index().on(t.startedAt)]);

export const runLogs = pgTable('run_logs', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  runId: text().notNull().references(() => runs.id, { onDelete: 'cascade' }),
  at: createdAt(),
  /** info, warn, error */
  level: text().notNull(),
  message: text().notNull(),
  data: jsonb().$type<Record<string, unknown>>(),
}, (t) => [index().on(t.runId)]);

/** Cron delivery can overlap or repeat; a job holds its lock row while it runs. */
export const jobLocks = pgTable('job_locks', {
  job: text().primaryKey(),
  holder: text(),
  lockedUntil: tstz(),
});

/** Per-source settings managed from Data health. A paused source skips its scheduled runs; Pull now still works. */
export const jobSettings = pgTable('job_settings', {
  job: text().primaryKey(),
  paused: boolean().notNull().default(false),
  pausedAt: tstz(),
  updatedAt: createdAt(),
});

/** API quota per provider, from response headers, for the usage meters. */
export const providerUsage = pgTable('provider_usage', {
  provider: text().primaryKey(),
  used: integer(),
  remaining: integer(),
  updatedAt: tstz().notNull().default(sql`now()`),
});
