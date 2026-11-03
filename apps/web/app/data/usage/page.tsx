import { providerUsage, runs } from '@hiddengems/db';
import { dataMode } from '@hiddengems/ingest';
import { eq, gte } from 'drizzle-orm';
import type { Metadata } from 'next';
import { Sparkline, UsageChart, type UsageSeries } from '@/components/usage-chart';
import { DAY, NO_PROVIDER, SOURCES } from '@/lib/data-health';
import { db } from '@/lib/db';
import { ZONE } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Usage' };

const WINDOW_DAYS = 14;
const WARN_AT = 80;

// What the sources cost: the month's odds credits against the plan, and every provider request per day,
// modeled on the vercel.com Connect usage and Observability query views (owner references 2026-11-03).
export default async function UsagePage() {
  const { db: d } = await db();
  const now = new Date();
  const sample = dataMode() === 'sample';
  const since = new Date(now.getTime() - (WINDOW_DAYS - 1) * DAY);
  const dayKey = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(x);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => new Date(since.getTime() + i * DAY));
  const index = new Map(days.map((x, i) => [dayKey(x), i]));
  since.setTime(Date.parse(`${dayKey(since)}T00:00:00Z`) - 86_400_000); // a day of slack for the zone offset

  const rows = await d.select({ job: runs.job, startedAt: runs.startedAt, requests: runs.requestCount }).from(runs).where(gte(runs.startedAt, since));
  const byJob = new Map<string, { values: number[]; runs: number }>();
  for (const r of rows) {
    const i = index.get(dayKey(r.startedAt));
    if (i == null) continue;
    const e = byJob.get(r.job) ?? { values: Array<number>(WINDOW_DAYS).fill(0), runs: 0 };
    e.values[i] = (e.values[i] ?? 0) + r.requests;
    e.runs += 1;
    byJob.set(r.job, e);
  }
  // A source keeps its slot in every view: the order of SOURCES, skipping Ratings and Backtest (they call no provider).
  const series: (UsageSeries & { job: string; runs: number; total: number })[] = SOURCES
    .filter((s) => !NO_PROVIDER.has(s.job))
    .map((s, i) => {
      const e = byJob.get(s.job) ?? { values: Array<number>(WINDOW_DAYS).fill(0), runs: 0 };
      return { job: s.job, label: s.label, slot: i + 1, values: e.values, runs: e.runs, total: e.values.reduce((a, b) => a + b, 0) };
    });
  const grand = series.reduce((n, s) => n + s.total, 0);
  const sparkMax = Math.max(1, ...series.flatMap((s) => s.values));

  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, ...o });
  const dayLabels = days.map((x, i) => ({
    label: i === days.length - 1 ? 'Today' : fmt({ month: 'short', day: 'numeric' }).format(x),
    long: fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(x),
  }));

  const [credits] = await d.select().from(providerUsage).where(eq(providerUsage.provider, 'odds-api'));
  const used = credits?.used ?? null, left = credits?.remaining ?? null;
  const limit = used != null && left != null ? used + left : null;
  const pct = limit ? (used! / limit) * 100 : 0;
  const level = !limit ? 'ok' : pct >= 100 ? 'error' : pct >= WARN_AT ? 'warning' : 'ok';

  return (
    <>
      <div className="fc-page-header">
        <div className="fc-page-header-text">
          <h1 className="text-heading-32">Usage</h1>
        </div>
      </div>

      {!sample && (
        <section className="hg-section" aria-label="Odds credits">
          <div className="fc-meter" data-level={level}>
            <div className="fc-meter-head">
              <span className="fc-meter-label" id="credits-m">Odds credits this month</span>
              <span className="fc-meter-value">
                {limit ? <><strong>{used!.toLocaleString('en-US')}</strong> of {limit.toLocaleString('en-US')}</> : 'Known after the first odds pull'}
              </span>
            </div>
            <div className="fc-meter-track" role="meter" aria-labelledby="credits-m" aria-valuemin={0} aria-valuemax={limit ?? 0} aria-valuenow={used ?? 0}
              aria-valuetext={limit ? `${used} of ${limit}, ${Math.round(pct)}%${level === 'warning' ? ', near limit' : level === 'error' ? ', limit reached' : ''}` : 'Unknown'}>
              <span className="fc-meter-fill" style={{ ['--value' as string]: pct }} />
              <span className="fc-meter-stop" style={{ ['--at' as string]: WARN_AT }} aria-hidden="true" />
            </div>
            <div className="fc-meter-foot">
              <span>{limit ? `${Math.round(pct)}% used` : ''}{level === 'warning' && <>, <span className="fc-meter-state">near limit</span></>}{level === 'error' && <>, <span className="fc-meter-state">limit reached</span></>}</span>
              <span>One credit per game per pull. Scheduled pulls stop before the month runs out.</span>
            </div>
          </div>
        </section>
      )}

      <section className="fc-chart-card" aria-labelledby="requests-h">
        <div className="fc-chart-card-header">
          <div className="fc-chart-card-titlerow">
            <div className="fc-chart-card-heading">
              <h2 id="requests-h" className="fc-chart-card-title">Provider requests</h2>
              <span className="fc-chart-card-meta">Last {WINDOW_DAYS} days, {grand.toLocaleString('en-US')} in all</span>
            </div>
          </div>
          <ul className="fc-legend" data-key="bar" role="list" aria-label={`Totals for the last ${WINDOW_DAYS} days`}>
            {series.map((s) => (
              <li key={s.job} className="fc-legend-item" data-series={s.slot}>
                <span className="fc-legend-key" aria-hidden="true" />
                <span className="fc-legend-name">{s.label}</span>
                <span className="fc-legend-value">{s.total.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="fc-chart-card-body">
          <UsageChart days={dayLabels} series={series} summary={`Provider requests per day for the last ${WINDOW_DAYS} days, ${grand} in all`} />
        </div>
      </section>

      <section className="hg-section" aria-labelledby="by-source-h">
        <h2 id="by-source-h" className="text-heading-20">By source</h2>
        <div className="fc-table-wrap">
          <table className="fc-table">
            <thead>
              <tr>
                <th scope="col" data-grow>Source</th>
                <th scope="col" data-align="numeric">Runs</th>
                <th scope="col" data-align="numeric">Requests</th>
                <th scope="col" className="hg-spark-col">Last {WINDOW_DAYS} days</th>
              </tr>
            </thead>
            <tbody>
              {[...series].sort((a, b) => b.total - a.total).map((s) => (
                <tr key={s.job}>
                  <th scope="row"><span className="fc-legend-item" data-series={s.slot}><span className="fc-legend-key hg-key" aria-hidden="true" />{s.label}</span></th>
                  <td data-align="numeric">{s.runs.toLocaleString('en-US')}</td>
                  <td data-align="numeric">{s.total.toLocaleString('en-US')}</td>
                  <td className="hg-spark-col"><Sparkline values={s.values} max={sparkMax} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
