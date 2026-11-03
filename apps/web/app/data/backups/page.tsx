import { runs } from '@hiddengems/db';
import { and, desc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { RunStatus } from '@/components/marks';
import { nextDaily, until } from '@/lib/data-health';
import { db } from '@/lib/db';
import { clock, dayTime } from '@/lib/format';
import { PullButton, PullQueue } from '../pulls';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const metadata: Metadata = { title: 'Backups' };

interface BackupMeta { file?: string; where?: string; link?: string | null; bytes?: number; rows?: number; tables?: Record<string, number> }

const kb = (bytes?: number) => (bytes == null ? '–' : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// The nightly copies of the database (owner request 2026-11-03), read from the backup runs' own records, so
// this page never calls the storage. Restoring stays a deliberate command run by the owner.
export default async function BackupsPage() {
  const { db: d } = await db();
  const now = new Date();
  const list = await d.select().from(runs).where(eq(runs.job, 'backup')).orderBy(desc(runs.startedAt)).limit(60);
  const done = await d.select().from(runs).where(and(eq(runs.job, 'backup'), eq(runs.status, 'succeeded'))).orderBy(desc(runs.startedAt)).limit(1);
  const latest = done[0];
  const meta = (latest?.meta ?? {}) as BackupMeta;
  const next = nextDaily('backup', now);
  const tables = Object.entries(meta.tables ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <PullQueue>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Backups</h1>
        </div>
        <div className="fc-page-header-actions">
          <PullButton job="backup" label="Backup" text="Back up now" variant="secondary" />
        </div>
      </div>

      <dl className="fc-stat-strip hg-overview">
        <div className="fc-stat">
          <dt className="fc-stat-label">Latest copy</dt>
          <dd className="fc-stat-figure"><span className="fc-stat-value">{latest ? dayTime(latest.startedAt, now) : 'None yet'}</span></dd>
          <dd className="fc-stat-basis">{latest ? `${(meta.rows ?? 0).toLocaleString('en-US')} rows, ${kb(meta.bytes)}` : 'The first runs tonight'}</dd>
        </div>
        <div className="fc-stat">
          <dt className="fc-stat-label">Next copy</dt>
          <dd className="fc-stat-figure"><span className="fc-stat-value">{next ? dayTime(next, now) : '–'}</span></dd>
          <dd className="fc-stat-basis">{next ? `Nightly, ${until(next, now)}` : ''}</dd>
        </div>
        <div className="fc-stat">
          <dt className="fc-stat-label">Stored in</dt>
          <dd className="fc-stat-figure"><span className="fc-stat-value hg-break">{meta.where ?? 'Not set'}</span></dd>
          <dd className="fc-stat-basis">Private GitHub repository, every night kept</dd>
        </div>
      </dl>

      <section className="hg-section" aria-labelledby="copies-h">
        <h2 id="copies-h" className="text-heading-20">Copies</h2>
        <div className="fc-table-wrap">
          <table className="fc-table">
            <thead>
              <tr>
                <th scope="col">Taken</th>
                <th scope="col">Status</th>
                <th scope="col" data-grow>File</th>
                <th scope="col" data-align="numeric">Rows</th>
                <th scope="col" data-align="numeric">Size</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5}>No backups yet</td></tr>}
              {list.map((r) => {
                const m = (r.meta ?? {}) as BackupMeta;
                return (
                  <tr key={r.id}>
                    <td className="hg-nowrap"><time dateTime={r.startedAt.toISOString()} title={clock(r.startedAt)}>{dayTime(r.startedAt, now)}</time></td>
                    <td><RunStatus status={r.status} owner={r.failureOwner} /></td>
                    <td>
                      {m.file
                        ? m.link ? <a className="fc-link hg-mono" href={m.link} target="_blank" rel="noopener noreferrer">{m.file}</a> : <span className="hg-mono">{m.file}</span>
                        : <span className="hg-sub">{r.status === 'failed' ? r.message : 'Recorded before file details were kept'}</span>}
                    </td>
                    <td data-align="numeric">{m.rows != null ? m.rows.toLocaleString('en-US') : '–'}</td>
                    <td data-align="numeric">{kb(m.bytes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {tables.length > 0 && (
        <section className="hg-section" aria-labelledby="tables-h">
          <h2 id="tables-h" className="text-heading-20">In the latest copy</h2>
          <div className="fc-bar-list hg-tables">
            {tables.map(([name, n]) => (
              <div key={name} className="fc-bar">
                <span className="fc-bar-label hg-mono">{name}</span>
                <span className="fc-bar-track"><span className="fc-bar-fill" style={{ ['--value' as string]: tables[0]![1] ? (n / tables[0]![1]) * 100 : 0 }} /></span>
                <span className="fc-bar-value">{n.toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="fc-fieldset" aria-labelledby="restore-h">
        <div className="fc-fieldset-content">
          <h2 id="restore-h" className="text-heading-16">Restore a copy</h2>
          <p className="text-copy-14 hg-secondary">
            Restoring is a command, never a button, so nobody replaces the data by accident. Download the file, then run{' '}
            <code className="hg-mono">pnpm db:restore &lt;file&gt;</code> against an empty, migrated database. Rows that already exist are left as they are.
          </p>
        </div>
      </section>
    </PullQueue>
  );
}
