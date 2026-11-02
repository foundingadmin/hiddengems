// pull-rosters: players with team, position and jersey number (the number trails names in the slate).
import { nameKey } from '@hiddengems/core';
import { players, providerRefs } from '@hiddengems/db';
import { sql } from 'drizzle-orm';
import type { Job } from '../runner';
import { chunks, plural, refMap, teamId } from './shared';

export const pullRosters: Job = {
  name: 'pull-rosters',
  provider: 'rosters',
  async run(ctx) {
    const provider = ctx.providers.rosters;
    const feed = await provider.players(ctx.using(provider));
    const known = await refMap(ctx.db, provider.id, 'player');

    let created = 0;
    const rows: (typeof players.$inferInsert)[] = [];
    const refs: (typeof providerRefs.$inferInsert)[] = [];
    for (const p of feed) {
      let id = known.get(p.externalId);
      if (!id) { id = crypto.randomUUID(); created++; refs.push({ provider: provider.id, entity: 'player', externalId: p.externalId, internalId: id }); }
      rows.push({
        id, name: p.name, nameKey: nameKey(p.name), position: p.position, teamId: teamId(p.team),
        jerseyNumber: p.jerseyNumber, status: p.status, updatedAt: ctx.now,
      });
    }
    for (const batch of chunks(rows)) {
      await ctx.db.insert(players).values(batch).onConflictDoUpdate({
        target: players.id,
        set: {
          name: sql`excluded.name`, nameKey: sql`excluded.name_key`, position: sql`excluded.position`, teamId: sql`excluded.team_id`,
          jerseyNumber: sql`excluded.jersey_number`, status: sql`excluded.status`, updatedAt: sql`excluded.updated_at`,
        },
      });
    }
    for (const batch of chunks(refs)) await ctx.db.insert(providerRefs).values(batch).onConflictDoNothing();
    return { message: `Pulled ${plural(rows.length, 'player')}, ${created} new`, rowsWritten: rows.length };
  },
};
