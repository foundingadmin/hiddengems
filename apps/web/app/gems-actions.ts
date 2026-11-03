'use server';
// Mark read: records when each gem was read and its rating then, so it leaves the New gems row until it
// crosses 90 or jumps 15 again (core newGemReason).
import { gemMarks, picks } from '@hiddengems/db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db, READ_ONLY } from '@/lib/db';

export async function markRead(keys: string[]): Promise<void> {
  if (!keys.length || READ_ONLY) return;
  const { db: d } = await db();
  const now = new Date();
  const current = await d.select({ key: picks.selectionKey, rating: picks.rating }).from(picks)
    .where(and(inArray(picks.selectionKey, keys.slice(0, 200)), eq(picks.kind, 'gem')));
  for (const c of current) {
    await d.insert(gemMarks).values({ selectionKey: c.key, foundAt: now, foundRating: c.rating ?? 0, readAt: now, readRating: c.rating ?? 0 })
      .onConflictDoUpdate({ target: gemMarks.selectionKey, set: { readAt: sql`excluded.read_at`, readRating: sql`excluded.read_rating` } });
  }
  revalidatePath('/', 'layout');
}
