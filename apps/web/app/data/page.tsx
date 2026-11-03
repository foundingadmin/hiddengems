import { FREEZE_LEAD_MINUTES, SNAPSHOT_ZONE, SNAPSHOTS, zonedTimeToUtc } from '@hiddengems/core';
import { games, providerUsage, runLogs, runs } from '@hiddengems/db';
import { BOOTSTRAP, dataMode } from '@hiddengems/ingest';
import { and, desc, eq, gt, inArray, lt, or } from 'drizzle-orm';
import type { Metadata } from 'next';
import { RunStatus } from '@/components/marks';
import { Tips } from '@/components/tips';
import { db } from '@/lib/db';
import { ZONE, ago, clock, duration } from '@/lib/format';
import vercel from '@/vercel.json';
import { PullAllButton, PullButton, PullQueue, ResultCell, RunCell } from './pulls';

export const dynamic = 'force-dynamic';
// Each pull is its own request (see pulls.tsx); a full usage pull reads a season of play by play.
export const maxDuration = 300;
export const metadata: Metadata = { title: 'Data' };

const DAY = 86_400_000;

const SOURCES = [
  { job: 'pull-odds', label: 'Odds', live: 'The Odds API' },
  { job: 'pull-schedule', label: 'Schedule', live: 'nflverse' },
  { job: 'pull-rosters', label: 'Rosters', live: 'nflverse' },
  { job: 'pull-results', label: 'Results', live: 'nflverse' },
  { job: 'pull-usage', label: 'Usage and injuries', live: 'nflverse' },
  { job: 'build-picks', label: 'Ratings', live: 'Model v3.0' },
  { job: 'backup', label: 'Backup', live: 'GitHub, private' },
] as const;
const LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.job, s.label]));

const timeOfDay = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(d);
const weekdayTime = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(d);

/** "Daily at 4:17 AM" from the job's cron line in vercel.json (UTC), in the display zone. */
function dailyAt(job: string, now: Date): string | null {
  const cron = vercel.crons.find((c) => c.path === `/api/cron/${job}`)?.schedule.split(' ');
  if (!cron || cron[2] !== '*' || !/^\d+$/.test(cron[0]!) || !/^\d+$/.test(cron[1]!)) return null;
  const at = new Date(now);
  at.setUTCHours(Number(cron[1]), Number(cron[0]), 0, 0);
  return `Daily at ${timeOfDay(at)}`;
}

/** The weekly odds snapshots, in the display zone, as they fall this week. */
function snapshotTimes(now: Date): string {
  const dayIn = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: SNAPSHOT_ZONE, weekday: 'short' }).format(d);
  const dateIn = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: SNAPSHOT_ZONE }).format(d);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const times = SNAPSHOTS.map((s) => {
    const day = Array.from({ length: 7 }, (_, i) => new Date(now.getTime() + i * DAY)).find((d) => dayIn(d) === names[s.weekday])!;
    return weekdayTime(zonedTimeToUtc(dateIn(day), s.time, SNAPSHOT_ZONE));
  });
  return `${times.join(', ')}, and ${FREEZE_LEAD_MINUTES} minutes before each kickoff`;
}

export default async function DataPage() {
  const { db: d } = await db();
  const now = new Date();
  const sample = dataMode() === 'sample';
  const log = await d.select().from(runs).orderBy(desc(runs.startedAt)).limit(50);
  const warnings = log.length
    ? await d.select({ runId: runLogs.runId, level: runLogs.level, message: runLogs.message }).from(runLogs)
      .where(and(inArray(runLogs.runId, log.map((r) => r.id)), inArray(runLogs.level, ['warn', 'error']))).orderBy(runLogs.id)
    : [];
  const firstWarning = new Map<string, string>();
  for (const w of warnings) if (!firstWarning.has(w.runId)) firstWarning.set(w.runId, w.message);

  const latest = await Promise.all(SOURCES.map(async (s) => {
    const [last] = await d.select().from(runs).where(eq(runs.job, s.job)).orderBy(desc(runs.startedAt)).limit(1);
    return { ...s, last };
  }));

  // A manual odds pull covers every game in the next 7 days, one credit each.
  const upcoming = await d.select({ id: games.id }).from(games).where(and(
    gt(games.kickoffAt, now), lt(games.kickoffAt, new Date(now.getTime() + 7 * DAY)),
    or(eq(games.status, 'scheduled'), eq(games.status, 'in_progress')),
  ));
  const [credits] = await d.select().from(providerUsage).where(eq(providerUsage.provider, 'odds-api'));
  const left = credits?.remaining ?? null;

  const schedule = (job: string) => {
    if (job === 'pull-odds') return <span className="fc-has-tip" tabIndex={0} data-tip={snapshotTimes(now)}>Weekly and at kickoff</span>;
    if (job === 'build-picks') return 'After odds or usage';
    return dailyAt(job, now) ?? 'Daily';
  };
  const provider = (job: string, live: string) => {
    if (job === 'pull-odds' && !sample && left != null) return `${live}, ${left.toLocaleString('en-US')} credits left`;
    return sample && job !== 'build-picks' && job !== 'backup' ? 'Sample' : live;
  };
  // "Pull everything" leaves paid odds to their own confirmed button.
  const everything = BOOTSTRAP.filter((job) => sample || job !== 'pull-odds');

  return (
    <PullQueue>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Data</h1>
        </div>
        <div className="fc-page-header-actions">
          <PullAllButton jobs={[...everything]} />
        </div>
      </div>

      <section className="hg-section" aria-labelledby="sources-h">
        <h2 id="sources-h" className="text-heading-20">Sources</h2>
        <div className="fc-table-wrap">
          <table className="fc-table hg-sources">
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Last run</th>
                <th scope="col" data-grow>Result</th>
                <th scope="col">Schedule</th>
                <th scope="col"><span className="fc-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {latest.map(({ job, label, live, last }) => (
                <tr key={job}>
                  <th scope="row" className="hg-stack">
                    <span>{label}</span>
                    <span className="hg-sub text-copy-13">{provider(job, live)}</span>
                  </th>
                  <td className="hg-stack">
                    <RunCell job={job}>
                      {last ? (
                        <>
                          <RunStatus status={last.status} owner={last.failureOwner} />
                          <time className="hg-sub text-copy-13 fc-has-tip" tabIndex={0} dateTime={last.startedAt.toISOString()} data-tip={clock(last.startedAt)}>{ago(last.startedAt, now)}</time>
                        </>
                      ) : <span className="fc-level">Never run</span>}
                    </RunCell>
                  </td>
                  <td className="hg-result">
                    <ResultCell job={job}>{last?.message ?? ''}</ResultCell>
                  </td>
                  <td className="hg-nowrap">{schedule(job)}</td>
                  <td className="fc-cell-actions">
                    {job === 'pull-odds' && !sample
                      ? <PullButton job={job} label={label} cost={upcoming.length} left={left} />
                      : <PullButton job={job} label={label} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hg-section" aria-labelledby="log-h">
        <h2 id="log-h" className="text-heading-20">Pull log</h2>
        <div className="fc-table-wrap">
          <table className="fc-table">
            <caption className="fc-visually-hidden">Newest first, {log.length} runs</caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Source</th>
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
                  <td className="hg-nowrap">{LABELS[r.job] ?? r.job}</td>
                  <td className="hg-stack">
                    <span>{r.message}</span>
                    {firstWarning.has(r.id) && firstWarning.get(r.id) !== r.message && <span className="hg-sub text-copy-13">{firstWarning.get(r.id)}</span>}
                  </td>
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
      <Tips />
    </PullQueue>
  );
}
