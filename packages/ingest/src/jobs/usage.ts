// pull-usage: the model's inputs from nflverse. Each skill player's usage per game this season (inside 10
// carries and targets, touchdowns, snap share) into player_usage, and the latest injury report onto
// players. Then picks are rebuilt, so fresh stats reach the board without waiting for the next odds pull.
import { seasonOf } from '@hiddengems/core';
import { playerUsage, players } from '@hiddengems/db';
import { inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { Job } from '../runner';
import { chunks, plural, refMap, teamId } from './shared';

export const pullUsage: Job = {
  name: 'pull-usage',
  provider: 'usage',
  then: ['build-picks'],
  async run(ctx) {
    const { db, now } = ctx;
    const provider = ctx.providers.usage;
    const pctx = ctx.using(provider);
    const season = seasonOf(now);
    const [lines, report] = await Promise.all([provider.gameUsage(pctx, season), provider.injuries(pctx, season)]);

    const gameRefs = await refMap(db, provider.id, 'game', [...new Set(lines.map((l) => l.gameExternalId))]);
    const playerRefs = await refMap(db, provider.id, 'player', [...new Set(lines.map((l) => l.playerExternalId))]);
    const rows: (typeof playerUsage.$inferInsert)[] = [];
    const missingPlayers = new Set<string>(), missingGames = new Set<string>();
    for (const l of lines) {
      const gameId = gameRefs.get(l.gameExternalId), playerId = playerRefs.get(l.playerExternalId), team = teamId(l.team);
      if (!gameId) { missingGames.add(l.gameExternalId); continue; }
      if (!playerId || !team) { missingPlayers.add(l.playerExternalId); continue; }
      rows.push({
        gameId, playerId, season, week: l.week, teamId: team, position: l.position, snapPct: l.snapPct,
        rzCarries: l.rzCarries, rzTargets: l.rzTargets, rzCarryTds: l.rzCarryTds, rzTargetTds: l.rzTargetTds, touchdowns: l.touchdowns,
        runId: ctx.runId, updatedAt: now,
      });
    }
    for (const batch of chunks(rows)) {
      await db.insert(playerUsage).values(batch).onConflictDoUpdate({
        target: [playerUsage.gameId, playerUsage.playerId],
        set: {
          week: sql`excluded.week`, teamId: sql`excluded.team_id`, position: sql`excluded.position`, snapPct: sql`excluded.snap_pct`,
          rzCarries: sql`excluded.rz_carries`, rzTargets: sql`excluded.rz_targets`, rzCarryTds: sql`excluded.rz_carry_tds`,
          rzTargetTds: sql`excluded.rz_target_tds`, touchdowns: sql`excluded.touchdowns`, runId: sql`excluded.run_id`, updatedAt: sql`excluded.updated_at`,
        },
      });
    }
    if (missingGames.size) ctx.log('warn', `${plural(missingGames.size, 'game')} with usage are not on the schedule`, { gameIds: [...missingGames].slice(0, 25) });
    if (missingPlayers.size) ctx.log('warn', `${plural(missingPlayers.size, 'player')} with usage are not on the roster`, { playerIds: [...missingPlayers].slice(0, 25) });

    // Injury report: the latest week replaces the last one.
    let listed = 0;
    if (report) {
      const refs = await refMap(db, provider.id, 'player', [...new Set(report.statuses.map((s) => s.playerExternalId))]);
      // One update per distinct entry (status, practice, injury), so a week's report is a few dozen statements.
      const byEntry = new Map<string, { status: string | null; practice: string | null; injury: string | null; ids: string[] }>();
      for (const s of report.statuses) {
        const id = refs.get(s.playerExternalId);
        if (!id) continue;
        const entry = { status: s.status, practice: s.practice ?? null, injury: s.injury ?? null };
        const key = JSON.stringify(entry);
        byEntry.set(key, { ...entry, ids: [...(byEntry.get(key)?.ids ?? []), id] });
      }
      await db.transaction(async (tx) => {
        await tx.update(players).set({ injuryStatus: null, injuryWeek: null, practiceStatus: null, injuryDetail: null })
          .where(or(isNotNull(players.injuryStatus), isNotNull(players.practiceStatus)));
        for (const e of byEntry.values()) {
          for (const batch of chunks(e.ids)) {
            await tx.update(players).set({ injuryStatus: e.status, practiceStatus: e.practice, injuryDetail: e.injury, injuryWeek: report.week }).where(inArray(players.id, batch));
          }
          if (e.status) listed += e.ids.length;
        }
      });
    }
    const weeks = new Set(rows.map((r) => r.week));
    return {
      message: `Pulled usage for ${plural(rows.length, 'player game')} across ${plural(weeks.size, 'week')}, ${listed} on the injury report`,
      rowsWritten: rows.length,
      warned: missingGames.size > 0,
    };
  },
};
