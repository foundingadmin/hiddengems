import { providerUsage, runs } from '@hiddengems/db';
import { desc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { dataMode } from '@hiddengems/ingest';
import { RunStatus } from '@/components/marks';
import { db } from '@/lib/db';
import { ago, clock, duration } from '@/lib/format';
import { pullNow } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Data' };

const SOURCES = [
  { job: 'pull-odds', label: 'Odds', cadence: 'Tue 10:07 AM, Sat 7:47 PM, Sun 8:43 AM and before each kickoff (Denver)' },
  { job: 'pull-schedule', label: 'Schedule', cadence: 'Daily' },
  { job: 'pull-rosters', label: 'Rosters', cadence: 'Daily' },
  { job: 'pull-results', label: 'Results', cadence: 'Daily' },
  { job: 'pull-usage', label: 'Usage and injuries', cadence: 'Daily' },
  { job: 'build-picks', label: 'Ratings', cadence: 'After every odds or usage pull' },
  { job: 'backup', label: 'Backup', cadence: 'Nightly' },
] as const;

const LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.job, s.label]));
const PROVIDERS: Record<string, string> = { 'odds-api': 'The Odds API', nflverse: 'nflverse', sample: 'Sample', 'github-backup': 'GitHub (private)', memory: 'Local' };

export default async function DataPage() {
  const { db: d } = await db();
  const now = new Date();
  // Odds pull only on the snapshot schedule with a paid key; the sample provider costs nothing.
  const sample = dataMode() === 'sample';
  const log = await d.select().from(runs).orderBy(desc(runs.startedAt)).limit(50);
  const usage = await d.select().from(providerUsage);
  const latest = await Promise.all(SOURCES.map(async (s) => {
    const [last] = await d.select().from(runs).where(eq(runs.job, s.job)).orderBy(desc(runs.startedAt)).limit(1);
    return { ...s, last };
  }));

  return (
    <>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Data</h1>
        </div>
        <div className="fc-page-header-actions">
          <form action={pullNow} className="hg-inline-form">
            <input type="hidden" name="job" value="all" />
            <button className="fc-button" data-variant="secondary" data-size="small" type="submit">Pull everything</button>
          </form>
        </div>
      </div>

      <section className="hg-section" aria-labelledby="sources-h">
        <div className="hg-head">
          <h2 id="sources-h" className="text-heading-20">Sources</h2>
        </div>
        <div className="fc-table-wrap">
          <table className="fc-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Provider</th>
                <th scope="col">Last run</th>
                <th scope="col" data-align="numeric">When</th>
                <th scope="col" data-grow>Cadence</th>
                <th scope="col"><span className="fc-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {latest.map(({ job, label, cadence, last }) => (
                <tr key={job}>
                  <th scope="row">{label}</th>
                  <td>{last?.provider ? PROVIDERS[last.provider] ?? last.provider : '–'}</td>
                  <td>{last ? <RunStatus status={last.status} owner={last.failureOwner} /> : 'Never run'}</td>
                  <td data-align="numeric" className="fc-time-cell">
                    {last ? (
                      <>
                        <time dateTime={last.startedAt.toISOString()}>{clock(last.startedAt)}</time>
                        <time className="fc-time-cell-rel" dateTime={last.startedAt.toISOString()} data-relative>{ago(last.startedAt, now)}</time>
                      </>
                    ) : '–'}
                  </td>
                  <td>{cadence}</td>
                  <td className="fc-cell-actions">
                    {(job !== 'pull-odds' || sample) && (
                      <form action={pullNow} className="hg-inline-form">
                        <input type="hidden" name="job" value={job} />
                        <button className="fc-button" data-variant="tertiary" data-size="small" type="submit">Pull now</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usage.map((u) => (
          <p key={u.provider} className="text-copy-14">
            {PROVIDERS[u.provider] ?? u.provider} credits this month: {u.remaining?.toLocaleString('en-US') ?? '–'} left, {u.used?.toLocaleString('en-US') ?? '–'} used
          </p>
        ))}
      </section>

      <section className="hg-section" aria-labelledby="log-h">
        <div className="hg-head">
          <h2 id="log-h" className="text-heading-20">Pull log</h2>
        </div>
        <div className="fc-table-wrap">
          <table className="fc-table">
            <caption className="fc-visually-hidden">Newest first, {log.length} runs</caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Job</th>
                <th scope="col" data-grow>Message</th>
                <th scope="col" data-align="numeric">Started</th>
                <th scope="col" data-align="numeric">Ran</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 && (
                <tr><td colSpan={5}>No runs yet</td></tr>
              )}
              {log.map((r) => (
                <tr key={r.id}>
                  <td><RunStatus status={r.status} owner={r.failureOwner} /></td>
                  <td>{LABELS[r.job] ?? r.job}</td>
                  <td>{r.message}</td>
                  <td data-align="numeric" className="fc-time-cell">
                    <time dateTime={r.startedAt.toISOString()}>{clock(r.startedAt)}</time>
                    <time className="fc-time-cell-rel" dateTime={r.startedAt.toISOString()} data-relative>{ago(r.startedAt, now)}</time>
                  </td>
                  <td data-align="numeric">{duration(r.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
