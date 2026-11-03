'use client';
// The gem sheet's read (docs/prd.md F2.1, F2.3, F2.4, F2.5, F2.7): the price chart in Overview, adds, costs and trend lines in Notes,
// the core sample and game conditions in Context, and the loupe (F2.2). Facet parts only (chart-card.md, rank
// track, context rows, toggle chips and the game log in data.css); numbers come from packages/core through lib/gem.ts.
import { mountTips } from '@foundingcreative/facet/js/tips.mjs';
import {
  type CoreSample, type GameLog, type GemNote, type LogGame, type Opportunity, type Split, type SplitKey, type SplitNote, type SplitSide, type Trend,
  MATCHUP_WEEKS, SPLIT_KEYS, SPLIT_PRIOR_GAMES, combineSplits, freshnessState, gameLog, matchupTrack,
} from '@hiddengems/core';
import { useSearchParams } from 'next/navigation';
import { type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { GameLogCells, GameLogKey } from '@/components/game-log';
import type { Appraisal, Conditions, Loupe, SourcedNote } from '@/lib/gem';
import { ago } from '@/lib/format';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const odds = (d: number) => d.toFixed(2);
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
const clvText = (clv: number) => `${sign(Math.round(clv * 1000))}${Math.abs(clv * 100).toFixed(1)}%`;
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
};
const clockIn = (zone: string) => (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

// ---------------------------------------------------------------- Price chart (F2.7)

const H = 200, TOP = 20, BOTTOM = 24, GUTTER = 40;
/** Rough text widths at 12px, for keeping labels apart. */
const SANS = 6.6, MONO = 7.4;

function ticks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 0.1);
  const step = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20].find((s) => span / s <= 3) ?? 50;
  let a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  if (b - a < step) b = a + step;
  if (a <= 1) a = Math.max(1, a);
  const out: number[] = [];
  for (let v = a; v <= b + step / 1000; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

interface Label { x: number; y: number; below: number; name: string; value: string; anchor: 'start' | 'end' }

/**
 * Keeps each label clear of the ones placed before it. A label that would overlap moves to its fallback
 * height (below its point) when it has one, and is left out when that overlaps too.
 */
function clear<L extends { x: number; y: number; width: number; anchor: 'start' | 'end' | 'middle'; below?: number }>(labels: L[]): L[] {
  const kept: L[] = [];
  const span = (l: L): [number, number] => (l.anchor === 'start' ? [l.x, l.x + l.width] : l.anchor === 'end' ? [l.x - l.width, l.x] : [l.x - l.width / 2, l.x + l.width / 2]);
  const fits = (l: L) => {
    const [a, b] = span(l);
    return kept.every((k) => { const [c, d] = span(k); return Math.abs(k.y - l.y) >= 16 || b + 8 <= c || d + 8 <= a; });
  };
  for (const l of labels) {
    if (fits(l)) kept.push(l);
    else if (l.below != null && fits({ ...l, y: l.below })) kept.push({ ...l, y: l.below });
  }
  return kept;
}

export function PriceChart({ appraisal: a, book, kickoff, now, zone }: { appraisal: Appraisal; book: string; kickoff: string; now: string; zone: string }) {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [table, setTable] = useState(false);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clock = clockIn(zone);
  const tNow = Date.parse(now), tKick = Date.parse(kickoff);
  const started = tKick <= tNow;
  const trail = a.trail.map((p) => ({ t: Date.parse(p.at), price: p.price }));
  const first = trail[0], last = trail.at(-1);
  const rec = a.record;
  const t0 = first?.t ?? tNow, t1 = Math.max(tKick, t0 + 3_600_000);
  const pulled = a.pulledAt ? Date.parse(a.pulledAt) : null;
  const lineEnd = last ? (started ? t1 : Math.min(t1, Math.max(last.t, pulled ?? last.t))) : t0;
  // The record's times sit on the chart, between the first price and the Kickoff line.
  const onChart = (t: number) => Math.min(Math.max(t, t0), t1);
  const onRecord = rec && started && last
    ? { decision: onChart(Date.parse(rec.decisionAt)), close: Math.max(onChart(Date.parse(rec.freezeAt)), last.t) }
    : null;

  const values = [...trail.map((p) => p.price), a.fairPrice, ...(rec ? [rec.decisionPrice, rec.freezePrice] : [])];
  const yt = ticks(Math.min(...values), Math.max(...values));
  const [lo, hi] = [yt[0]!, yt.at(-1)!];
  const x1 = Math.max(GUTTER + 1, width);
  const x = (t: number) => GUTTER + ((t - t0) / (t1 - t0)) * (x1 - GUTTER);
  const y = (v: number) => H - BOTTOM - ((v - lo) / (hi - lo)) * (H - BOTTOM - TOP);
  const yFair = Math.round(y(a.fairPrice)) + 0.5;

  // The price holds from one change to the next: a step line.
  let d = '';
  trail.forEach((p, i) => {
    d += i === 0 ? `M${x(p.t)} ${y(p.price)}` : `H${x(p.t)}V${y(p.price)}`;
  });
  // On record, the line ends at the close price.
  if (last) d += onRecord ? `H${x(onRecord.close)}V${y(rec!.freezePrice)}H${x(lineEnd)}` : `H${x(lineEnd)}`;
  const wedge = last ? `${d}V${yFair}H${x(first!.t)}Z` : '';

  // Direct labels: open and now before kickoff; the decision and the close once the game is on record.
  const points: Label[] = [];
  const at = (t: number, v: number, name: string) => {
    const px = x(t);
    points.push({ x: px + (px > x1 - 96 ? -6 : 6), y: y(v) - 8, below: y(v) + 16, name, value: odds(v), anchor: px > x1 - 96 ? 'end' : 'start' });
  };
  if (onRecord) {
    at(onRecord.decision, rec!.decisionPrice, 'Decision');
    at(onRecord.close, rec!.freezePrice, 'Close');
    if (first) at(first.t, first.price, 'Open');
  } else if (last) {
    at(lineEnd, last.price, started ? 'Close' : 'Now');
    if (first && trail.length > 1) at(first.t, first.price, 'Open');
  }
  const dots = onRecord
    ? [[onRecord.decision, rec!.decisionPrice], [onRecord.close, rec!.freezePrice]]
    : last ? [[first!.t, first!.price], [lineEnd, last.price]] : [];
  const labels = clear(points.map((l) => ({ ...l, width: (l.name.length + 1 + l.value.length) * SANS })));
  // The fair line's name sits in the empty future before kickoff, at the left edge after; never over a label.
  const fairName = clear([
    ...labels,
    { x: started ? GUTTER + 6 : x1 - 6, y: yFair - 6, below: yFair + 16, anchor: started ? 'start' as const : 'end' as const, width: 14 * SANS, name: '', value: '' },
  ]).find((l) => l.name === '');

  const nowX = x(Math.min(Math.max(tNow, t0), t1));
  const axis = clear([
    { x: x1, y: H - 6, text: 'Kickoff', time: false, anchor: 'end' as const, width: 7 * SANS },
    ...(!started && tNow > t0 ? [{ x: nowX, y: H - 6, text: 'Now', time: false, anchor: 'middle' as const, width: 3 * SANS }] : []),
    ...(first ? [{ x: GUTTER, y: H - 6, text: clock(new Date(t0).toISOString()), time: true, anchor: 'start' as const, width: 12 * MONO }] : []),
  ]);
  const near = (v: number) => Math.abs(y(v) - yFair) < 16;

  const summary = !last
    ? `No ${book} price yet. Our fair price is ${odds(a.fairPrice)}.`
    : [
      trail.length > 1 ? `${book} price moved from ${odds(first!.price)} at open to ${odds(last.price)} ${started ? 'at the close' : 'now'}.` : `${book} price ${started ? 'closed at' : 'is'} ${odds(last.price)}.`,
      `Our fair price is ${odds(a.fairPrice)}.`,
      rec && started ? `On record at ${odds(rec.decisionPrice)} at the decision and ${odds(rec.freezePrice)} at the close.` : '',
      a.clv != null ? `Closing line value ${clvText(a.clv)} against the fair close.` : '',
    ].filter(Boolean).join(' ');

  const rows = [
    ...trail.map((p) => ({ key: `p${p.t}`, at: p.t, what: p.t === first?.t ? 'Open' : 'Moved', price: p.price })),
    ...(rec ? [{ key: 'dec', at: Date.parse(rec.decisionAt), what: 'Decision', price: rec.decisionPrice }, { key: 'frz', at: Date.parse(rec.freezeAt), what: 'Close', price: rec.freezePrice }] : []),
  ].sort((p, q) => p.at - q.at);

  return (
    <section className="fc-chart-card" aria-labelledby={`${id}-h`}>
      <div className="fc-chart-card-header">
        <div className="fc-chart-card-titlerow">
          <div className="fc-chart-card-heading">
            <h3 id={`${id}-h`} className="fc-chart-card-title">{book} price</h3>
          </div>
        </div>
        {a.clv != null && (
          <p className="fc-chart-card-takeaway">
            <strong>{clvText(a.clv)}</strong>closing line value
            <span className="fc-delta" data-variant="pill" data-direction={a.clv > 0 ? 'positive' : a.clv < 0 ? 'negative' : 'neutral'}>
              {a.clv > 0 ? 'Beat the fair close' : a.clv < 0 ? 'Missed the fair close' : 'Matched the fair close'}
            </span>
          </p>
        )}
      </div>
      <div className="fc-chart-card-body">
        <figure ref={ref} className="fc-chart" data-ghost={last ? undefined : ''} style={{ ['--fc-chart-height' as string]: `${H}px` }} role="img" aria-label={summary}>
          {width > 0 && (
            <svg width={width} height={H} aria-hidden="true" focusable="false">
              <defs>
                <clipPath id={`${id}-up`}><rect x={0} y={0} width={x1} height={yFair} /></clipPath>
                <clipPath id={`${id}-down`}><rect x={0} y={yFair} width={x1} height={H} /></clipPath>
              </defs>
              {!started && tNow > t0 && <rect className="fc-chart-future" x={nowX} y={TOP} width={Math.max(0, x1 - nowX)} height={H - BOTTOM - TOP} />}
              {yt.map((v) => (
                <g key={v}>
                  <line className="fc-chart-grid" x1={GUTTER} x2={x1} y1={Math.round(y(v)) + 0.5} y2={Math.round(y(v)) + 0.5} />
                  {!near(v) && <text className="fc-chart-tick" x={GUTTER - 8} y={y(v) + 4} textAnchor="end">{odds(v)}</text>}
                </g>
              ))}
              {wedge && (
                <>
                  <path className="fc-chart-gap" d={wedge} clipPath={`url(#${id}-up)`} />
                  <path className="fc-chart-gap" data-sign="negative" d={wedge} clipPath={`url(#${id}-down)`} />
                </>
              )}
              {!started && tNow > t0 && <line className="fc-chart-marker" data-dashed="" x1={Math.round(nowX) + 0.5} x2={Math.round(nowX) + 0.5} y1={TOP} y2={H - BOTTOM} />}
              <line className="fc-chart-marker" x1={x1 - 0.5} x2={x1 - 0.5} y1={TOP} y2={H - BOTTOM} />
              <g className="fc-chart-threshold">
                <line x1={GUTTER} x2={x1} y1={yFair} y2={yFair} />
                <text x={GUTTER - 8} y={yFair + 4} textAnchor="end">{odds(a.fairPrice)}</text>
                {fairName && <text className="fc-chart-halo" x={fairName.x} y={fairName.y} textAnchor={fairName.anchor}>Our fair price</text>}
              </g>
              {d && (
                <g data-series="1">
                  <path className="fc-chart-line" d={d} />
                  {dots.map(([t, v]) => <circle key={`${t}-${v}`} className="fc-chart-point" cx={x(t!)} cy={y(v!)} r={3} />)}
                  {labels.map((l) => (
                    <text key={l.name} className="fc-chart-label fc-chart-halo" x={l.x} y={l.y} textAnchor={l.anchor}>
                      {l.name} <tspan className="fc-chart-label" data-strong="">{l.value}</tspan>
                    </text>
                  ))}
                </g>
              )}
              {axis.map((l) => (
                <text key={l.text} className="fc-chart-tick" data-time={l.time ? '' : undefined} x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text>
              ))}
            </svg>
          )}
          {!last && <div className="fc-chart-empty"><div>No {book} price yet</div></div>}
        </figure>
        {table && rows.length > 0 && (
          <div id={`${id}-t`}>
            <table className="fc-table" data-density="compact">
              <caption className="fc-visually-hidden">{book} prices, oldest first</caption>
              <thead><tr><th scope="col">Time</th><th scope="col">Point</th><th scope="col" data-align="numeric">Price</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}><td><time className="fc-timestamp" dateTime={new Date(r.at).toISOString()}>{clock(new Date(r.at).toISOString())}</time></td><td>{r.what}</td><td data-align="numeric">{odds(r.price)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="fc-chart-card-footer">
        {!started && (
          <p className="fc-freshness">
            <span className="fc-status-dot" data-state={freshnessState(a.pulledAt, now)} aria-hidden="true" />
            {pulled != null
              ? <span>Updated <time dateTime={a.pulledAt!} title={clock(a.pulledAt!)} data-relative="">{ago(new Date(pulled), new Date(tNow)).replace(/^Just now$/, 'just now')}</time></span>
              : <span>Not pulled yet</span>}
          </p>
        )}
        {rows.length > 0 && (
          <button type="button" className="fc-button" data-variant="secondary" data-size="small" data-push="" aria-expanded={table} aria-controls={`${id}-t`} onClick={() => setTable(!table)}>
            {table ? 'Hide table' : 'Show table'}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Trend lines (F2.1)

function trendWords(t: Trend): string {
  const of = `${t.hits} of ${t.games}`;
  switch (t.kind) {
    case 'season': return `Scored in ${of} games this season`;
    case 'last10': return `Scored in ${t.hits} of his last 10 games`;
    case 'venue': return `Scored in ${of} ${t.side === 'home' ? 'home' : 'road'} games`;
    case 'role': return `Scored in ${of} games as ${t.side === 'favorite' ? 'the favorite' : 'the underdog'}`;
    case 'redZone': return `Had a carry or target inside the 10 in ${of} games${t.side === 'up' ? ', more of them in his last 3' : t.side === 'down' ? ', fewer in his last 3' : ''}`;
  }
}

/** A split the Notes cite, in the trend lines' words. */
function splitWords(n: SplitNote, loupe: Loupe): string {
  const of = `Scored in ${n.hits} of ${n.games} games`;
  const qbId = loupe.splits.find((s) => s.key === 'qb')?.players[0];
  const qb = (qbId && loupe.people[qbId]?.name) || 'his usual QB';
  switch (n.side) {
    case 'usual': return `${of} with ${qb} starting`;
    case 'other': return `${of} without ${qb} starting`;
    case 'in': return `${of} with his top teammates in`;
    case 'out': return `${of} with a top teammate out`;
    case 'short': return `${of} on a short week`;
    case 'normal': return `${of} on normal rest`;
    case 'bye': return `${of} off a bye`;
    case 'above': return `${of} with his team’s implied points above average`;
    case 'below': return `${of} with his team’s implied points below average`;
    default: return of;
  }
}

/** The sheet body's scroll that puts a section at its top, clear of its scroll margin. */
export function scrollTopFor(body: HTMLElement, section: HTMLElement): number {
  const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  return body.scrollTop + section.getBoundingClientRect().top - body.getBoundingClientRect().top - margin;
}

/** The loupe condition a trend line matches, when this week's side is the trend's. */
function trendCondition(t: Trend, loupe: Loupe | null): SplitKey | null {
  const key = t.kind === 'venue' ? 'venue' : t.kind === 'role' ? 'role' : null;
  return key && loupe?.splits.find((s) => s.key === key)?.current === t.side ? key : null;
}

export function TrendLines({ trends, loupe, labelledBy }: { trends: Trend[]; loupe: Loupe | null; labelledBy: string }) {
  const { href, set } = useLoupe(loupe);
  if (!trends.length) return <div className="fc-empty"><strong>No trends yet</strong><p>A trend needs 3 games</p></div>;
  // A line that cites a condition opens the loupe with it on: the URL changes in place, then the loupe scrolls in.
  const open = (e: MouseEvent, key: SplitKey) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    set([key]);
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const section = document.getElementById('gem-loupe');
    const body = section?.closest<HTMLElement>('.fc-sheet-body');
    if (section && body) body.scrollTo({ top: scrollTopFor(body, section), behavior: smooth ? 'smooth' : 'auto' });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#gem-loupe [data-condition="${key}"]`)?.focus({ preventScroll: true }));
  };
  const line = (key: string, words: string, rate: number, condition: SplitKey | null) => (
    <li key={key} className="fc-list-row">
      <div className="fc-list-row-main">
        <p className="text-copy-14">{condition ? <a className="fc-row-link" href={href([condition])} onClick={(e) => open(e, condition)}>{words}</a> : words}</p>
      </div>
      <div className="fc-list-row-aside"><span className="text-label-14 tabular">{pct(rate)}</span></div>
    </li>
  );
  return (
    <ul className="fc-list" data-lines="1" data-aside="beside" role="list" aria-labelledby={labelledBy}>
      {trends.map((t) => line(t.kind, trendWords(t), t.rate, trendCondition(t, loupe)))}
      {loupe?.notes.map((n) => line(`split-${n.key}`, splitWords(n, loupe), n.rate, n.key))}
    </ul>
  );
}

// ---------------------------------------------------------------- Adds and costs (F2.3)

/** One note in words. Context only: no note moves clarity, the hit chance or the rating. */
function noteWords(n: GemNote): string {
  switch (n.kind) {
    case 'injury': return `Listed ${n.status}`;
    case 'blowout': return n.side === 'favorite' ? 'His team is a big favorite, so starters may sit late' : 'His team is a big underdog, so it may trail and throw';
    case 'implied': return `His team’s implied points are ${n.effect === 'add' ? 'above' : 'below'} the league average`;
    case 'snaps': return `His snap share is ${n.effect === 'add' ? 'up' : 'down'} over his last 3 games`;
  }
}

function noteSource(s: SourcedNote): string {
  if (s.note.kind === 'injury') return s.week != null ? `Week ${s.week} injury report` : 'Injury report';
  if (s.note.kind === 'blowout') return 'Schedule spread';
  if (s.note.kind === 'snaps') return 'Snap counts';
  return s.model ? `Model ${s.model}` : 'Model';
}


export function GemNotes({ notes, now, zone, labelledBy }: { notes: SourcedNote[]; now: string; zone: string; labelledBy: string }) {
  if (!notes.length) return <div className="fc-empty"><strong>No adds or costs</strong></div>;
  const exact = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
  return (
    <ul className="fc-list" data-aside="beside" role="list" aria-labelledby={labelledBy}>
      {notes.map((s) => (
        <li key={s.note.kind} className="fc-list-row">
          <div className="fc-list-row-main">
            <p className="text-copy-14">{noteWords(s.note)}</p>
            <p className="fc-freshness">
              {s.at && <span className="fc-status-dot" data-state={freshnessState(s.at, now)} aria-hidden="true" />}
              <span>
                {noteSource(s)}
                {s.at && <>, <time dateTime={s.at} title={exact(s.at)} data-relative="">{ago(new Date(s.at), new Date(now)).replace(/^Just/, 'just')}</time></>}
              </span>
            </p>
          </div>
          <div className="fc-list-row-aside">
            <span className="fc-effect" data-effect={s.note.effect}>{s.note.effect === 'add' ? 'Adds' : 'Costs'}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Core sample (F2.4)

const OPPORTUNITY: Record<Opportunity, string> = { rzCarries: 'Carries inside the 10', rzTargets: 'Targets inside the 10' };

export function CoreSampleTable({ sample, team }: { sample: CoreSample; team: string | null }) {
  const share = (w: CoreSample['season'], k: Opportunity) => {
    const c = w[k];
    return c.share == null ? <span className="fc-cell-detail">None</span> : <><span className="fc-cell-detail">{c.own} of {c.team}</span>{pct(c.share)}</>;
  };
  return (
    <div className="fc-table-wrap">
      <table className="fc-table" data-density="compact">
        <caption className="fc-visually-hidden">His share of {team ? `${team}’s` : 'his team’s'} chances inside the 10 and his snap share, this season and his last 3 games</caption>
        <thead>
          <tr><th scope="col"><span className="fc-visually-hidden">Measure</span></th><th scope="col" data-align="numeric">Season</th><th scope="col" data-align="numeric">Last 3</th></tr>
        </thead>
        <tbody>
          {sample.types.map((k) => (
            <tr key={k}><th scope="row">{OPPORTUNITY[k]}</th><td data-align="numeric">{share(sample.season, k)}</td><td data-align="numeric">{share(sample.recent, k)}</td></tr>
          ))}
          <tr>
            <th scope="row">Snap share</th>
            <td data-align="numeric">{sample.season.snaps != null ? pct(sample.season.snaps) : <span className="fc-cell-detail">None</span>}</td>
            <td data-align="numeric">{sample.recent.snaps != null ? pct(sample.recent.snaps) : <span className="fc-cell-detail">None</span>}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- Game conditions (F2.5)

const GROUP: Record<string, string> = { RB: 'running backs', WR: 'receivers', TE: 'tight ends', QB: 'quarterbacks' };

/** The weather row shows only when the kickoff forecast matters at an open stadium (core weatherNote()). */
export function ConditionsList({ conditions: c, now }: { conditions: Conditions; now: string }) {
  const m = c.matchup;
  const w = c.weather;
  // Under 3 games the rank means little: no rank and no track, just the games line.
  const track = m ? matchupTrack(m) : null;
  if (!c.implied && !m && !w) return <div className="fc-empty"><strong>No game lines or matchup yet</strong></div>;
  const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  return (
    <dl className="fc-description" data-layout="rows">
      {c.implied && (
        <div>
          <dt>Implied team points</dt>
          <dd>
            <span className="fc-factor-value">{one(c.implied.points)}<span className="fc-badge" data-variant="gray" data-size="sm" data-contrast="low">In the rating</span></span>
            <small>League average {one(c.implied.average)}</small>
          </dd>
        </div>
      )}
      {m && (
        <div data-context="">
          <dt>{m.defense.toUpperCase()} against {GROUP[m.position] ?? m.position}</dt>
          <dd>
            <span className="fc-factor-value">
              {track == null
                ? `${one(m.perGame)} a game over ${m.games} ${m.games === 1 ? 'game' : 'games'}`
                : m.perGame === 0 ? 'No TDs allowed' : `${m.tied ? 'Tied for ' : ''}${ordinal(m.rank)} most TDs allowed`}
              <span className="fc-badge" data-variant="gray" data-size="sm" data-contrast="low">Context only</span>
            </span>
            {track != null && (
              <>
                <small>{m.perGame === 0 ? `Over ${m.games} games` : `${one(m.perGame)} a game over ${m.games} games`}</small>
                <span className="fc-rank-track" aria-hidden="true" style={{ ['--at' as string]: track }}>
                  <span>1</span><span className="fc-rank-track-rail"><span className="fc-rank-track-mark" /></span><span>{m.teams}</span>
                </span>
              </>
            )}
            <ol className="fc-game-log-cells" aria-label={`Last ${Math.min(MATCHUP_WEEKS, m.recent.length)} games, oldest first`}>
              {m.recent.map((w, i) => (
                <li key={i} data-result={w.touchdowns > 0 ? 'hit' : 'miss'}>
                  <span aria-hidden="true">{w.against.toUpperCase()}</span>
                  <span className="fc-visually-hidden">Week {w.week} against {w.against.toUpperCase()}, {w.touchdowns} {w.touchdowns === 1 ? 'TD' : 'TDs'} allowed</span>
                </li>
              ))}
            </ol>
          </dd>
        </div>
      )}
      {w && (
        <div data-context="">
          <dt>Weather at kickoff</dt>
          <dd>
            <span className="fc-factor-value">
              {w.note}
              <span className="fc-badge" data-variant="gray" data-size="sm" data-contrast="low">Context only</span>
            </span>
            <p className="fc-freshness">
              <span className="fc-status-dot" data-state={freshnessState(w.pulledAt, now)} aria-hidden="true" />
              <span>Open-Meteo forecast, <time dateTime={w.pulledAt} data-relative="">{ago(new Date(w.pulledAt), new Date(now)).replace(/^Just/, 'just')}</time></span>
            </p>
          </dd>
        </div>
      )}
    </dl>
  );
}

// ---------------------------------------------------------------- The loupe (F2.2)

/** The conditions on, from ?loupe=qb,rest: a search param, so a note can open the loupe with its condition on. */
export function useLoupe(loupe: Loupe | null) {
  const params = useSearchParams();
  const usable = (k: string): k is SplitKey => !!loupe?.splits.some((s) => s.key === k && s.current != null);
  const on = (params.get('loupe') ?? '').split(',').filter(usable);
  const href = (keys: readonly SplitKey[]) => {
    const next = new URLSearchParams(params);
    if (keys.length) next.set('loupe', SPLIT_KEYS.filter((k) => keys.includes(k)).join(','));
    else next.delete('loupe');
    return `?${next.toString().replace(/%2C/g, ',')}`;
  };
  // A shallow URL change: no request, the loupe redraws from what the sheet loaded.
  const set = (keys: readonly SplitKey[]) => window.history.replaceState(null, '', href(keys));
  return { on, href, set };
}

const SIDE_NAMES: Record<SplitSide, string> = {
  usual: 'starts', other: 'out', in: 'Top teammates in', out: 'A top teammate out', home: 'Home', away: 'Away',
  short: 'Short week', normal: 'Normal rest', bye: 'Off a bye', above: 'Implied points above average', below: 'Implied points below average',
  favorite: 'Favored', underdog: 'Underdog',
};

/** A condition's toggle names this week's side. */
function conditionName(loupe: Loupe, split: Split): string {
  const side = split.current!;
  if (split.key !== 'qb') return SIDE_NAMES[side];
  const qb = split.players[0] ? loupe.people[split.players[0]]?.name : null;
  return qb ? `${qb} ${SIDE_NAMES[side]}` : side === 'usual' ? 'Usual QB starts' : 'Usual QB out';
}

const matchWords = (games: number) => (games === 0 ? 'No games match' : `${games} ${games === 1 ? 'game matches' : 'games match'}`);
const PLUS = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;

/**
 * Condition toggles over the game log. Toggling filters his games to those on this week's side of every condition
 * on, and shows their rate shrunk toward his season (core combineSplits()) beside the season rate. Under 3 games
 * the rate and the log turn cloudy. Context only: the rating never moves.
 */
export function LoupeView({ loupe, log }: { loupe: Loupe; log: GameLog }) {
  const { on, set } = useLoupe(loupe);
  const ref = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState('');
  const season = loupe.season;
  const conditions = loupe.splits.filter((s) => s.current != null);
  const side = (k: SplitKey) => loupe.splits.find((s) => s.key === k)!.current;
  const c = on.length ? combineSplits(loupe, on) : null;
  const cells = c
    ? gameLog([], loupe.log.filter((g) => on.every((k) => g.sides[k] === side(k))).flatMap((g): LogGame[] => {
      const o = loupe.opponents[g.gameId];
      return o ? [{ week: g.week, opponent: o.opponent, home: o.home, touchdowns: g.touchdowns }] : [];
    })).cells
    : log.cells;

  // The blend's helper is a Facet tip, bound when the matching rate appears.
  const shown = c != null && c.games > 0;
  useEffect(() => (shown && ref.current ? mountTips(ref.current).destroy : undefined), [shown]);

  // Every change of conditions after the sheet opens is announced, whether a chip or a note made it.
  const onKey = on.join(',');
  const before = useRef(onKey);
  useEffect(() => {
    if (before.current === onKey) return;
    before.current = onKey;
    setSaid(c ? `${matchWords(c.games)}${c.games ? `, ${pct(c.rate)}` : ''}` : `All ${season.games} games, ${pct(season.rate)}`);
  }, [onKey, c, season]);

  const toggle = (k: SplitKey) => set(on.includes(k) ? on.filter((x) => x !== k) : [...on, k]);

  return (
    <div className="fc-stack" ref={ref}>
      <div className="fc-toggle-chips" role="group" aria-label="Conditions this week">
        {conditions.map((s) => {
          const pressed = on.includes(s.key);
          return (
            <button key={s.key} type="button" className="fc-toggle-chip" data-condition={s.key} aria-pressed={pressed} onClick={() => toggle(s.key)}>
              {pressed ? CHECK : PLUS}{conditionName(loupe, s)}
            </button>
          );
        })}
      </div>
      <div className="fc-game-log">
        <p className="fc-game-log-rate">
          <span className="fc-game-log-value">{pct(season.rate)}</span>
          <span className="fc-game-log-label">{season.hits} of {season.games} this season</span>
        </p>
        {c && (
          <p className="fc-game-log-rate" data-cloudy={c.thin ? '' : undefined}>
            {c.games ? (
              <span className="fc-game-log-value">
                <span className="fc-has-tip" data-tip={`Blended with his season rate, as if he played ${SPLIT_PRIOR_GAMES} more games at ${pct(season.rate)}`}>{pct(c.rate)}</span>
              </span>
            ) : (
              <span className="fc-game-log-value"><span aria-hidden="true">–</span><span className="fc-visually-hidden">No rate</span></span>
            )}
            <span className="fc-game-log-label">{c.thin && c.games ? `Only ${matchWords(c.games).toLowerCase()}` : matchWords(c.games)}</span>
          </p>
        )}
        {cells.length > 0 && <GameLogCells cells={cells} matching={c != null} cloudy={!!c?.thin} />}
      </div>
      <div className="fc-row hg-wrap hg-between">
        <GameLogKey />
        <span className="fc-badge" data-variant="gray" data-size="sm" data-contrast="low">Context only</span>
      </div>
      <p className="fc-visually-hidden" role="status">{said}</p>
    </div>
  );
}
