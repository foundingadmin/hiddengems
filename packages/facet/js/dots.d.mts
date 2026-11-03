// Types for js/dots.mjs, the moments engine (patterns/moments.md).

/** A point in viewport (client) coordinates. */
export interface Point { x: number; y: number }
/** A point, or an element, which stands for its center. */
export type Target = Point | Element;
/** Brand tones, --fc-illus-1 to 4. The only tones a travelling dot can take (motion rule 2). */
export type BrandTone = 1 | 2 | 3 | 4;
/** Every tone the stage can resolve, including the gray context ramp for still dots. */
export type Tone = BrandTone | 'context-1' | 'context-2' | 'context-3' | 'context-4';
/** A dot in viewport coordinates. */
export interface Dot { x: number; y: number; r: number; tone?: BrandTone }

interface Common {
  /** Ends the moment early; its Promise resolves. */
  signal?: AbortSignal;
  /** ms before it starts. */
  delay?: number;
}
export interface CloudOptions extends Common {
  from: Target;
  to: Target;
  /** ms. Default 520. */
  duration?: number;
  /** Dots in the cloud. Default 16. */
  count?: number;
  /** Dot radius at the start and the end, px. Default [2.6, 0.3]. */
  size?: [number, number];
  /** The cloud's x and y radius at the start and the end, px. Default [[16, 13], [30, 20]]. */
  spread?: [[number, number], [number, number]];
  /** Default [1, 1]. */
  opacity?: [number, number];
  /** Sideways bow of the path, px. Default 0. */
  arc?: number;
  /** Pull the cloud in over its last sixth, as if the target took it. */
  absorb?: boolean;
  /** Default [1, 2, 2, 3]. Anything but brand tones is ignored. */
  tones?: BrandTone[];
  /** Keep the dots inside what clips this element (its scrolling ancestors). */
  clip?: Element;
}
export interface FlyOptions extends Common {
  to?: Target;
  duration?: number;
  /** Radius at the start, the middle and the end. Default the dot's r throughout. */
  size?: [number, number, number];
  opacity?: [number, number];
  arc?: number;
  ease?: 'io' | 'in' | 'out';
  clip?: Element;
}
export interface SweepOptions extends Common {
  /** Where the cloud starts: an end of the element, or a control (it heads for the far end). Default 'left'. */
  from?: 'left' | 'right' | Target;
  /** ms. Default 660, the remove sweep. */
  duration?: number;
  /** Default 36. */
  count?: number;
  /** Default [4.6, 0.2]. */
  size?: [number, number];
  /** Default [[30, 19], [62, 40]]. */
  spread?: [[number, number], [number, number]];
  /** Default [1, 0.35]. */
  opacity?: [number, number];
  /** Default 6. */
  arc?: number;
  /** How far the cloud rises on its way, px. Default 8. */
  lift?: number;
  /** How far inside the element's ends the cloud starts and stops, px. Default 6. */
  inset?: number;
  tones?: BrandTone[];
  /** Clip the element away behind the cloud and leave it clipped until unsweep. */
  wipe?: boolean;
  /** Default the swept element, so a card in a scroller keeps its dots in the scroller. null for none. */
  clip?: Element | null;
}
export interface UnsweepOptions extends Omit<SweepOptions, 'from' | 'wipe'> {
  /** Where the cloud returns to. Default 'left'. */
  to?: 'left' | 'right' | Target;
  /** The element was rendered again after its sweep (a restored row): start it wiped and show it behind the cloud. */
  reveal?: boolean;
}
export interface RippleOptions {
  signal?: AbortSignal;
  /** Where the ripple starts; this element carries data-glint while it plays. Default the element. */
  from?: Target;
  /** Default the element's --fc-glint-edge, else top. */
  edge?: 'top' | 'right' | 'bottom' | 'left';
  /** ms. Default 820. */
  duration?: number;
  /** px between dots. Default 11. */
  spacing?: number;
}
export interface OrbitOptions {
  /** Stops the orbit; until then it loops. */
  signal?: AbortSignal;
  /** Default 6. */
  count?: number;
  /** ms per lap. Default 5200. */
  period?: number;
  /** Lead dot radius, px. Default 2.1. */
  size?: number;
}
export interface StageOptions {
  /** With a host: cover the host (default) or the viewport from inside it (a modal dialog). */
  cover?: 'host' | 'viewport';
  /** Grow a host canvas past the host's edges, as a CSS length: 'var(--fc-space-2)'. */
  outset?: string;
}

export interface Stage {
  readonly canvas: HTMLCanvasElement;
  /** A tone as a canvas color, read from --fc-illus-* and refreshed when the theme changes. */
  tone(n: Tone): string;
  /** A group of dots travelling together, chaotic inside the group. */
  cloud(o: CloudOptions): Promise<void>;
  /** One dot from where it is to o.to. */
  fly(dot: Dot, o: FlyOptions): Promise<void>;
  /** Dots drift, shrink and fade to nothing. */
  dust(dots: Dot[], o?: { signal?: AbortSignal; clip?: Element }): Promise<void>;
  /** A cloud sweeps across the element from one end to the other. */
  sweep(el: Element, o?: SweepOptions): Promise<void>;
  /** The sweep in reverse; restores a wiped element. */
  unsweep(el: Element, o?: UnsweepOptions): Promise<void>;
  /** Dots along one edge ripple outward from a point: the edge glint and the sheet shimmer. */
  ripple(el: Element, o?: RippleOptions): Promise<void>;
  /** Dots circle the element's border until o.signal aborts. */
  orbit(el: Element, o?: OrbitOptions): Promise<void>;
  /** Ends every moment on the stage now. */
  stop(): void;
  /** Ends every moment and removes the canvas and its listeners. */
  destroy(): void;
}

/** A stage on host, or a fixed full-viewport stage on document.body. */
export declare function createStage(host?: HTMLElement | null, opts?: StageOptions): Stage;
/** True while the reader asks for reduced motion. */
export declare function reducedMotion(): boolean;
/** Motion rule 1: sets each dot's drawn radius rr so no two dots come within margin px. */
export declare function alloc<T extends { x: number; y: number; dr: number }>(dots: T[], margin?: number): (T & { rr: number })[];
