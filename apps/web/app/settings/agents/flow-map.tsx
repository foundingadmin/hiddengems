'use client';
// The workflow map (packages/facet/components/flow-map.md): nodes and labelled edges on a stage the reader pans
// and zooms. Command or Control with the wheel zooms at the cursor, a drag pans, a pinch zooms on touch.
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { curveMidpoint, curvePath, edgeCurve, nodeBox, stageSize } from './geometry';
import type { Flow } from './flows';
import { spenders, stateAt, totals } from './replay';

const KMIN = 0.2, KMAX = 3, PAD = 16;
const clamp = (k: number) => Math.max(KMIN, Math.min(KMAX, k));
type View = { x: number; y: number; k: number };

const badge = (text: string, variant?: string) => (
  <span className="fc-badge" data-variant={variant} data-contrast={variant === 'inverted' ? undefined : 'low'} data-size="sm">{text}</span>
);
const line = (kind: string) => (
  <svg width="24" height="8" aria-hidden="true"><path className="fc-flow-edge" data-kind={kind} d="M0,4 H24" /></svg>
);

export function FlowMap({ flow, step }: { flow: Flow; step: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const vp = useRef<HTMLDivElement>(null);
  const size = useMemo(() => stageSize(flow), [flow]);
  const edges = useMemo(() => flow.edges.map((e) => {
    const c = edgeCurve(flow, e);
    return { e, d: curvePath(c), mid: curveMidpoint(c) };
  }), [flow]);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const touched = useRef(false);
  const [panning, setPanning] = useState(false);

  const fit = useCallback(() => {
    const el = vp.current;
    if (!el || !el.clientWidth) return;
    const k = Math.min((el.clientWidth - 2 * PAD) / size.width, (el.clientHeight - 2 * PAD) / size.height, 1.2);
    setView({ k, x: (el.clientWidth - size.width * k) / 2, y: (el.clientHeight - size.height * k) / 2 });
  }, [size]);

  const zoomAt = useCallback((px: number, py: number, next: number) => {
    const v = viewRef.current, k = clamp(next);
    touched.current = true;
    setView({ k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) });
  }, []);
  const zoomBy = (f: number) => {
    const el = vp.current;
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, viewRef.current.k * f);
  };
  const panBy = (dx: number, dy: number) => {
    touched.current = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const refit = () => { touched.current = false; fit(); };

  // Fit on mount, and again on resize until the reader pans or zooms.
  useEffect(() => {
    fit();
    const el = vp.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (!touched.current) fit(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // The wheel listener must not be passive, so a modified wheel zooms the map instead of the page.
  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        // A trackpad pinch arrives as Control with small deltas; a mouse wheel with a modifier as large ones.
        zoomAt(e.clientX - r.left, e.clientY - r.top, viewRef.current.k * Math.exp(-d * (e.ctrlKey && !e.metaKey ? 0.01 : 0.0015)));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        panBy(-(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX), 0);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Drag to pan with one pointer, pinch with two. A drag never counts as a click inside the map.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const moved = useRef(false);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 1) { start.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }; moved.current = false; }
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), k: viewRef.current.k };
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      const r = e.currentTarget.getBoundingClientRect();
      zoomAt((a!.x + b!.x) / 2 - r.left, (a!.y + b!.y) / 2 - r.top, pinch.current.k * Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinch.current.d);
      moved.current = true;
      return;
    }
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!moved.current && Math.hypot(dx, dy) < 4) return;
    if (!moved.current) {
      moved.current = true;
      setPanning(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the pointer may already be gone */ }
    }
    touched.current = true;
    setView((v) => ({ ...v, x: s.vx + dx, y: s.vy + dy }));
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    if (!pts.current.size) { start.current = null; setPanning(false); }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const pan: Record<string, [number, number]> = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
    if (e.key === '+' || e.key === '=') zoomBy(1.2);
    else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.2);
    else if (e.key === '0') refit();
    else if (pan[e.key]) panBy(...pan[e.key]!);
    else return;
    e.preventDefault();
  };

  const { cur, tokens, states, past, busy } = stateAt(flow, step);
  const tot = totals(flow);
  const maxSpend = Math.max(1, ...spenders(flow).map((id) => tot[id] ?? 0));
  const edgeState = (id: string) => (cur?.edge === id ? 'active' : past.has(id) ? 'past' : step >= 0 ? 'dim' : undefined);
  const arrow = (tone?: string) => `url(#${uid}-a${tone ? `-${tone}` : ''})`;
  const hasEscalation = flow.edges.some((e) => e.kind === 'escalate');

  return (
    <div className="fc-flow-map">
      <div className="fc-flow-map-toolbar">
        <ul className="fc-legend" role="list" aria-label="Key">
          <li className="fc-legend-item">{line('forward')}<span className="fc-legend-name">Hands forward</span></li>
          <li className="fc-legend-item">{line('return')}<span className="fc-legend-name">Returns or asks back</span></li>
          {hasEscalation && <li className="fc-legend-item">{line('escalate')}<span className="fc-legend-name">Escalates to you</span></li>}
          <li className="fc-legend-item">{badge('Lead model', 'inverted')}<span className="fc-legend-value">Judgement</span></li>
          <li className="fc-legend-item">{badge('Sonnet')}<span className="fc-legend-value">Routine</span></li>
          <li className="fc-legend-item">{badge('New', 'blue')}<span className="fc-legend-value">Agent this flow adds</span></li>
        </ul>
        <div className="fc-flow-map-zoom" role="group" aria-label="Zoom">
          <button className="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>−</button>
          <output aria-live="polite">{Math.round(view.k * 100)}%</output>
          <button className="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</button>
          <button className="fc-button" data-variant="tertiary" data-size="small" type="button" onClick={refit}>Fit</button>
        </div>
      </div>
      <p className="fc-visually-hidden" id={`${uid}-help`}>Drag to move. Command or Control with the scroll wheel zooms. Plus and minus zoom, 0 fits, arrow keys move.</p>
      <div
        ref={vp} className="fc-flow-map-viewport" tabIndex={0} role="group" aria-label="Workflow map" aria-describedby={`${uid}-help`}
        data-panning={panning || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); e.preventDefault(); moved.current = false; } }}
        onKeyDown={onKeyDown}
      >
        <div className="fc-flow-map-stage" style={{ width: size.width, height: size.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          <svg className="fc-flow-map-edges" width={size.width} height={size.height} aria-hidden="true">
            <defs>
              {([undefined, 'active', 'escalate'] as const).map((tone) => (
                <marker key={tone ?? 'base'} id={`${uid}-a${tone ? `-${tone}` : ''}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path className="fc-flow-arrow" data-tone={tone} d="M0,0 L8,4 L0,8 z" />
                </marker>
              ))}
            </defs>
            {edges.map(({ e, d }) => {
              const st = edgeState(e.id);
              return (
                <path
                  key={e.id} className="fc-flow-edge" data-kind={e.kind} data-state={st} d={d}
                  markerEnd={arrow(e.kind === 'escalate' ? 'escalate' : st === 'active' ? 'active' : undefined)}
                  markerStart={e.both ? arrow() : undefined}
                />
              );
            })}
          </svg>
          {Object.entries(flow.nodes).map(([id, n]) => {
            const b = nodeBox(flow, id), active = busy(id);
            const tag = n.model ? badge(n.model === 'Lead' ? 'Lead model' : n.model, n.model === 'Lead' ? 'inverted' : undefined) : n.tag ? badge(n.tag) : null;
            return (
              <div key={id} className="fc-flow-node" data-kind={n.kind} data-active={active || undefined} style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
                <div className="fc-flow-node-head">
                  <span className="fc-flow-node-name">{n.name}</span>
                  {n.isNew && badge('New', 'blue')}
                </div>
                {tag && <div className="fc-flow-node-tags">{tag}</div>}
                <p className="fc-flow-node-role">{n.role}</p>
                <div className="fc-flow-node-foot">
                  <span className="fc-flow-node-dot" data-state={active ? 'active' : states[id] ? 'done' : undefined} aria-hidden="true" />
                  <span className="fc-flow-node-state">{states[id] ?? 'Idle'}</span>
                  {tokens[id] ? <span className="fc-flow-node-tokens">{tokens[id]}k</span> : null}
                </div>
                {n.model && (
                  <div className="fc-meter" aria-hidden="true">
                    <div className="fc-meter-track"><span className="fc-meter-fill" style={{ '--value': (100 * (tokens[id] ?? 0)) / maxSpend } as CSSProperties} /></div>
                  </div>
                )}
              </div>
            );
          })}
          {edges.map(({ e, mid }) => (
            <span
              key={e.id} className="fc-flow-label" data-kind={e.kind === 'escalate' ? 'escalate' : undefined} data-state={edgeState(e.id)}
              style={{ left: mid[0], top: mid[1] + (e.shape ? 0 : -14) }}
            >{e.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
