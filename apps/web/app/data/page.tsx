import { games, jobSettings, providerUsage, runLogs, runs } from '@hiddengems/db';
import { BOOTSTRAP, dataMode } from '@hiddengems/ingest';
import { and, desc, eq, gt, inArray, lt, or } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RunStatus } from '@/components/marks';
import { Tips } from '@/components/tips';
import {
  DAY, OVERDUE_MS, SOURCES, isDaily, nextDaily, nextOddsPull, scheduleText, snapshotTimes, until,
} from '@/lib/data-health';
import { db } from '@/lib/db';
import { clock, dayTime, duration } from '@/lib/format';
import { FixButton, PullAllButton, PullButton, PullQueue, ResultCell, RunCell } from './pulls';
import { SourceMenu } from './source-menu';

export const dynamic = 'force-dynamic';
// Each pull is its own request (see pulls.tsx); a full usage pull reads a season of play by play.
export const maxDuration = 300;
export const metadata: Metadata = { title: 'Data health' };

// Facet patterns/connections.md and components/schedule.md: each source is a schedule row (status, next
// run, last run, Pull now), and a source that needs a look carries one note with the fix. Run history is
// on Logs, requests on Usage and stored copies on Backups, so this page is where you check and act.
export default async function DataPage() {
  const { db: d } = await db();
  const now = new Date();
  const sample = dataMode() === 'sample';

  const latest = await Promise.all(SOURCES.map(async (s) => {
    const [last] = await d.select().from(runs).where(eq(runs.job, s.job)).orderBy(desc(runs.startedAt)).limit(1);
    return { ...s, last };
  }));
  const lastIds = latest.flatMap((s) => (s.last ? [s.last.id] : []));
  const warnings = lastIds.length
    ? await d.select({ runId: runLogs.runId, message: runLogs.message }).from(runLogs)
      .where(and(inArray(runLogs.runId, lastIds), inArray(runLogs.level, ['warn', 'error']))).orderBy(runLogs.id)
    : [];
  const firstWarning = new Map<string, string>();
  for (const w of warnings) if (!firstWarning.has(w.runId)) firstWarning.set(w.runId, w.message);

  // A manual odds pull covers every game in the next 7 days, one credit each.
  const upcoming = await d.select({ kickoffAt: games.kickoffAt }).from(games).where(and(
    gt(games.kickoffAt, now), lt(games.kickoffAt, new Date(now.getTime() + 7 * DAY)),
    or(eq(games.status, 'scheduled'), eq(games.status, 'in_progress')),
  ));
  const [credits] = await d.select().from(providerUsage).where(eq(providerUsage.provider, 'odds-api'));
  const left = credits?.remaining ?? null;
  const total = credits && credits.remaining != null && credits.used != null ? credits.remaining + credits.used : null;
  const nextOdds = nextOddsPull(now, upcoming.map((g) => g.kickoffAt));
  // Pausing needs the job_settings table (migration 0004); until it exists, sources read as running.
  let pausable = true;
  const paused = new Set<string>();
  try {
    for (const r of await d.select().from(jobSettings)) if (r.paused) paused.add(r.job);
  } catch { pausable = false; }

  // What needs a look, the note that says so, and the fix: one per source. A warning about players or games
  // the roster or schedule does not know is fixed by pulling those first, then the source again.
  type Note = { type: 'error' | 'warning'; text: string; short: string; overdue?: boolean; fix: { label: string; jobs: string[] } };
  const fixFor = (job: string, label: string, text: string, again: boolean): Note['fix'] => {
    const verb = again ? 'Pull again' : 'Pull now';
    if (job === 'pull-odds') return { label: 'Pull rosters, then ratings', jobs: ['pull-rosters', 'build-picks'] };
    if (/roster/i.test(text)) return { label: `Pull rosters, then ${label.toLowerCase()}`, jobs: ['pull-rosters', job] };
    if (/schedule/i.test(text)) return { label: `Pull schedule, then ${label.toLowerCase()}`, jobs: ['pull-schedule', job] };
    return { label: verb, jobs: [job] };
  };
  const notes = new Map<string, Note>();
  for (const { job, label, last } of latest) {
    if (last?.status === 'failed') {
      const text = last.message ?? 'The last pull failed.';
      notes.set(job, { type: 'error', text, short: `${label} failed`, fix: fixFor(job, label, text, true) });
    } else if (last?.status === 'warned') {
      const text = firstWarning.get(last.id) ?? last.message ?? 'The last pull warned.';
      notes.set(job, { type: 'warning', text, short: `${label} warned`, fix: fixFor(job, label, text, true) });
    } else if (!paused.has(job) && isDaily(job) && (!last || now.getTime() - last.startedAt.getTime() > OVERDUE_MS)) {
      notes.set(job, last
        ? { type: 'warning', text: `Missed its daily run. Last ran ${dayTime(last.startedAt, now)}.`, short: `${label} overdue`, overdue: true, fix: { label: 'Pull now', jobs: [job] } }
        : { type: 'warning', text: 'Has never run.', short: `${label} never ran`, fix: { label: 'Pull now', jobs: [job] } });
    }
  }
  // "Fix all" runs every fix once, in source order.
  const fixAll = [...new Set([...notes.values()].flatMap((n) => n.fix.jobs))];
  const needs = [...notes.values()].map((n) => n.short);

  const provider = (job: string, live: string) => (sample && job !== 'build-picks' && job !== 'backup' ? 'Sample' : live);
  const oddsProps = sample ? {} : { cost: upcoming.length, left };
  // The header pulls every free source, then backs up. Paid odds keep their own confirmed button, and the
  // label says so (owner feedback 2026-11-03: "everything" did not pull odds).
  const everything = [...BOOTSTRAP.filter((job) => sample || job !== 'pull-odds'), 'backup'];

  return (
    <PullQueue>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Data health</h1>
        </div>
        <div className="fc-page-header-actions">
          <PullAllButton jobs={everything} label={sample ? 'Pull everything' : 'Pull all but odds'} />
        </div>
      </div>

      <dl className="fc-stat-strip hg-overview">
        <div className="fc-stat">
          <dt className="fc-stat-label">Status</dt>
          <dd className="fc-stat-figure">
            <span className="fc-stat-value hg-status-value">
              <span className="fc-status-dot" data-state={needs.length ? 'stale' : 'live'} aria-hidden="true" />
              {needs.length ? `${needs.length} need a look` : 'All clear'}
            </span>
          </dd>
          <dd className="fc-stat-basis">{needs.length ? needs.join(', ') : 'Every source ran on time'}</dd>
          {needs.length > 0 && <dd className="hg-stat-action"><FixButton jobs={fixAll} text={needs.length > 1 ? 'Fix all' : 'Fix'} /></dd>}
        </div>
        <div className="fc-stat">
          <dt className="fc-stat-label">Next odds pull</dt>
          <dd className="fc-stat-figure"><span className="fc-stat-value">{nextOdds ? dayTime(nextOdds.at, now) : 'None'}</span></dd>
          <dd className="fc-stat-basis">{nextOdds ? `${nextOdds.what}, ${until(nextOdds.at, now)}` : 'No games in the next week'}</dd>
        </div>
        {!sample && (
          <div className="fc-stat">
            <dt className="fc-stat-label">Odds credits left</dt>
            <dd className="fc-stat-figure">
              <span className="fc-stat-value">{left != null ? left.toLocaleString('en-US') : 'Not known'}</span>
              {total != null && <span className="fc-stat-qualifier">of {total.toLocaleString('en-US')} this month</span>}
            </dd>
            <dd className="fc-stat-basis">{left != null ? <Link className="hg-foot-link" href="/data/usage">See usage</Link> : 'Known after the first odds pull'}</dd>
          </div>
        )}
      </dl>

      <section className="hg-section" aria-labelledby="sources-h">
        <h2 id="sources-h" className="text-heading-20">Sources</h2>
        <ul className="fc-list hg-sources" role="list" aria-labelledby="sources-h">
          <li className="fc-schedule-head" aria-hidden="true"><span>Source</span><span>Status</span><span>Next run</span><span>Last run</span></li>
          {latest.map(({ job, label, live, last }) => {
            const isPaused = paused.has(job);
            const next = isPaused ? null : job === 'pull-odds' ? nextOdds?.at ?? null : nextDaily(job, now);
            const note = notes.get(job);
            return (
              <li key={job} className="fc-list-row fc-schedule-row" data-state={note?.type === 'error' ? 'failed' : undefined}>
                <div className="fc-list-row-main">
                  <p className="fc-list-row-title">{label}</p>
                  <p className="fc-meta">
                    <span>{provider(job, live)}</span>
                    {job === 'pull-odds'
                      ? <span><span className="fc-has-tip" tabIndex={0} data-tip={snapshotTimes(now)}>{scheduleText(job, now)}</span></span>
                      : <span>{scheduleText(job, now)}</span>}
                  </p>
                  <p className="hg-result text-copy-13"><ResultCell job={job}>{last?.message ?? 'Never run'}</ResultCell></p>
                </div>
                <span className="fc-schedule-status">
                  <RunCell job={job}>
                    {isPaused ? <span className="fc-level">Paused</span>
                      : !last ? <span className="fc-level">Never run</span>
                      : note?.overdue ? <span className="fc-level" data-level="warning">Overdue</span>
                        : <RunStatus status={last.status} owner={last.failureOwner} />}
                  </RunCell>
                </span>
                <p className="fc-schedule-next">
                  <span className="fc-schedule-label">Next run</span>
                  {next ? (
                    <>
                      <time className="fc-timestamp" dateTime={next.toISOString()} title={clock(next)}>{dayTime(next, now)}</time>
                      <span className="fc-schedule-detail">{until(next, now)}</span>
                    </>
                  ) : <span className="fc-value-empty">{isPaused ? 'None' : 'After pulls'}</span>}
                </p>
                <p className="fc-schedule-last">
                  <span className="fc-schedule-label">Last run</span>
                  {last ? (
                    <>
                      <Link className="hg-run-link" href={`/data/logs?run=${last.id}`} aria-label={`Open the log for ${label}'s last run`}>
                        <time className="fc-timestamp" dateTime={last.startedAt.toISOString()} title={clock(last.startedAt)}>{dayTime(last.startedAt, now)}</time>
                      </Link>
                      <span className="fc-schedule-detail">Ran {duration(last.durationMs)}</span>
                    </>
                  ) : <span className="fc-value-empty">Never</span>}
                </p>
                <div className="fc-list-row-actions">
                  {job === 'pull-odds' ? <PullButton job={job} label={label} {...oddsProps} /> : <PullButton job={job} label={label} />}
                  <SourceMenu job={job} label={label} paused={isPaused} canPause={pausable && job !== 'build-picks'} />
                </div>
                {note && (
                  <div className="fc-list-row-note">
                    <div className="fc-note" data-type={note.type} data-size="small" data-action>
                      <span>{note.text}</span>
                      <FixButton className="fc-note-action" jobs={note.fix.jobs} text={note.fix.label} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <Tips />
    </PullQueue>
  );
}
