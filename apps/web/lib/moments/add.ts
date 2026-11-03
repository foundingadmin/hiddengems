// Add a gem (docs/animation/micro-moments/moments.md, "Add a gem"): the row is already on the slip when this plays
// (state first). Nothing flies to the Slips tab (motion rule 6); the Slips nav item answers with an edge glint,
// rippling from the item along the phone tab bar's top edge or the rail item's bottom edge. The rail slip's leg
// count pops when the server's answer lands (.fc-railslip-count[data-pop], 220ms, --fc-duration-pop).
import type { Stage } from '@foundingcreative/facet/js/dots.mjs';

/** moments.md, Add a gem: glint 820ms. */
export const GLINT_MS = 820;

const shown = (el: Element | null): el is HTMLElement =>
  !!el && (typeof (el as HTMLElement).checkVisibility === 'function' ? (el as HTMLElement).checkVisibility() : (el as HTMLElement).offsetParent !== null);

/** Glints the visible Slips nav item: the tab bar under 768px, else the rail. Resolves when it ends or aborts. */
export function glintSlips(stage: Stage, signal?: AbortSignal): Promise<void> {
  const tabbar = document.querySelector('.fc-tabbar');
  const tab = tabbar?.querySelector('a[href^="/slips"]') ?? null;
  if (shown(tabbar) && tab) return stage.ripple(tabbar, { from: tab, duration: GLINT_MS, signal });
  const item = document.querySelector('.fc-sidenav-item[href^="/slips"]');
  if (shown(item)) return stage.ripple(item, { duration: GLINT_MS, signal });
  return Promise.resolve();
}
