// Archives nflverse's free season files (no credits) into the private backup repository, with the rule that stamps
// each row with when it became knowable, so a replayed week only reads what existed before its board.
//
//   tsx ops/backtest/archive-nflverse.ts <backups clone> 2024 2025
//
// Writes nflverse/<season>/<file>.gz (gzipped unless already) and nflverse/<season>/manifest.json (source URL, download time, sha256, stamp rule).
// nflverse revises files during and after a season, so the archive is the copy a replay reads, not the live release.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BASE = 'https://github.com/nflverse/nflverse-data/releases/download';
const FILES = (s: number) => [
  { tag: 'schedules', file: 'games.csv', stamp: 'Schedule facts (teams, kickoff, roof, stadium) are known in advance. Never read temp, wind or result columns before kickoff; spread_line and total_line are closing lines, not board lines.' },
  { tag: 'stats_player', file: `stats_player_week_${s}.csv`, stamp: 'Box score per player per game. Stamped at that game\'s kickoff (knowable once it ends, so only games before the board are read).' },
  { tag: 'stats_team', file: `stats_team_week_${s}.csv`, stamp: 'Box score per team per game. Stamped at that game\'s kickoff.' },
  { tag: 'snap_counts', file: `snap_counts_${s}.csv`, stamp: 'Snaps per player per game. Stamped at that game\'s kickoff.' },
  { tag: 'pbp', file: `play_by_play_${s}.csv.gz`, stamp: 'Play by play. Stamped at that game\'s kickoff.' },
  { tag: 'rosters', file: `roster_${s}.csv`, stamp: 'Season roster as of the download. Use only for ids and names, never for status or team on a given week.' },
  { tag: 'weekly_rosters', file: `roster_weekly_${s}.csv`, stamp: 'Roster for week N. Stamped Wednesday 4 PM Eastern of that week.' },
  { tag: 'depth_charts', file: `depth_charts_${s}.csv`, stamp: s >= 2025 ? 'Daily snapshots, stamped at their dt. Read the last snapshot before the board.' : 'One chart per week N. Stamped Wednesday 4 PM Eastern of that week.' },
  { tag: 'injuries', file: `injuries_${s}.csv`, stamp: 'Final report per player per week N. Stamped 4 PM Eastern on the final report day before that team\'s game (Friday for Sunday, Saturday for Monday, the day before for any other day).' },
];

async function main() {
  const [target, ...seasons] = process.argv.slice(2);
  if (!target || !seasons.length) throw new Error('Usage: archive-nflverse.ts <backups clone> <season> [season...]');
  for (const season of seasons.map(Number)) {
    const dir = `${target}/nflverse/${season}`;
    mkdirSync(dir, { recursive: true });
    const manifest = [];
    for (const f of FILES(season)) {
      const url = `${BASE}/${f.tag}/${f.file}`;
      let res = await fetch(url);
      for (let i = 1; i < 4 && !res.ok && res.status >= 500; i++) { await new Promise((r) => setTimeout(r, 5000 * i)); res = await fetch(url); }
      if (!res.ok) { manifest.push({ ...f, url, missing: `HTTP ${res.status}` }); console.warn(`${season} ${f.file}: HTTP ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const stored = f.file.endsWith('.gz') ? f.file : `${f.file}.gz`;
      writeFileSync(`${dir}/${stored}`, f.file.endsWith('.gz') ? buf : gzipSync(buf, { level: 9 }));
      manifest.push({ ...f, stored, url, downloadedAt: new Date().toISOString(), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
      console.log(`${season} ${f.file}: ${(buf.length / 1e6).toFixed(1)} MB`);
    }
    writeFileSync(`${dir}/manifest.json`, `${JSON.stringify({ season, files: manifest }, null, 2)}\n`);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
