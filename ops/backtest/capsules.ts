// Saturday capsules: for each bought week, everything the read may know about the players who passed MOD1q's or
// MOD2's screen, all dated before that week's Saturday 7:47 PM Mountain board. Sources are the nflverse injury report
// and depth chart, and Wayback Machine captures of league injury and news pages taken before the board.
// Writes experiments/backtest/capsules/WK{n}-saturday.md. Needs the MOD1q and MOD2 ledgers (replay.ts) first.
// Wayback is reached from GitHub Actions; raw captures are cached under experiments/backtest/cache/wayback.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { betLabel, findTeam, nameKey } from '../../packages/core/src/index';
import { parseCsv } from '../../packages/ingest/src/csv';
import { injuryReportAt, loadSeason } from './data';
import { CACHE_DIR, LEDGER_DIR, NFLVERSE_DIR, OUT_DIR, PLAN_PATH } from './paths';
import type { PlanWeek } from './plan';
import type { Ledger } from './replay';

export const CAPSULE_DIR = `${OUT_DIR}/capsules`;
const WAYBACK_DIR = `${CACHE_DIR}/wayback`;

/** League pages that name many players at once, so one capture per week covers the screen. */
export const SOURCES = [
  { outlet: 'ESPN', url: 'https://www.espn.com/nfl/injuries' },
  { outlet: 'NFL.com', url: 'https://www.nfl.com/injuries/' },
  { outlet: 'CBS Sports', url: 'https://www.cbssports.com/nfl/injuries/' },
  { outlet: 'RotoWire', url: 'https://www.rotowire.com/football/news.php' },
] as const;

const ts14 = (d: Date) => d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const fromTs14 = (t: string) => new Date(`${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`);

async function get(url: string, tries = 3): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { 'user-agent': 'hiddengems-backtest' } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
  return null;
}

interface Capture { outlet: string; source: string; url: string; capturedAt: Date; text: string[] }

/** The last 200 capture of a page in the four days before the board, as text lines. Null when there is none. */
async function captureBefore(week: number, outlet: string, source: string, boardAt: Date): Promise<Capture | null> {
  const cache = `${WAYBACK_DIR}/wk${week}-${nameKey(outlet)}.json`;
  if (process.env.BACKTEST_NO_WAYBACK) return null;
  if (existsSync(cache)) {
    const c = JSON.parse(readFileSync(cache, 'utf8'));
    return c ? { ...c, capturedAt: new Date(c.capturedAt) } : null;
  }
  const from = new Date(boardAt.getTime() - 4 * 86_400_000);
  const cdx = await get(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(source)}&from=${ts14(from)}&to=${ts14(new Date(boardAt.getTime() - 60_000))}&output=json&filter=statuscode:200`);
  const rows = cdx ? (JSON.parse(cdx) as string[][]).slice(1) : [];
  let out: Capture | null = null;
  for (const row of rows.reverse()) {
    const [, stamp, original] = row;
    const at = fromTs14(stamp!);
    if (!(at < boardAt)) continue;
    const html = await get(`https://web.archive.org/web/${stamp}id_/${original}`);
    if (!html) continue;
    out = { outlet, source, url: `https://web.archive.org/web/${stamp}/${original}`, capturedAt: at, text: textLines(html) };
    break;
  }
  mkdirSync(WAYBACK_DIR, { recursive: true });
  writeFileSync(cache, JSON.stringify(out));
  return out;
}

/** HTML to readable lines: one per table row, paragraph or list item. */
export function textLines(html: string): string[] {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(tr|p|li|div|h\d|article|section)>|<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' · ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|&#x27;/g, "'").replace(/&quot;/g, '"')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').replace(/^( · )+|( · )+$/g, '').trim()).filter((l) => l.length > 15 && l.length < 900);
}

interface Screened { pid: string; name: string; team: string; picks: { mod: string; key: string; label: string; price: number; level: number; chance: number }[] }

export async function buildCapsule(w: PlanWeek, depthRows: Record<string, string>[], season: ReturnType<typeof loadSeason>): Promise<string> {
  const boardAt = new Date(w.boardAt);
  const screened = new Map<string, Screened>();
  for (const mod of ['MOD1q', 'MOD2']) for (const seg of ['AM', 'PM', 'SNF']) {
    const f = `${LEDGER_DIR}/${mod}-WK${w.week}${seg}-back.json`;
    if (!existsSync(f)) continue;
    const l: Ledger = JSON.parse(readFileSync(f, 'utf8'));
    for (const p of l.picks) {
      const pid = p.selection_key.split(':')[2]!;
      const s = screened.get(pid) ?? { pid, name: p.player, team: season.rosters.get(w.week)?.get(pid)?.team ?? '', picks: [] };
      s.picks.push({ mod, key: p.selection_key, label: betLabel(p.market, p.line), price: p.lock_price, level: p.gem_level, chance: p.mod_chance });
      screened.set(pid, s);
    }
  }

  // The guard, again: every item must be dated before the board.
  const injuryAt = injuryReportAt(w.sunday);
  if (!(injuryAt < boardAt)) throw new Error(`Week ${w.week} injury report is not before the board`);
  const depthAt = depthRows.map((r) => r.dt!).filter((d) => new Date(d) < boardAt).sort().at(-1);
  const depth = depthAt ? depthRows.filter((r) => r.dt === depthAt) : [];
  const captures: Capture[] = [];
  for (const s of SOURCES) {
    const c = await captureBefore(w.week, s.outlet, s.url, boardAt);
    if (c && !(c.capturedAt < boardAt)) throw new Error(`Week ${w.week} ${s.outlet} capture ${c.capturedAt.toISOString()} is not before the board`);
    if (c) captures.push(c);
  }
  const injuries = season.injuries.get(w.week) ?? new Map();

  const L: string[] = [];
  L.push(`# Week ${w.week} Saturday capsule`, '');
  L.push(`Board ${w.boardAt}. Everything below is dated before it. Nothing here says how any game went.`, '');
  L.push('## Sources', '');
  L.push(`- nflverse injury report, week ${w.week}, final Friday report (${injuryAt.toISOString()}), https://github.com/nflverse/nflverse-data/releases/tag/injuries`);
  L.push(`- nflverse depth chart, snapshot ${depthAt ?? 'none before the board'}, https://github.com/nflverse/nflverse-data/releases/tag/depth_charts`);
  for (const c of captures) L.push(`- ${c.outlet}, captured ${c.capturedAt.toISOString()}, ${c.url}`);
  for (const s of SOURCES) if (!captures.some((c) => c.outlet === s.outlet)) L.push(`- ${s.outlet}, no Wayback capture in the four days before the board`);
  L.push('', '## Players', '');
  for (const s of [...screened.values()].sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))) {
    const team = findTeam(s.team)?.abbr ?? s.team.toUpperCase();
    L.push(`**${s.name}, ${team}**`, '');
    L.push('Picks to read');
    for (const p of s.picks) L.push(`- \`${p.key}\` ${p.mod} GEM${p.level} · ${p.label} at ${p.price.toFixed(2)} · its chance ${(p.chance * 100).toFixed(0)}%`);
    const inj = injuries.get(s.pid);
    L.push('', `Injury report (nflverse, ${injuryAt.toISOString()}) · ${inj ? [inj.status ?? 'no game status', inj.injury, inj.practice].filter(Boolean).join(' · ') : 'not listed'}`);
    const mine = depth.filter((r) => r.gsis_id === s.pid);
    const spots = mine.map((r) => {
      const ahead = depth.filter((x) => x.team === r.team && x.pos_grp === r.pos_grp && x.pos_abb === r.pos_abb && Number(x.pos_rank) < Number(r.pos_rank)).map((x) => x.player_name);
      return `${r.pos_abb} ${r.pos_rank}${ahead.length ? ` behind ${ahead.join(', ')}` : ''}`;
    });
    L.push(`Depth chart (nflverse, ${depthAt ?? 'n/a'}) · ${spots.length ? [...new Set(spots)].join('; ') : 'not listed'}`);
    const want = nameKey(s.name);
    for (const c of captures) {
      const hits = c.text.filter((t) => nameKey(t).includes(want)).slice(0, 4);
      for (const h of hits) L.push(`- ${c.outlet}, ${c.url}, captured ${c.capturedAt.toISOString()} · ${h.slice(0, 500)}`);
    }
    L.push('');
  }
  return L.join('\n');
}

async function main() {
  const plan: PlanWeek[] = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
  const season = loadSeason();
  const depthRows = parseCsv(readFileSync(`${NFLVERSE_DIR}/depth_charts_2026.csv`, 'utf8'));
  mkdirSync(CAPSULE_DIR, { recursive: true });
  for (const w of plan.filter((x) => x.buy)) {
    const md = await buildCapsule(w, depthRows, season);
    writeFileSync(`${CAPSULE_DIR}/WK${w.week}-saturday.md`, md);
    console.log(`Week ${w.week}: capsule with ${(md.match(/^\*\*/gm) ?? []).length} players`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((err) => { console.error(err); process.exit(1); });
