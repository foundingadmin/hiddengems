// Unread to read (docs/animation/micro-moments/moments.md, "Unread to read"): a small cloud sweeps the shine off
// each card, top down. The read state is already set when this plays (state first); the card's tint fades as its
// cloud passes through --fc-state-delay. The cards may unmount when the server answers; their clouds finish on
// the shared stage, whose positions were read at the start.
import { type Stage, type SweepOptions, reducedMotion } from '@foundingcreative/facet/js/dots.mjs';

/** moments.md: sweep 420ms, 170ms apart; the shine goes 170ms into each sweep. */
export const SWEEP_MS = 420;
export const STAGGER_MS = 170;

const CLOUD: SweepOptions = {
  duration: SWEEP_MS, count: 16, size: [2.6, 0.3], spread: [[16, 13], [30, 20]], opacity: [1, 0.3], arc: 0, lift: 0, inset: 10,
};

/** When card i's tint starts to fade, as a CSS time for --fc-state-delay. None under reduced motion. */
export function readDelay(i: number): string {
  return reducedMotion() ? '0ms' : `${STAGGER_MS * (i + 1)}ms`;
}

/** Sweeps each card in order. Resolves when the last cloud has passed. */
export function sweepRead(stage: Stage, cards: HTMLElement[], signal?: AbortSignal): Promise<void> {
  return Promise.all(cards.map((card, i) => stage.sweep(card, { ...CLOUD, from: 'left', delay: i * STAGGER_MS, signal }))).then(() => {});
}

/** A failed read plays it backward: the cloud returns across each card as its shine comes back. */
export function unsweepRead(stage: Stage, cards: HTMLElement[]): Promise<void> {
  return Promise.all(cards.map((card, i) => stage.unsweep(card, { ...CLOUD, size: [0.3, 2.6], spread: [[30, 20], [16, 13]], opacity: [0.3, 1], to: 'left', delay: i * STAGGER_MS }))).then(() => {});
}
