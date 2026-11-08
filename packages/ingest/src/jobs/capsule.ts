// capsule: the week's inputs saved as they stood (core capsules.ts), so future MODs backtest on our own record.
// Saturday board: raw odds for every NFL player prop and game market across every US book, the nflverse files
// that get rewritten week to week, and the app's games and forecasts. Close: raw odds per game shortly before
// kickoff. Files go to the private backup repository. Cron calls it every 5 minutes; most calls find nothing due.
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { CAPSULE_MARKETS, CAPSULE_RULES, capsulePath, dueCapsules, gameId } from '@hiddengems/core';
import { gameWeather, games, oddsSlots, providerUsage } from '@hiddengems/db';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import { ours } from '../errors';
import type { Job } from '../runner';
import { NFLVERSE_BASE } from '../providers/nflverse';
import { plural, teamId } from './shared';

const DAY = 86_400_000;

/** nflverse files that change week to week, or that a prop beyond anytime TD needs. Path under the release base. */
export const CAPSULE_NFLVERSE = (season: number) => [
  { name: 'schedule', path: 'schedules/games.csv' },
  { name: 'roster_weekly', path: `weekly_rosters/roster_weekly_${season}.csv` },
  // Twice-daily snapshots for the whole season (72 MB): keep the latest only.
  { name: 'depth_charts', path: `depth_charts/depth_charts_${season}.csv`, latestOnly: true },
  { name: 'injuries', path: `injuries/injuries_${season}.csv` },
  { name: 'snap_counts', path: `snap_counts/snap_counts_${season}.csv` },
  { name: 'stats_player_week', path: `stats_player/stats_player_week_${season}.csv` },
  { name: 'stats_team_week', path: `stats_team/stats_team_week_${season}.csv` },
  { name: 'pfr_pass', path: `pfr_advstats/advstats_week_pass_${season}.csv` },
  { name: 'pfr_rush', path: `pfr_advstats/advstats_week_rush_${season}.csv` },
  { name: 'pfr_rec', path: `pfr_advstats/advstats_week_rec_${season}.csv` },
  { name: 'pfr_def', path: `pfr_advstats/advstats_week_def_${season}.csv` },
  { name: 'ngs_passing', path: 'nextgen_stats/ngs_passing.csv.gz' },
  { name: 'ngs_rushing', path: 'nextgen_stats/ngs_rushing.csv.gz' },
  { name: 'ngs_receiving', path: 'nextgen_stats/ngs_receiving.csv.gz' },
  { name: 'ftn_charting', path: `ftn_charting/ftn_charting_${season}.csv` },
  { name: 'pbp', path: `pbp/play_by_play_${season}.csv.gz` },
];

/** Rows of a CSV whose first column equals its latest value (depth charts are keyed by snapshot time). */
export function latestRows(csv: string): string {
  const lines = csv.split('\n');
  const header = lines[0]!;
  const key = (l: string) => l.slice(0, l.indexOf(','));
  let latest = '';
  for (let i = 1; i < lines.length; i++) if (lines[i] && key(lines[i]!) > latest) latest = key(lines[i]!);
  return [header, ...lines.slice(1).filter((l) => l && key(l) === latest)].join('\n') + '\n';
}

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const gz = (text: string) => gzipSync(text);

export const capsule: Job = {
  name: 'capsule',
  provider: 'odds',
  async run(ctx) {
    const { db, now } = ctx;
    const odds = ctx.providers.capsuleOdds ?? ctx.providers.odds;
    const store = ctx.providers.backup;
    const upcoming = await db.select().from(games).where(and(gt(games.kickoffAt, now), lt(games.kickoffAt, new Date(now.getTime() + CAPSULE_RULES.horizonDays * DAY)))).orderBy(asc(games.kickoffAt));
    if (!upcoming.length) return { skipped: 'No games in the next 4 days' };
    const taken = new Set((await db.select({ slot: oddsSlots.slot }).from(oddsSlots)).map((r) => r.slot));
    const due = dueCapsules(now, upcoming.map((g) => ({ ...g, kickoff: g.kickoffAt })), taken);
    // A manual run captures the board now, outside its window, unless this week's board is already saved.
    const board = due.board ?? (ctx.force ? { slot: `capsule-sat:manual:${now.toISOString().slice(0, 16)}`, saturday: null } : null);
    if (!board && !due.closes.length) return { skipped: 'No capsule is due' };

    const pctx = ctx.using(odds);
    const events = await odds.events(pctx); // free, and refreshes the quota from its headers
    if (odds.id.startsWith('odds-api')) {
      const [usage] = await db.select().from(providerUsage).where(eq(providerUsage.provider, odds.id));
      const plan = (usage?.used ?? 0) + (usage?.remaining ?? 0);
      if (plan < CAPSULE_RULES.minPlanCredits) return { skipped: `Capsules wait for the paid odds plan (${plan} credits this month)` };
      const need = (board ? upcoming.length : due.closes.length) * CAPSULE_MARKETS.length;
      if (usage?.remaining != null && usage.remaining < need) {
        throw ours('quota', `${usage.remaining} odds credits left this month, up to ${need} needed for this capsule`, { provider: odds.id });
      }
    }
    const byGame = new Map(events.flatMap((e) => {
      const away = teamId(e.awayTeam), home = teamId(e.homeTeam);
      return away && home ? [[gameId(e.kickoff, away, home), e] as const] : [];
    }));

    const spctx = ctx.using(store);
    const files: { path: string; bytes: number; sha256: string; source: string }[] = [];
    const put = async (path: string, bytes: Uint8Array, source: string) => {
      await store.put(spctx, path, bytes, `Capsule ${path}`);
      files.push({ path, bytes: bytes.length, sha256: sha(bytes), source });
    };
    const capturedAt = now.toISOString();
    const missing: string[] = [];
    const failed: string[] = [];

    const captureOdds = async (kind: 'sat' | 'close', list: typeof upcoming) => {
      for (const g of list) {
        const event = byGame.get(g.id);
        if (!event) { missing.push(g.id); continue; }
        const raw = await odds.rawEventOdds(pctx, event, CAPSULE_MARKETS);
        await put(capsulePath(g.season, g.week, kind, `odds/${g.id}.json.gz`), gz(JSON.stringify({ capturedAt, gameId: g.id, kickoff: g.kickoffAt, raw })), `${odds.id} event ${event.externalId}`);
      }
    };

    const week = upcoming[0]!;
    if (board) {
      await captureOdds('sat', upcoming);
      // nflverse runs only live: the sample provider has no files to keep.
      if (ctx.providers.usage.id === 'nflverse') {
        const http = ctx.using(ctx.providers.usage).http;
        for (const f of CAPSULE_NFLVERSE(week.season)) {
          const url = `${NFLVERSE_BASE}/${f.path}`;
          try {
            let bytes: Uint8Array;
            if (f.path.endsWith('.gz')) bytes = await http.getBytes(url);
            else bytes = gz(f.latestOnly ? latestRows(await http.getText(url)) : await http.getText(url));
            await put(capsulePath(week.season, week.week, 'sat', `nflverse/${f.name}.csv.gz`), bytes, url);
          } catch (err) {
            failed.push(f.name);
            ctx.log('warn', `nflverse ${f.name} was not saved`, { error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      // The app's own view: kickoffs, venues and the forecasts the model read.
      const ids = upcoming.map((g) => g.id);
      const weather = await db.select().from(gameWeather).where(inArray(gameWeather.gameId, ids));
      await put(capsulePath(week.season, week.week, 'sat', 'app/games.json.gz'), gz(JSON.stringify({ capturedAt, games: upcoming, weather })), 'hidden gems database');
    }
    if (due.closes.length) await captureOdds('close', upcoming.filter((g) => due.closes.some((c) => c.id === g.id)));

    const [usage] = await db.select().from(providerUsage).where(eq(providerUsage.provider, odds.id));
    const kinds = [board ? 'sat' : null, due.closes.length ? 'close' : null].filter(Boolean) as ('sat' | 'close')[];
    for (const kind of kinds) {
      const mine = files.filter((f) => f.path.includes(`/${kind}/`));
      const manifest = { capturedAt, kind, slot: kind === 'sat' ? board!.slot : due.closes.map((g) => `capsule-close:${g.id}`), markets: CAPSULE_MARKETS, missing, failed, creditsRemaining: usage?.remaining ?? null, files: mine };
      const name = kind === 'sat' ? 'manifest.json' : `manifest-${now.toISOString().slice(0, 16).replace(':', '')}.json`;
      await store.put(spctx, capsulePath(week.season, week.week, kind, name), new TextEncoder().encode(JSON.stringify(manifest, null, 2)), `Capsule manifest ${kind}`);
    }

    const slots = [
      ...(due.board ? [{ slot: due.board.slot, runId: ctx.runId, games: upcoming.length, pulledAt: now }] : []),
      ...due.closes.map((g) => ({ slot: `capsule-close:${g.id}`, runId: ctx.runId, games: 1, pulledAt: now })),
    ];
    if (slots.length) await db.insert(oddsSlots).values(slots).onConflictDoNothing();
    if (missing.length) ctx.log('warn', `${plural(missing.length, 'game')} had no odds event`, { gameIds: missing });

    const bytes = files.reduce((n, f) => n + f.bytes, 0);
    return {
      message: `Saved ${plural(files.length, 'capsule file')} (${kinds.join(' and ')}) to ${store.where}, ${(bytes / 1024 / 1024).toFixed(1)} MB${failed.length ? `, ${failed.length} nflverse files failed` : ''}`,
      rowsWritten: 0,
      meta: { kinds, slots: slots.map((s) => s.slot), files: files.length, bytes, missing, failed, creditsRemaining: usage?.remaining ?? null },
    };
  },
};
