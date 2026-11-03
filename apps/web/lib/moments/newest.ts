// Unread gems (docs/animation/micro-moments/moments.md, "Unread gems"): six dots circle the newest unread card,
// one lap every 5.2s. The card's own unread tint and sheen are Facet's data-unread state.
// The orbit loops, so it draws on a stage inside the card's scroller: it scrolls with the row and stays under
// the sticky top bar. A named exception to the one-loop rule (packages/facet/foundations/layout-materials-motion.md).
import { createStage, reducedMotion } from '@foundingcreative/facet/js/dots.mjs';

/** moments.md, Unread gems: "Six dots circle the newest", circle 5.2s. */
export const ORBIT = { count: 6, period: 5200 } as const;

/** Picks the newest unread gem: the latest to become new; the first in the row on a tie. */
export function newestKey<T extends { key: string; fresh: { since: string } | null }>(rows: T[]): string | null {
  let best: T | null = null;
  for (const r of rows) if (r.fresh && (!best || r.fresh.since > best.fresh!.since)) best = r;
  return best?.key ?? null;
}

/** Starts the orbit around card, drawn inside host (the row's scroller wrap). Returns the cleanup. */
export function orbitNewest(card: HTMLElement, host: HTMLElement): () => void {
  if (reducedMotion()) return () => {};
  const stage = createStage(host, { outset: 'var(--fc-space-2)' });
  const stop = new AbortController();
  void stage.orbit(card, { ...ORBIT, signal: stop.signal });
  return () => { stop.abort(); stage.destroy(); };
}
