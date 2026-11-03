// Map geometry, ported from the prototype's fpos and fPath: every node sits on a column and row grid, and every
// edge is one cubic curve whose shape says how it runs (straight across, up, down, under or over the row).
import type { Flow, FlowEdge } from './flows';

export const GRID = { x0: 24, colW: 286, w: 196, h: 132, top: 100, rowH: 186 };

type Pt = [number, number];
export interface Box { x: number; y: number; w: number; h: number }
export interface Curve { from: Pt; c1: Pt; c2: Pt; to: Pt }

export function nodeBox(flow: Flow, id: string): Box {
  const n = flow.nodes[id]!;
  return { x: GRID.x0 + n.col * GRID.colW, y: GRID.top + (n.row + 1) * GRID.rowH, w: GRID.w, h: GRID.h };
}

export function stageSize(flow: Flow) {
  const nodes = Object.values(flow.nodes);
  return {
    width: GRID.x0 + Math.max(...nodes.map((n) => n.col)) * GRID.colW + GRID.w + 24,
    height: GRID.top + (Math.max(...nodes.map((n) => n.row)) + 1) * GRID.rowH + GRID.h + 110,
  };
}

export function edgeCurve(flow: Flow, e: FlowEdge): Curve {
  const s = nodeBox(flow, e.from), t = nodeBox(flow, e.to);
  if (e.shape === 'up') {
    const y = t.y + t.h / 2;
    return { from: [s.x + s.w - 40, s.y], c1: [s.x + s.w - 40, y], c2: [t.x - 60, y], to: [t.x - 6, y] };
  }
  if (e.shape === 'down') {
    return { from: [s.x + 40, s.y + s.h], c1: [s.x + 40, s.y + s.h + 70], c2: [t.x + t.w - 30, t.y - 80], to: [t.x + t.w - 30, t.y - 6] };
  }
  if (e.shape === 'under') {
    const fwd = t.x > s.x, x1 = s.x + (fwd ? s.w - 50 : 50), x2 = t.x + (fwd ? 50 : t.w - 50);
    const y = Math.max(s.y + s.h, t.y + t.h) + (e.depth ?? 60);
    return { from: [x1, s.y + s.h], c1: [x1, y], c2: [x2, y], to: [x2, t.y + t.h + 6] };
  }
  if (e.shape === 'over') {
    const x1 = s.x + s.w / 2, x2 = t.x + t.w / 2, y = Math.min(s.y, t.y) - (e.depth ?? 120);
    return { from: [x1, s.y], c1: [x1, y], c2: [x2, y], to: [x2, t.y - 6] };
  }
  const y1 = s.y + s.h / 2, y2 = t.y + t.h / 2, dx = (t.x - s.x - s.w) * 0.5;
  return { from: [s.x + s.w, y1], c1: [s.x + s.w + dx, y1], c2: [t.x - dx, y2], to: [t.x - 6, y2] };
}

export const curvePath = ({ from, c1, c2, to }: Curve) =>
  `M${from[0]},${from[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${to[0]},${to[1]}`;

function at({ from, c1, c2, to }: Curve, t: number): Pt {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * from[0] + b * c1[0] + c * c2[0] + d * to[0], a * from[1] + b * c1[1] + c * c2[1] + d * to[1]];
}

/** The point halfway along the curve by length (what getPointAtLength(total / 2) returns), from 64 samples. */
export function curveMidpoint(curve: Curve): Pt {
  const pts = Array.from({ length: 65 }, (_, i) => at(curve, i / 64));
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const half = lens[lens.length - 1]! / 2;
  const i = Math.max(1, lens.findIndex((l) => l >= half));
  const f = (half - lens[i - 1]!) / (lens[i]! - lens[i - 1]! || 1);
  return [pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * f, pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * f];
}
