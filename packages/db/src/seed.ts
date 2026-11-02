// Reference data: teams (from Facet's NFL kit, through core), books and markets. Idempotent.
import { BOOKS, MARKETS, teams as allTeams } from '@hiddengems/core';
import { sql } from 'drizzle-orm';
import type { Db } from './client';
import { books, markets, teams } from './schema';

export async function seedReference(db: Db): Promise<void> {
  await db.insert(teams).values(allTeams.map((t) => ({
    id: t.id, abbr: t.abbr, city: t.city, name: t.name, conference: t.conference, division: t.division,
  }))).onConflictDoUpdate({
    target: teams.id,
    set: { abbr: sql`excluded.abbr`, city: sql`excluded.city`, name: sql`excluded.name`, conference: sql`excluded.conference`, division: sql`excluded.division` },
  });
  await db.insert(books).values(BOOKS.map((b) => ({ ...b })))
    .onConflictDoUpdate({ target: books.id, set: { name: sql`excluded.name` } });
  await db.insert(markets).values(MARKETS.map((m) => ({ ...m })))
    .onConflictDoUpdate({ target: markets.id, set: { label: sql`excluded.label`, kind: sql`excluded.kind`, scope: sql`excluded.scope` } });
}
