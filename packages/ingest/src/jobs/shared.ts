import { findTeam } from '@hiddengems/core';
import { type Db, providerRefs } from '@hiddengems/db';
import { and, eq, inArray } from 'drizzle-orm';

/** Resolves a provider's team name or abbreviation to our team id, or null. */
export const teamId = (name: string | null | undefined): string | null => (name ? findTeam(name)?.id ?? null : null);

/** externalId to internalId for one provider and entity. */
export async function refMap(db: Db, provider: string, entity: 'player' | 'game', externalIds?: string[]): Promise<Map<string, string>> {
  if (externalIds && externalIds.length === 0) return new Map();
  const where = externalIds
    ? and(eq(providerRefs.provider, provider), eq(providerRefs.entity, entity), inArray(providerRefs.externalId, externalIds))
    : and(eq(providerRefs.provider, provider), eq(providerRefs.entity, entity));
  const rows = await db.select().from(providerRefs).where(where);
  return new Map(rows.map((r) => [r.externalId, r.internalId]));
}

/** Splits rows into batches, so one insert never carries thousands of parameters. */
export function chunks<T>(rows: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
