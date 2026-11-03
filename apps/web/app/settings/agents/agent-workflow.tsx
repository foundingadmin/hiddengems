'use client';
// Agent workflow: the principal's prototype of the sprint flow, replayed step by step (New flow), and the
// findings it answers (Findings). The view and the version live in the query string (DESIGN.md rule 10).
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FlowMap } from './flow-map';
import { FINDINGS, type FindingStatus, FLOWS, GAPS, type VersionKey, VERSIONS } from './flows';
import { links, roster, runsOn, spenders, stateAt, sum, totals } from './replay';

export type View = 'flow' | 'findings';
const VIEWS: { key: View; label: string }[] = [{ key: 'flow', label: 'New flow' }, { key: 'findings', label: 'Findings' }];
const STATUS: Record<FindingStatus, { label: string; variant: string }> = {
  solved: { label: 'Solved', variant: 'green' },
  partly: { label: 'Partly solved', variant: 'amber' },
  open: { label: 'Open', variant: 'red' },
};

function writeParams(values: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(values)) {
    if (v === null) url.searchParams.delete(k); else url.searchParams.set(k, v);
  }
  window.history.replaceState(window.history.state, '', url);
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || !!t.closest('[role="tablist"], .fc-flow-map-viewport'));

export function AgentWorkflow({ initialView, initialVersion }: { initialView: View; initialVersion: VersionKey }) {
  const [view, setView] = useState<View>(initialView);
  const [version, setVersion] = useState<VersionKey>(initialVersion);
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const flow = FLOWS[version];
  const last = flow.steps.length - 1;

  const go = (next: number) => { setPlaying(false); setStep(Math.max(-1, Math.min(last, next))); };
  const pickView = (v: View) => { setView(v); setPlaying(false); writeParams({ view: v === 'flow' ? null : v }); };
  const pickVersion = (v: VersionKey) => { setVersion(v); setStep(-1); setPlaying(false); writeParams({ version: v === 'opt' ? null : v }); };
  const play = () => {
    if (playing) { setPlaying(false); return; }
    if (step >= last) setStep(-1);
    setPlaying(true);
  };

  // Play advances one step every 1.4 seconds and stops on the last one.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => Math.min(last, s + 1)), 1400);
    return () => clearInterval(t);
  }, [playing, last]);
  useEffect(() => { if (playing && step >= last) setPlaying(false); }, [playing, step, last]);

  // Left and right arrows step the replay anywhere on the New flow view, except in the map and the tabs.
  useEffect(() => {
    if (view !== 'flow') return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
      if (e.key === 'ArrowRight') { setPlaying(false); setStep((s) => Math.min(last, s + 1)); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { setPlaying(false); setStep((s) => Math.max(-1, s - 1)); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, last]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = VIEWS.findIndex((v) => v.key === view);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const v = VIEWS[(next + VIEWS.length) % VIEWS.length]!.key;
    pickView(v);
    document.getElementById(`aw-tab-${v}`)?.focus();
  };

  return (
    <>
      <div className="fc-page-header">
        <div className="fc-page-header-text"><h1 className="text-heading-32">Agent workflow</h1></div>
      </div>
      <div className="fc-tabs" role="tablist" aria-label="View" onKeyDown={onTabKey}>
        {VIEWS.map((v) => (
          <button
            key={v.key} id={`aw-tab-${v.key}`} className="fc-tab" type="button" role="tab" aria-selected={view === v.key}
            aria-controls={`aw-panel-${v.key}`} tabIndex={view === v.key ? 0 : -1} onClick={() => pickView(v.key)}
          >{v.label}</button>
        ))}
      </div>
      {view === 'flow' ? (
        <div className="hg-agents" role="tabpanel" id="aw-panel-flow" aria-labelledby="aw-tab-flow">
          <Replay version={version} step={step} playing={playing} last={last} onVersion={pickVersion} onGo={go} onPlay={play} />
          <div className="hg-flow">
            <FlowMap key={version} flow={flow} step={step} />
            <Steps version={version} step={step} onGo={go} />
          </div>
          <Agents version={version} />
          {flow.changes && (
            <section className="hg-section" aria-labelledby="aw-changes">
              <h2 className="text-heading-20" id="aw-changes">What changed</h2>
              <Points items={flow.changes} />
            </section>
          )}
        </div>
      ) : (
        <div className="hg-agents" role="tabpanel" id="aw-panel-findings" aria-labelledby="aw-tab-findings">
          <Findings />
        </div>
      )}
    </>
  );
}

function Replay({ version, step, playing, last, onVersion, onGo, onPlay }: {
  version: VersionKey; step: number; playing: boolean; last: number;
  onVersion: (v: VersionKey) => void; onGo: (i: number) => void; onPlay: () => void;
}) {
  const flow = FLOWS[version];
  const { cur, tokens } = stateAt(flow, step);
  const tot = totals(flow), grand = Math.max(1, sum(tot));
  const parts = spenders(flow);
  const delta = cur ? sum(cur.k) : 0;
  const agents = flow.agents ?? roster(flow).filter((id) => flow.nodes[id]!.model).length;
  const shares = parts.map((id) => `${flow.nodes[id]!.name} ${tokens[id] ?? 0}k`).join(', ');

  return (
    <section className="hg-replay" aria-label="Replay">
      <div className="fc-stack hg-gap-3">
        <div className="fc-row hg-wrap hg-between">
          <div className="fc-segmented" role="group" aria-label="Version">
            {VERSIONS.map((v) => (
              <button key={v} type="button" aria-pressed={version === v} onClick={() => onVersion(v)}>{FLOWS[v].title}</button>
            ))}
          </div>
          <p className="text-copy-14 hg-secondary">{flow.sub}</p>
        </div>
        <div className="fc-row hg-wrap">
          <button className="fc-button" data-variant="secondary" data-size="small" type="button" onClick={() => onGo(-1)}>Reset</button>
          <button className="fc-button" data-variant="secondary" data-size="small" type="button" disabled={step < 0} onClick={() => onGo(step - 1)}>Back</button>
          <button className="fc-button" data-size="small" type="button" onClick={onPlay}>{playing ? 'Pause' : step >= last ? 'Replay' : 'Play'}</button>
          <button className="fc-button" data-variant="secondary" data-size="small" type="button" disabled={step >= last} onClick={() => onGo(step + 1)}>Step</button>
          <button className="fc-button" data-variant="secondary" data-size="small" type="button" onClick={() => onGo(last)}>End</button>
          <span className="text-label-13 hg-secondary">{step < 0 ? `${last + 1} steps` : `Step ${step + 1} of ${last + 1}`}</span>
        </div>
        <div className="hg-now" aria-live="polite">
          {cur ? (
            <>
              <p className="text-copy-14 hg-flush"><span className="hg-mono">{flow.nodes[cur.who]!.name}</span>: {cur.text}</p>
              {cur.note && <p className="text-copy-13 hg-secondary">{cur.skip ? `Not reached here. ${cur.note}` : cur.note}</p>}
            </>
          ) : <p className="text-copy-14 hg-secondary">Press Play or Step, or use the arrow keys.</p>}
        </div>
      </div>
      <div className="fc-stat hg-tokens">
        <p className="fc-stat-label">Tokens so far</p>
        <p className="fc-stat-figure">
          <span className="fc-stat-value">{sum(tokens)}k</span>
          {cur && <span className="fc-stat-qualifier">{delta ? `+${delta}k this step` : 'None this step'}</span>}
        </p>
        <div className="fc-stacked-bar" role="img" aria-label={`Tokens so far by agent: ${shares}`}>
          {parts.map((id, j) => <i key={id} data-series={j + 1} style={{ '--value': (100 * (tokens[id] ?? 0)) / grand } as CSSProperties} />)}
        </div>
        <ul className="fc-legend" role="list" aria-hidden="true">
          {parts.map((id, j) => (
            <li key={id} className="fc-legend-item" data-series={j + 1}>
              <span className="fc-legend-key" />
              <span className="fc-legend-name">{flow.nodes[id]!.name}</span>
              <span className="fc-legend-value">{tokens[id] ?? 0}k</span>
            </li>
          ))}
        </ul>
        <p className="fc-stat-basis">Run total {sum(tot)}k, {agents} agents</p>
      </div>
    </section>
  );
}

function Steps({ version, step, onGo }: { version: VersionKey; step: number; onGo: (i: number) => void }) {
  const flow = FLOWS[version];
  const list = useRef<HTMLDivElement>(null);

  // Keep the current step in view by scrolling the list itself; the page never moves.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (step < 0) { el.scrollTop = 0; return; }
    const b = el.querySelector<HTMLElement>('[aria-current="step"]');
    if (!b) return;
    const top = b.offsetTop, bottom = top + b.offsetHeight;
    if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ top: Math.max(0, top - el.clientHeight / 3), behavior: smooth ? 'smooth' : 'auto' });
    }
  }, [step, version]);

  return (
    <section className="fc-card hg-steps" aria-labelledby="aw-steps">
      <h2 className="text-heading-16" id="aw-steps">Steps</h2>
      <div className="hg-steps-list" ref={list}>
        <ol className="fc-step-list" aria-labelledby="aw-steps">
          {flow.steps.map((s, i) => {
            const k = sum(s.k);
            return (
              <li key={i}>
                <button
                  className="fc-step" type="button" aria-current={i === step ? 'step' : undefined}
                  data-state={i > step ? 'upcoming' : undefined} onClick={() => onGo(i)}
                >
                  <span className="fc-step-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="fc-step-body">
                    <span className="fc-step-actor">
                      {flow.nodes[s.who]!.name}
                      {s.skip && <span className="fc-badge" data-contrast="low" data-size="sm">Not reached here</span>}
                    </span>
                    <span className="fc-step-text">{s.text}</span>
                    {s.note && <span className="fc-step-note">{s.note}</span>}
                  </span>
                  <span className="fc-step-value">{k ? `+${k}k` : ''}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Agents({ version }: { version: VersionKey }) {
  const flow = FLOWS[version];
  const tot = totals(flow);
  return (
    <section className="hg-section" aria-labelledby="aw-agents">
      <h2 className="text-heading-20" id="aw-agents">Agents</h2>
      <div className="fc-table-wrap">
        <table className="fc-table" aria-labelledby="aw-agents">
          <thead>
            <tr>
              <th scope="col" data-grow>Part</th>
              <th scope="col">Receives from</th>
              <th scope="col">Delivers to</th>
              <th scope="col">Runs on</th>
              <th scope="col" data-align="numeric">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {roster(flow).map((id) => {
              const n = flow.nodes[id]!, l = links(flow, id);
              return (
                <tr key={id}>
                  <th scope="row" className="hg-agent-cell">
                    <div className="hg-agent">
                      <span className="hg-agent-name">
                        <strong className="hg-mono">{n.name}</strong>
                        {n.isNew && <span className="fc-badge" data-variant="blue" data-contrast="low" data-size="sm">New</span>}
                      </span>
                      <span className="hg-sub">{n.role}</span>
                    </div>
                  </th>
                  <td className="hg-mono hg-sub">{l.from}</td>
                  <td className="hg-mono hg-sub">{l.to}</td>
                  <td className="hg-nowrap">{runsOn(flow, id)}</td>
                  <td data-align="numeric">{tot[id] ?? 0}k</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-copy-14 hg-secondary">{flow.notIn}{flow.scale ? ` ${flow.scale}` : ''}</p>
    </section>
  );
}

function Points({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="hg-points">
      {items.map((c) => (
        <li key={c.title}>
          <p className="text-label-14"><strong>{c.title}</strong></p>
          <p className="text-copy-14 hg-secondary">{c.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Findings() {
  const n = (s: FindingStatus) => FINDINGS.filter((f) => f.status === s).length;
  return (
    <>
      <p className="text-copy-14 hg-secondary">{n('solved')} solved, {n('partly')} partly solved, {n('open')} open in the optimized flow.</p>
      <div className="hg-findings">
        {FINDINGS.map((f) => (
          <article key={f.id} className="fc-card hg-finding" aria-labelledby={`aw-${f.id}`}>
            <div className="fc-row hg-between">
              <span className="text-label-12-mono hg-secondary">{f.id}</span>
              <span className="fc-badge" data-variant={STATUS[f.status].variant} data-contrast="low" data-size="sm">{STATUS[f.status].label}</span>
            </div>
            <h3 className="text-heading-16" id={`aw-${f.id}`}>{f.title}</h3>
            <p className="text-copy-14 hg-secondary">{f.body}</p>
            <p className="text-copy-14"><strong>In Optimized.</strong> {f.how}</p>
          </article>
        ))}
      </div>
      <section className="hg-section" aria-labelledby="aw-gaps">
        <h2 className="text-heading-20" id="aw-gaps">Gaps</h2>
        <Points items={GAPS} />
      </section>
    </>
  );
}
