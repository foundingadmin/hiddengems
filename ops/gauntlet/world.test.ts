// The loader's checks. They read the private backup clone, so they run where it is (BACKUPS_DIR), not in CI:
//   BACKUPS_DIR=<backups clone> packages/ingest/node_modules/.bin/tsx --test ops/gauntlet/world.test.ts
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { SNAPSHOT_ZONE } from '../../packages/core/src/index';
import type { Pick, WeekRef } from './contract';
import { BACKUPS_DIR, WEEKS, auditWeek, openWeek, recordPicks, reveal, weekLabel } from './world';

const ledger = mkdtempSync(join(tmpdir(), 'gauntlet-ledger-'));
process.env.GAUNTLET_LEDGER_DIR = ledger;
after(() => rmSync(ledger, { recursive: true, force: true }));

const owned = existsSync(`${BACKUPS_DIR}/capsules/2025/wk01/catalog.json`);
const skip = owned ? false : `no backup clone at ${BACKUPS_DIR}`;
const KEYS = ['rush_yds', 'reception_yds', 'pass_yds', 'rush_reception_yds'].flatMap((s) => [`player_${s}`, `player_${s}_alternate`]);
const pad = (n: number) => String(n).padStart(2, '0');

interface Catalog { games: { gameId: string; snaps: { sat: { dk: Record<string, { lines: number }> } | null } }[] }
const catalog = (r: WeekRef): Catalog => JSON.parse(readFileSync(`${BACKUPS_DIR}/capsules/${r.season}/wk${pad(r.week)}/catalog.json`, 'utf8'));
const catalogLines = (c: Catalog) => c.games.reduce((n, g) => n + KEYS.reduce((m, k) => m + (g.snaps.sat?.dk[k]?.lines ?? 0), 0), 0);
const mt = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: SNAPSHOT_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })
  .formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
const mtDate = (d: Date) => { const p = mt(d); return Date.UTC(+p.year!, +p.month! - 1, +p.day!); };

test('the gauntlet walks 2025 Weeks 1 to 18 and 2026 Weeks 1 to 8, nothing else', { skip }, () => {
  assert.equal(WEEKS.length, 26);
  assert.throws(() => openWeek({ season: 2026, week: 9 }), /No gauntlet week/);
  assert.throws(() => openWeek({ season: 2025, week: 19 }), /No gauntlet week/);
});

for (const ref of WEEKS) {
  test(`${weekLabel(ref)} opens behind its wall and matches its catalog`, { skip }, () => {
    const { world, audit } = auditWeek(ref);
    const cat = catalog(ref);

    // Line counts and games match the catalog.
    assert.equal(world.lines.length, catalogLines(cat), 'DraftKings lines on the board');
    assert.deepEqual(world.games.map((g) => g.gameId).sort(), cat.games.map((g) => g.gameId).sort());
    assert.equal(new Set(world.lines.map((l) => l.key)).size, world.lines.length, 'line keys are unique');

    // Boards follow the rule: Saturday 7:47 PM Mountain for Sunday and Monday, else the night before game day.
    for (const g of world.games) {
      const b = mt(g.boardAt), k = mt(g.kickoff);
      assert.equal(`${b.hour}:${b.minute}`, '19:47', `${g.gameId} board time`);
      if (k.weekday === 'Sun' || k.weekday === 'Mon') assert.equal(b.weekday, 'Sat', `${g.gameId} board day`);
      else assert.equal(mtDate(g.kickoff) - mtDate(g.boardAt), 86_400_000, `${g.gameId} board is the night before`);
    }

    // No quote dated after its game's board, no football data dated after the week's first board.
    for (const g of world.games) {
      const s = audit.boards.get(g.gameId)!;
      assert.ok(s.capturedAt <= g.boardAt, `${g.gameId} board quotes stamped ${s.capturedAt.toISOString()}`);
      const e = audit.early.get(g.gameId);
      if (e) assert.ok(e < g.boardAt, `${g.gameId} early quotes stamped ${e.toISOString()}`);
      const sc = audit.scripts.get(g.gameId);
      assert.ok(sc && sc <= g.boardAt, `${g.gameId} spread and total`);
    }
    assert.equal(audit.firstBoard.getTime(), Math.min(...world.games.map((g) => +g.boardAt)));
    for (const at of [...audit.logKickoffs, ...audit.injuryStamps, ...audit.depthStamps]) assert.ok(at < audit.firstBoard, `football data stamped ${at.toISOString()}`);
    const thisWeek = new Set(world.games.map((g) => g.gameId));
    assert.ok(!world.logs.some((l) => thisWeek.has(l.gameId)), 'no box score from this week');
    assert.ok(world.logs.some((l) => l.season === 2024), '2024 logs are in');

    // Every line is a priced DraftKings over with a fair chance and a known player.
    for (const l of world.lines) {
      assert.ok(l.price > 1 && l.fair > 0 && l.fair < 1, `${l.key} price ${l.price} fair ${l.fair}`);
      assert.ok(!l.playerId.startsWith('name:') && l.team && l.opponent, `${l.key} player ${l.player}`);
    }
    for (const q of world.board) assert.ok(thisWeek.has(q.gameId));
    assert.equal(world.early === null, !(ref.week <= 8), 'early snapshots bought for Weeks 1 to 8');
  });
}

test('fair removes DraftKings\' own hold, two-sided or borrowed from the main line', { skip }, () => {
  const w = openWeek({ season: 2026, week: 4 });
  const dk = w.board.filter((q) => q.book === 'draftkings');
  for (const l of w.lines.filter((x) => !x.alt).slice(0, 200)) {
    const u = dk.find((q) => q.side === 'under' && !q.alt && q.gameId === l.gameId && q.playerId === l.playerId && q.betType === l.betType && q.line === l.line)!;
    assert.ok(Math.abs(l.fair - (1 / l.price) / (1 / l.price + 1 / u.price)) < 1e-12);
  }
  for (const l of w.lines.filter((x) => x.alt).slice(0, 200)) {
    const main = w.lines.find((x) => !x.alt && x.gameId === l.gameId && x.playerId === l.playerId && x.betType === l.betType);
    if (!main) continue;
    const u = dk.find((q) => q.side === 'under' && !q.alt && q.gameId === main.gameId && q.playerId === main.playerId && q.betType === main.betType && q.line === main.line)!;
    const hold = 1 / main.price + 1 / u.price - 1;
    assert.ok(Math.abs(l.fair - (1 / l.price) / (1 + hold)) < 1e-12);
  }
});

test('reveal refuses without the week\'s picks on file, then answers every board line', { skip }, () => {
  const ref: WeekRef = { season: 2025, week: 10 };
  const w = openWeek(ref);
  const line = w.lines.find((l) => !l.alt && l.price >= 1.5)!;
  const picks: Pick[] = [{ key: line.key, line, chance: 0.6, edge: 0.6 - 1 / line.price, contributions: {} as Pick['contributions'] }];
  assert.throws(() => reveal(ref, picks), /Refused/);
  assert.throws(() => reveal(ref, []), /Refused/);
  recordPicks(ref, picks);
  assert.throws(() => reveal(ref, []), /does not hold these picks/);
  assert.throws(() => recordPicks(ref, []), /recorded once/);
  const r = reveal(ref, picks);
  assert.equal(r.outcomes.size, w.lines.length);
  const graded = [...r.outcomes.values()].filter((o) => o !== null);
  assert.ok(graded.length > 0.85 * w.lines.length, `graded ${graded.length} of ${w.lines.length}`);
  for (const l of w.lines.slice(0, 500)) {
    const o = r.outcomes.get(l.key);
    if (o) assert.equal(o.hit, l.alt ? o.value >= l.line : o.value > l.line);
  }
  assert.ok(r.close.size > 0.5 * w.lines.length, `close prices ${r.close.size}`);
  for (const [k, p] of r.close) assert.ok(w.lines.some((l) => l.key === k) && p > 1);
  // A different week stays closed.
  assert.throws(() => reveal({ season: 2025, week: 11 }, picks), /Refused/);
});

test('owned nflverse files load for 2024 to 2026', { skip }, () => {
  for (const s of [2024, 2025, 2026]) {
    const m = JSON.parse(readFileSync(`${BACKUPS_DIR}/nflverse/${s}/manifest.json`, 'utf8')) as { files: { stored?: string; missing?: string }[] };
    for (const f of m.files) {
      assert.ok(f.stored && !f.missing, `${s} ${JSON.stringify(f)}`);
      assert.ok(gunzipSync(readFileSync(`${BACKUPS_DIR}/nflverse/${s}/${f.stored}`)).length > 0);
    }
  }
});
