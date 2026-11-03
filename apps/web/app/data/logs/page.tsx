import { runLogs, runs } from '@hiddengems/db';
import { and, desc, inArray } from 'drizzle-orm';
import type { Metadata } from 'next';
import { RunStatus } from '@/components/marks';
import { LABELS } from '@/lib/data-health';
import { db } from '@/lib/db';
import { ago, duration, stamp } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Logs' };

const LIMIT = 100;

// Run history, read only (owner feedback 2026-11-03: "logs is just logs"). Modeled on the vercel.com runtime
// log: dense mono rows, time first, and only the rows that need a look are tinted and labeled. Fixes start
// from Data health.
export default async function LogsPage() {
  const { db: d } = await db();
  const now = new Date();
  const log = await d.select().from(runs).orderBy(desc(runs.startedAt)).limit(LIMIT);
  const warnings = log.length
    ? await d.select({ runId: runLogs.runId, message: runLogs.message }).from(runLogs)
      .where(and(inArray(runLogs.runId, log.map((r) => r.id)), inArray(runLogs.level, ['warn', 'error']))).orderBy(runLogs.id)
    : [];
  const firstWarning = new Map<string, string>();
  for (const w of warnings) if (!firstWarning.has(w.runId)) firstWarning.set(w.runId, w.message);

  return (
    <>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Logs</h1>
        </div>
      </div>
      <div className="fc-table-wrap hg-log text-copy-13-mono">
        <table className="fc-table">
          <caption className="fc-visually-hidden">Newest first, {log.length} runs</caption>
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
              <tr><td colSpan={4}>No runs yet</td></tr>
            )}
            {log.map((r) => {
              const problem = r.status === 'warned' || r.status === 'failed';
              const warning = firstWarning.get(r.id);
              return (
                <tr key={r.id} data-level={r.status === 'failed' ? 'error' : r.status === 'warned' ? 'warning' : undefined}>
                  <td className="hg-nowrap hg-sub"><time dateTime={r.startedAt.toISOString()} title={ago(r.startedAt, now)}>{stamp(r.startedAt)}</time></td>
                  <td className="hg-nowrap">{LABELS[r.job] ?? r.job}<span className="hg-sub"> {r.trigger}</span></td>
                  <td>
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
    </>
  );
}
