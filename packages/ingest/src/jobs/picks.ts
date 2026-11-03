// build-picks: reads every anytime TD prop with the Hidden Gems v3.0 model (core readProp(): this
// season's usage, implied team points, the injury report and every book's price), then appraises it at
// the purchase book's posted price (core appraise()): gem with its 0 to 100 rating, Fool's Gold, no gem,
// or unrated without 2026 stats. Estimates are appended (history); the picks table is replaced for the
// games it covers. Then any game whose kickoff freeze was pulled goes on record (records.ts).
import {
  type GameLine, MODEL_V3, PURCHASE_BOOK, type UsageGame, appraise, clarityScore, impliedFactor, playerForms, readProp, recommendedScore, seasonOf,
} from '@hiddengems/core';
import { estimates, gemMarks, games, oddsLatest, picks, playerUsage, players } from '@hiddengems/db';
import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import type { Job } from '../runner';
import { recordFrozenGames } from './records';
import { chunks, plural } from './shared';

export const buildPicks: Job = {
  name: 'build-picks',
  async run(ctx) {
    const { db, now } = ctx;
    const rows = await db.select({ o: oddsLatest }).from(oddsLatest)
      .innerJoin(games, eq(games.id, oddsLatest.gameId))
      .where(and(eq(oddsLatest.available, true), gt(games.kickoffAt, now)));
    if (!rows.length) return { skipped: 'No current prices to appraise' };

    const bySelection = new Map<string, (typeof rows)[number]['o'][]>();
    for (const { o } of rows) bySelection.set(o.selectionKey, [...(bySelection.get(o.selectionKey) ?? []), o]);

    // The model's inputs: this season's usage from games already played, the schedule's lines, the injury report.
    const season = seasonOf(now);
    const usage = await db.select().from(playerUsage).innerJoin(games, eq(games.id, playerUsage.gameId))
      .where(and(eq(playerUsage.season, season), lt(games.kickoffAt, now)));
    const logs: UsageGame[] = usage.map(({ player_usage: u }) => ({
      playerId: u.playerId, gameId: u.gameId, week: u.week, team: u.teamId, position: u.position, snapPct: u.snapPct,
      rzCarries: u.rzCarries, rzTargets: u.rzTargets, rzCarryTds: u.rzCarryTds, rzTargetTds: u.rzTargetTds, touchdowns: u.touchdowns,
    }));
    const forms = playerForms(logs);
    const seasonGames = await db.select().from(games).where(eq(games.season, season));
    const lines: GameLine[] = seasonGames.filter((g) => g.week !== null && g.seasonType === 'reg').map((g) => ({
      gameId: g.id, week: g.week!, homeTeam: g.homeTeamId, awayTeam: g.awayTeamId, spreadLine: g.spreadLine, totalLine: g.totalLine,
    }));
    const lineBy = new Map(lines.map((l) => [l.gameId, l]));
    const playerIds = [...new Set(rows.map((r) => r.o.playerId).filter((id): id is string => Boolean(id)))];
    const injuryBy = new Map((playerIds.length ? await db.select({ id: players.id, injury: players.injuryStatus }).from(players).where(inArray(players.id, playerIds)) : [])
      .map((p) => [p.id, p.injury]));

    const pickRows: (typeof picks.$inferInsert)[] = [];
    const estimateRows: (typeof estimates.$inferInsert)[] = [];
    const counts = { gem: 0, 'fools-gold': 0, none: 0, unrated: 0 };
    let noPosted = 0;
    for (const [key, quotes] of bySelection) {
      const posted = quotes.find((q) => q.bookId === PURCHASE_BOOK);
      if (!posted) { noPosted++; continue; }
      const form = posted.playerId ? forms.get(posted.playerId) ?? null : null;
      const line = lineBy.get(posted.gameId);
      const implied = form && line ? impliedFactor(line, form.team, lines) : null;
      const injury = posted.playerId ? injuryBy.get(posted.playerId) ?? null : null;
      const read = readProp({ form, impliedFactor: implied?.factor, price: posted.priceDecimal, bookPrices: quotes.map((q) => q.priceDecimal), injuryStatus: injury });
      const hitChance = read.hitChance;
      const clarity = clarityScore(read.parts);
      const gem = appraise({ hitChance, price: posted.priceDecimal, clarity, hasStats: read.hasStats });
      counts[gem.kind]++;
      const selection = { selectionKey: key, gameId: posted.gameId, marketId: posted.marketId, playerId: posted.playerId, playerName: posted.playerName, side: posted.side, line: posted.line };
      estimateRows.push({
        ...selection, runId: ctx.runId, probability: hitChance, model: MODEL_V3, computedAt: now,
        inputs: {
          books: Object.fromEntries(quotes.map((q) => [q.bookId, q.priceDecimal])), statsChance: read.statsChance, statsWeight: read.statsWeight, fair: read.fair,
          impliedFactor: implied?.factor ?? null, impliedPoints: implied?.points ?? null, injury, clarity: read.parts,
          form: form && { games: form.games, tdGames: form.tdGames, lambda: form.lambda, rzCarriesPerGame: form.rzCarriesPerGame, rzTargetsPerGame: form.rzTargetsPerGame, snapRecent: form.snapRecent, snapSeason: form.snapSeason },
        },
      });
      pickRows.push({
        ...selection, bookId: posted.bookId, price: posted.priceDecimal, priced: gem.priced, fair: gem.fair, hitChance, clarity,
        carat: gem.carat, gapToPosted: gem.gapToPosted, kind: gem.kind, rating: gem.rating,
        recommended: recommendedScore({ kind: gem.kind, hitChance, clarity }), model: MODEL_V3, link: posted.link, runId: ctx.runId, updatedAt: now,
      });
    }

    const gameIds = [...new Set(rows.map((r) => r.o.gameId))];
    await db.transaction(async (tx) => {
      for (const batch of chunks(estimateRows)) await tx.insert(estimates).values(batch);
      await tx.delete(picks).where(inArray(picks.gameId, gameIds));
      for (const batch of chunks(pickRows)) await tx.insert(picks).values(batch);
      // First time each prop is a gem: when it was found, and its rating then.
      const found = pickRows.filter((p) => p.kind === 'gem').map((p) => ({ selectionKey: p.selectionKey, foundAt: now, foundRating: p.rating ?? 0 }));
      for (const batch of chunks(found)) await tx.insert(gemMarks).values(batch).onConflictDoNothing();
    });
    if (noPosted) ctx.log('info', `${plural(noPosted, 'prop')} had no DraftKings price yet`);
    // Games whose freeze was just pulled: their board goes on record for grading.
    const recorded = await recordFrozenGames(ctx);
    if (!recorded) ctx.log('info', 'Gem records start once the database update runs (pnpm db:supabase-sql)');
    const onRecord = recorded?.written ? `, recorded ${plural(recorded.written, 'prop')} at the freeze` : '';
    return {
      message: `Appraised ${plural(pickRows.length, 'prop')} for ${plural(gameIds.length, 'game')}: ${plural(counts.gem, 'gem')}, ${counts['fools-gold']} Fool's Gold, ${counts.unrated} unrated${onRecord}`,
      rowsWritten: pickRows.length + (recorded?.written ?? 0),
      meta: { model: MODEL_V3, ...counts, recorded: recorded?.written ?? null, recordedGames: recorded?.games ?? [] },
    };
  },
};
