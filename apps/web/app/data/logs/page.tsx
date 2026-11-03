import { runLogs, runs } from '@hiddengems/db';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RunStatus } from '@/components/marks';
import { LABELS, PROVIDER_NAMES } from '@/lib/data-health';
import { db } from '@/lib/db';
import { ago, duration, seconds, stamp } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Logs' };

const LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Data shorter than this sits inline on its line; longer data folds behind a summary of its keys. */
const INLINE_DATA = 96;

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The Logs URL for a source filter and an open run; either can be left out. */
function logsHref({ source, run }: { source?: string | null; run?: string | null }) {
  const q = new URLSearchParams();
  if (source) q.set('source', source);
  if (run) q.set('run', run);
  const s = q.toString();
  return s ? `/data/logs?${s}` : '/data/logs';
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LEVELS: Record<string, [string, string]> = { info: ['info', 'Info'], warn: ['warning', 'Warning'], error: ['error', 'Error'] };

// Run history, read only (owner feedback 2026-11-03: "logs is just logs"). Modeled on the vercel.com runtime
// log: dense mono rows, time first, and only the rows that need a look are tinted and labeled. Fixes start
// from Data health. ?source=<job> narrows the log to one source; ?run=<id> opens that run's record and
// every line it logged above the table (owner review 2026-11-03: "direct line items in the log for the last run").
export default async function LogsPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const sourceParam = one(params.source);
  const source = sourceParam && Object.hasOwn(LABELS, sourceParam) ? sourceParam : null;
  const runParam = one(params.run);
  const runId = runParam && UUID.test(runParam) ? runParam.toLowerCase() : null;

  const { db: d } = await db();
  const now = new Date();
  const log = await d.select().from(runs).where(source ? eq(runs.job, source) : undefined).orderBy(desc(runs.startedAt)).limit(LIMIT);
  const warnings = log.length
    ? await d.select({ runId: runLogs.runId, message: runLogs.message }).from(runLogs)
      .where(and(inArray(runLogs.runId, log.map((r) => r.id)), inArray(runLogs.level, ['warn', 'error']))).orderBy(runLogs.id)
    : [];
  const firstWarning = new Map<string, string>();
  for (const w of warnings) if (!firstWarning.has(w.runId)) firstWarning.set(w.runId, w.message);

  const [open] = runId ? await d.select().from(runs).where(eq(runs.id, runId)).limit(1) : [];
  const lines = open ? await d.select().from(runLogs).where(eq(runLogs.runId, open.id)).orderBy(asc(runLogs.id)) : [];
  const label = (job: string) => LABELS[job] ?? job;

  return (
    <>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Logs</h1>
        </div>
      </div>

      <div className="hg-logs">
        {runParam != null && (open
          ? <RunDetail run={open} lines={lines} now={now} close={logsHref({ source })} label={label(open.job)} />
          : (
            <p className="fc-note" role="status">
              <span>Run not found</span>
              <Link className="fc-note-link" href={logsHref({ source })}>Close</Link>
            </p>
          ))}

        <div className="hg-section">
          {source && (
            <div className="fc-filter-bar">
              <span className="fc-filter-chip" role="group" aria-label="Source filter">
                <span className="fc-filter-key">Source</span>
                <span className="fc-filter-value">{label(source)}</span>
                <Link className="fc-filter-remove" href={logsHref({ run: open?.id })} aria-label="Show all sources">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
                </Link>
              </span>
            </div>
          )}

          <div className="fc-table-wrap hg-log text-copy-13-mono">
            <table className="fc-table">
              <caption className="fc-visually-hidden">Newest first, {log.length} {source ? `${label(source)} runs` : 'runs'}</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Source</th>
                  <th scope="col" data-grow>Message</th>
                  <th scope="col" data-align="numeric">Ran</th>
                </tr>
              </thead>
              <tbody>
                {log.length === 0 && (
                  <tr><td colSpan={4}>{source ? `No ${label(source)} runs yet` : 'No runs yet'}</td></tr>
                )}
                {log.map((r) => {
                  const problem = r.status === 'warned' || r.status === 'failed';
                  const warning = firstWarning.get(r.id);
                  const selected = r.id === open?.id;
                  return (
                    <tr key={r.id} aria-selected={selected || undefined} data-level={r.status === 'failed' ? 'error' : r.status === 'warned' ? 'warning' : undefined}>
                      <td className="hg-nowrap hg-sub">
                        <Link href={logsHref({ source, run: r.id })} aria-current={selected || undefined}>
                          <time dateTime={r.startedAt.toISOString()} title={ago(r.startedAt, now)}>{stamp(r.startedAt)}</time>
                        </Link>
                      </td>
                      <td className="hg-nowrap">{label(r.job)}<span className="hg-sub"> {r.trigger}</span></td>
                      <td className="fc-log-message">
                        {problem && <><RunStatus status={r.status} owner={r.failureOwner} />{' '}</>}
                        {r.message}
                        {warning && warning !== r.message && <span className="hg-log-detail">{warning}</span>}
                      </td>
                      <td data-align="numeric">{duration(r.durationMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="hg-log-end">{log.length >= LIMIT ? `Showing the latest ${LIMIT} runs` : 'No earlier runs'}</p>
          </div>
        </div>
      </div>
    </>
  );
}

type Run = typeof runs.$inferSelect;
type Line = typeof runLogs.$inferSelect;

/** One run's record (Facet patterns/data-ops.md, "Row detail") and every line it logged, in order. */
function RunDetail({ run, lines, now, close, label }: { run: Run; lines: Line[]; now: Date; close: string; label: string }) {
  const failed = run.status === 'failed';
  const tone = failed ? (run.failureOwner === 'provider' ? 'warning' : 'error') : run.status === 'warned' ? 'warning' : null;
  return (
    <section className="fc-fieldset" data-type={tone ?? undefined} aria-labelledby="run-h">
      <div className="fc-fieldset-content">
        <div className="fc-fieldset-header">
          <div>
            <h2 id="run-h" className="fc-fieldset-title">{label}</h2>
            <p className="fc-fieldset-subtitle">
              <time dateTime={run.startedAt.toISOString()}>{stamp(run.startedAt)}</time>, <span data-relative>{ago(run.startedAt, now)}</span>
            </p>
          </div>
          <Link className="fc-button" data-variant="secondary" data-size="small" href={close}>Close</Link>
        </div>
        {tone
          ? (
            <p className="fc-note hg-run-note" data-type={tone}>
              <span>{run.message ?? (failed ? 'The run failed.' : 'The run warned.')}</span>
              <Link className="fc-link-action fc-note-link" href="/data">Data health</Link>
            </p>
          )
          : run.message && <p className="fc-fieldset-consequence">{run.message}</p>}
        <dl className="fc-description">
          <div><dt>Status</dt><dd><RunStatus status={run.status} owner={run.failureOwner} /></dd></div>
          <div><dt>Duration</dt><dd>{duration(run.durationMs)}</dd></div>
          <div><dt>Trigger</dt><dd>{sentence(run.trigger)}</dd></div>
          <div><dt>Provider</dt><dd>{run.provider ? PROVIDER_NAMES[run.provider] ?? run.provider : 'None'}</dd></div>
          <div><dt>Requests</dt><dd className="tabular">{run.requestCount.toLocaleString('en-US')}</dd></div>
          <div><dt>Rows written</dt><dd className="tabular">{run.rowsWritten.toLocaleString('en-US')}</dd></div>
          {run.errorCode && <div><dt>Error code</dt><dd><span className="fc-mono">{run.errorCode}</span></dd></div>}
          <div><dt>Run ID</dt><dd><span className="fc-mono hg-break">{run.id}</span></dd></div>
          {run.meta && Object.keys(run.meta).length > 0 && <div className="hg-description-wide"><dt>Details</dt><dd><div className="text-copy-13-mono"><Data data={run.meta} /></div></dd></div>}
        </dl>
      </div>
      <div className="fc-fieldset-section">
        <h3 className="text-heading-14">Log lines</h3>
        {lines.length === 0 && <p className="hg-secondary text-copy-14">This run logged no lines</p>}
        {lines.length > 0 && (
          <div className="fc-table-wrap hg-log text-copy-13-mono">
            <table className="fc-table">
              <caption className="fc-visually-hidden">In order, {lines.length} lines</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Level</th>
                  <th scope="col" data-grow>Message</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const [level, word] = LEVELS[l.level] ?? ['info', sentence(l.level)];
                  return (
                    <tr key={l.id}>
                      <td className="fc-log-time"><time dateTime={l.at.toISOString()}>{seconds(l.at)}</time></td>
                      <td className="hg-nowrap"><span className="fc-level" data-level={level}>{word}</span></td>
                      <td className="fc-log-message">{l.message}<Data data={l.data} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/** A line's data as compact JSON in mono: inline when short, folded behind its keys when long. */
function Data({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return null;
  const compact = JSON.stringify(data);
  if (compact.length <= INLINE_DATA) return <code className="hg-log-detail hg-break">{compact}</code>;
  const keys = Object.entries(data).map(([k, v]) => (Array.isArray(v) ? `${k} (${v.length})` : k)).join(', ');
  return (
    <details className="hg-log-detail">
      <summary>{keys}</summary>
      <pre className="hg-log-data hg-break">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
