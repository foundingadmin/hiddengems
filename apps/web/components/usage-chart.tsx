'use client';
// Stacked daily bars, one series per source, with the Facet bar breakdown tooltip (charts.css, .fc-chart-tip):
// hovering or focusing a day lights its bars and lists every source's count for it, largest first, like the
// vercel.com Observability query chart. The table under the chart is the audit path.
import { useEffect, useRef, useState } from 'react';

export interface UsageSeries { label: string; slot: number; values: number[] }

const H = 200, GUTTER = 40, AXIS = 20, TOP = 8;

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function UsageChart({ days, series, summary }: { days: { label: string; long: string }[]; series: UsageSeries[]; summary: string }) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totals = days.map((_, i) => series.reduce((n, s) => n + (s.values[i] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const plotW = Math.max(0, width - GUTTER), plotH = H - AXIS - TOP;
  const band = days.length ? plotW / days.length : 0;
  const barW = Math.max(1, band - (band < 8 ? 1 : Math.min(8, band * 0.3)));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const empty = totals.every((t) => t === 0);

  const tipLeft = active == null ? 0 : Math.min(Math.max(GUTTER + band * active + band / 2 - 100, 0), Math.max(0, width - 200));
  return (
    <figure ref={ref} className="fc-chart" style={{ ['--fc-chart-height' as string]: `${H}px` }} role="img" aria-label={summary} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={H} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line className="fc-chart-grid" x1={GUTTER} x2={width} y1={y(t)} y2={y(t)} />
              <text className="fc-chart-tick" x={GUTTER - 8} y={y(t) + 4} textAnchor="end">{t.toLocaleString('en-US')}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = GUTTER + band * i;
            let base = 0;
            return (
              <g key={d.long}>
                <rect className="fc-chart-band" data-active={active === i || undefined} x={x} y={TOP} width={band} height={plotH} />
                {series.map((s) => {
                  const v = s.values[i] ?? 0;
                  if (!v) return null;
                  const top = y(base + v), h = y(base) - top;
                  base += v;
                  return <rect key={s.label} className="fc-chart-bar" data-series={s.slot} data-active={active === i || undefined} x={x + (band - barW) / 2} y={top} width={barW} height={Math.max(1, h)} />;
                })}
                <rect
                  className="fc-chart-hit" x={x} y={TOP} width={band} height={plotH} tabIndex={0}
                  onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
          <text className="fc-chart-tick" x={GUTTER} y={H - 4}>{days[0]?.label}</text>
          <text className="fc-chart-tick" x={width} y={H - 4} textAnchor="end">{days.at(-1)?.label}</text>
        </svg>
      )}
      {empty && <div className="fc-chart-empty"><div>No provider requests in this window</div></div>}
      {active != null && !empty && (
        <div className="fc-tooltip fc-chart-tip" style={{ left: tipLeft, top: TOP }} role="status">
          <p className="fc-chart-tip-head">{days[active]!.long}</p>
          <ul className="fc-chart-tip-rows">
            {[...series].sort((a, b) => (b.values[active] ?? 0) - (a.values[active] ?? 0)).map((s) => (
              <li key={s.label}>
                <span className="fc-legend-key" data-series={s.slot} aria-hidden="true" />
                <span>{s.label}</span>
                <span>{(s.values[active] ?? 0).toLocaleString('en-US')}</span>
              </li>
            ))}
            <li className="fc-chart-tip-rule" aria-hidden="true" />
            <li><span /><span>Total</span><span>{totals[active]!.toLocaleString('en-US')}</span></li>
          </ul>
        </div>
      )}
    </figure>
  );
}

/** A gray trend line for a table row; peers share one domain so lengths compare. */
export function Sparkline({ values, max }: { values: number[]; max: number }) {
  const n = values.length;
  const pts = values.map((v, i) => `${n > 1 ? (i / (n - 1)) * 100 : 50},${24 - (max ? (v / max) * 22 : 0) - 1}`).join(' ');
  return (
    <svg className="fc-sparkline hg-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline className="fc-chart-line" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
