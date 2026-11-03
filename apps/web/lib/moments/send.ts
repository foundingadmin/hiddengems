// Send (docs/animation/micro-moments/moments.md, "Send"): the slip dissolves into dots that scatter across the
// screen, gather into one large gem, hold, then swirl out through the edges. The gem is Hidden Gems' own mark as
// 163 dots (gem-dots.json: [x, y, radius, tone] in a 100 unit box, tone 0 brightest), kept beside the scenes.
// The send has already happened when this plays (state first) and nothing waits on it; leaving the page ends it.
import { type BrandTone, type Stage, reducedMotion } from '@foundingcreative/facet/js/dots.mjs';
import GEM from './gem-dots.json';

/** moments.md: gather 1.8s, hold 1s, out 860ms. */
export const GATHER_MS = 1800;
export const HOLD_MS = 1000;
export const OUT_MS = 860;
/** The slip card fades as its dots leave, and returns as they swirl out. */
const FADE_MS = 420;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y) || 1;

/**
 * Plays the moment from source (the slip card, or the control when the card is not shown). The card fades out
 * while it plays and comes back at the end. Resolves when it ends or signal aborts.
 */
export async function sendMoment(stage: Stage, source: Element, signal?: AbortSignal): Promise<void> {
  if (reducedMotion() || signal?.aborted) return;
  const W = window.innerWidth, H = window.innerHeight, src = source.getBoundingClientRect();
  // The gem takes most of a phone's width and stays a calm size on a desktop.
  const k = Math.min(3.6, (Math.min(W, H) * 0.8) / 100), cx = W / 2, cy = H / 2;
  // Time left until ms after the start, so every dot holds and leaves together whatever its path took. The stage
  // pauses while the tab is hidden (the sportsbook opens in a new one), so the schedule does too.
  let t0 = performance.now(), hiddenAt = document.hidden ? t0 : 0;
  const until = (ms: number) => Math.max(16, t0 + ms - (hiddenAt || performance.now()));
  const onVisibility = () => {
    if (document.hidden) hiddenAt = performance.now();
    else if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; }
  };
  document.addEventListener('visibilitychange', onVisibility);
  const fade = source.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' });
  const reach = Math.hypot(W, H) * 0.6;

  const one = async ([gx, gy, gr, gt]: number[]) => {
    const tone = (gt! + 1) as BrandTone;
    const f = { x: cx + (gx! - 50) * k, y: cy + (gy! - 50) * k }, fr = gr! * k;
    const s = { x: rnd(src.left, src.right), y: rnd(src.top, src.bottom) };
    const w = { x: rnd(W * 0.04, W * 0.96), y: rnd(H * 0.04, H * 0.96) };
    const r = rnd(1.4, 4.2), arrive = rnd(0.45, 0.86) * GATHER_MS;
    const l1 = dist(s, w), l2 = dist(w, f), mid = (arrive * l1) / (l1 + l2);
    const go = (from: { x: number; y: number }, rr: number) => ({ ...from, r: rr, tone });
    // Out of the slip and across the screen, then into place in the gem.
    await stage.fly(go(s, r * 0.6), { to: w, duration: until(mid), size: [r * 0.6, r, r], ease: 'in', arc: rnd(-90, 90), signal });
    if (signal?.aborted) return;
    await stage.fly(go(w, r), { to: f, duration: until(arrive), size: [r, r, 2], ease: 'out', arc: rnd(-60, 60), signal });
    if (signal?.aborted) return;
    // It lands small and pops to its size while the rest arrive.
    await stage.fly(go(f, 2), { duration: until(GATHER_MS), size: [2, fr * 1.3 + 1, fr], signal });
    if (signal?.aborted) return;
    // Hold: a slow swell crosses the gem from its top left.
    const wave = Math.max(0, Math.min(1, ((f.x - cx) + (f.y - cy) * 1.3) / (100 * k) + 0.5)) * HOLD_MS * 0.4;
    await stage.fly(go(f, fr), { delay: wave, duration: until(GATHER_MS + HOLD_MS) - wave, size: [fr, fr * 1.14, fr], signal });
    if (signal?.aborted) return;
    // Out: every dot turns the same way and leaves through the edges, growing as it fades.
    const a = Math.atan2(f.y - cy, f.x - cx) + rnd(0.7, 1.2), far = reach + dist(f, { x: cx, y: cy }) * 2;
    const to = { x: cx + Math.cos(a) * far, y: cy + Math.sin(a) * far };
    await stage.fly(go(f, fr), { to, duration: until(GATHER_MS + HOLD_MS + OUT_MS), size: [fr, fr * 1.6, fr * 2.2], opacity: [1, 0], ease: 'in', arc: dist(f, to) * 0.28, signal });
  };

  await Promise.all((GEM as number[][]).map(one));
  document.removeEventListener('visibilitychange', onVisibility);
  if (!source.isConnected) return;
  fade.cancel();
  if (!signal?.aborted) source.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS });
}
