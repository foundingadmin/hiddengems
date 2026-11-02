// pull-schedule: games for the current season, with kickoffs, status and scores.
import { gameId, seasonOf } from '@hiddengems/core';
import { games, providerRefs } from '@hiddengems/db';
import { inArray, sql } from 'drizzle-orm';
import type { Job } from '../runner';
import { chunks, plural, refMap, teamId } from './shared';

export const pullSchedule: Job = {
  name: 'pull-schedule',
  provider: 'schedule',
  async run(ctx) {
    const provider = ctx.providers.schedule;
    const season = seasonOf(ctx.now);
    const feed = await provider.schedule(ctx.using(provider), season);
    const known = await refMap(ctx.db, provider.id, 'game');

    const rows: (typeof games.$inferInsert)[] = [];
    const refs: (typeof providerRefs.$inferInsert)[] = [];
    const moved: string[] = [];
    for (const g of feed) {
      const away = teamId(g.awayTeam), home = teamId(g.homeTeam);
      if (!away || !home) { ctx.log('warn', `Skipped a game with unknown teams: ${g.awayTeam} at ${g.homeTeam}`, { externalId: g.externalId }); continue; }
      const id = gameId(g.kickoff, away, home);
      const before = known.get(g.externalId);
      if (before && before !== id) moved.push(before);
      rows.push({
        id, season: g.season, seasonType: g.seasonType, week: g.week, kickoffAt: g.kickoff, awayTeamId: away, homeTeamId: home,
        neutralSite: g.neutralSite, status: g.status, awayScore: g.awayScore, homeScore: g.homeScore, updatedAt: ctx.now,
      });
      refs.push({ provider: provider.id, entity: 'game', externalId: g.externalId, internalId: id });
    }

    for (const batch of chunks(rows)) {
      await ctx.db.insert(games).values(batch).onConflictDoUpdate({
        target: games.id,
        set: {
          season: sql`excluded.season`, seasonType: sql`excluded.season_type`, week: sql`excluded.week`, kickoffAt: sql`excluded.kickoff_at`,
          neutralSite: sql`excluded.neutral_site`, status: sql`excluded.status`, awayScore: sql`excluded.away_score`,
          homeScore: sql`excluded.home_score`, updatedAt: sql`excluded.updated_at`,
        },
      });
    }
    for (const batch of chunks(refs)) {
      await ctx.db.insert(providerRefs).values(batch)
        .onConflictDoUpdate({ target: [providerRefs.provider, providerRefs.entity, providerRefs.externalId], set: { internalId: sql`excluded.internal_id` } });
    }
    // A game that moved to another date gets a new id; its old row must stop looking playable.
    if (moved.length) {
      await ctx.db.update(games).set({ status: 'postponed', updatedAt: ctx.now }).where(inArray(games.id, moved));
      ctx.log('warn', `${plural(moved.length, 'game')} moved to a new date`, { previousIds: moved });
    }
    const finals = rows.filter((r) => r.status === 'final').length;
    return { message: `Pulled ${plural(rows.length, 'game')} for the ${season} season, ${finals} final`, rowsWritten: rows.length };
  },
};
