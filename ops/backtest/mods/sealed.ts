// The one run on sealed Weeks 7 and 8: MOD4, MOD5 and MOD6 from their frozen cards, MOD2 (main today) as the control.
// Reached only through harness.ts --sealed, which checks every card is frozen and hashed as given before any week opens.
// Writes experiments/mods/sealed/results.json and one gems file per MOD. Run once; there is no retuning after it.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PURCHASE_BOOK } from '../../../packages/core/src/index';
import { loadSeason } from '../data';
import type { PlanWeek } from '../plan';
import { segmentOf } from '../plan';
import { replayWeek } from '../replay';
import { MODS_DIR, SEALED_WEEKS, cardPath, line, overlap, runMod, sha256, summarize } from './harness';
import type { Gem, ModId } from './models';
import { STATS, type Stat, type World, historyPlan } from './world';

const MOD2_STAT: Record<string, Stat> = { anytime_td: 'anytime_td', receptions: 'receptions', receiving_yds: 'reception_yds', rushing_yds: 'rush_yds' };

/** MOD2 exactly as replay.ts runs it, over every Weeks 7 and 8 game: the Saturday board (Sunday and Monday) and the Wednesday board (Thursday). */
function mod2(weeks: number[]): Gem[] {
  const season = loadSeason();
  const plan = historyPlan();
  const out: Gem[] = [];
  for (const b of plan.boards.filter((x: { week: number }) => weeks.includes(x.week))) {
    const games = plan.games.filter((g: { gameId: string }) => b.games.includes(g.gameId));
    const kick = new Date(games.find((g: { day: string }) => g.day !== 'mon')?.kickoff ?? games[0].kickoff);
    // replayWeek stamps the injury report two days and the roster four days before this date (4 PM Eastern).
    const anchor = new Date(kick.getTime() + (b.day === 'wed' ? 1 : 0) * 86_400_000);
    const sunday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(anchor);
    const w: PlanWeek = {
      week: b.week, boardAt: b.boardAt, sunday, buy: true,
      games: games.map((g: { gameId: string; nflverseId: string; week: number; kickoff: string; closeAt: string; away: string; home: string }) => ({
        gameId: g.gameId, nflverseId: g.nflverseId, week: g.week, segment: segmentOf(new Date(g.kickoff)), kickoff: g.kickoff, closeAt: g.closeAt, away: g.away, home: g.home,
      })),
    };
    for (const l of replayWeek(season, w).ledgers.filter((x) => x.mod === 'MOD2')) {
      for (const p of l.picks) out.push({
        mod: 'MOD2', week: b.week, gameId: p.game_id, playerId: p.selection_key.split(':')[2]!, player: p.player, stat: MOD2_STAT[p.market]!, line: p.line ?? 0.5,
        position: p.market === 'anytime_td' ? 'MAIN' : 'ALT', mainLine: null, price: p.lock_price, implied: p.implied, chance: p.mod_chance, edge: p.edge,
        why: `GEM${p.gem_level}`, closePrice: p.close_price, rawClv: p.close_price ? Math.round((p.lock_price / p.close_price - 1) * 1e4) / 1e4 : null,
        value: p.stat_value, hit: p.hit,
      });
    }
  }
  if (out.some((g) => g.mod !== 'MOD2') || PURCHASE_BOOK !== 'draftkings') throw new Error('MOD2 control mismatch');
  return out;
}

export function sealedRun(seal: Record<string, string>, world: (week: number) => World) {
  const out = `${MODS_DIR}/sealed`;
  if (existsSync(`${out}/results.json`)) throw new Error('The sealed run has already happened. There is one.');
  const worlds = SEALED_WEEKS.map((wk) => world(wk)); // the seal check runs here, before anything is read
  const gems: Record<string, Gem[]> = {};
  const cards: Record<string, { sha256: string; params: unknown }> = {};
  for (const m of ['MOD4', 'MOD5', 'MOD6'] as ModId[]) {
    const card = JSON.parse(readFileSync(cardPath(m), 'utf8'));
    cards[m] = { sha256: sha256(cardPath(m)), params: card.params };
    gems[m] = worlds.flatMap((w) => runMod(m, w, card.params));
  }
  gems.MOD2 = mod2(SEALED_WEEKS);
  const mods = Object.keys(gems);
  const result = {
    at: new Date().toISOString(), weeks: SEALED_WEEKS, seal, cards,
    summary: Object.fromEntries(mods.map((m) => [m, summarize(gems[m]!, SEALED_WEEKS.length)])),
    byWeek: Object.fromEntries(mods.map((m) => [m, Object.fromEntries(SEALED_WEEKS.map((wk) => [wk, summarize(gems[m]!.filter((g) => g.week === wk), 1)]))])),
    byMarket: Object.fromEntries(mods.map((m) => [m, Object.fromEntries(STATS.map((st) => [st, summarize(gems[m]!.filter((g) => g.stat === st), SEALED_WEEKS.length)]).filter(([, x]) => (x as { gems: number }).gems))])),
    overlap: Object.fromEntries(mods.flatMap((a) => mods.filter((b) => a < b).map((b) => [`${a} ${b}`, Math.round(overlap(gems[a]!, gems[b]!) * 100) / 100]))),
  };
  mkdirSync(out, { recursive: true });
  for (const m of mods) writeFileSync(`${out}/${m}-gems.json`, `${JSON.stringify(gems[m], null, 1)}\n`);
  writeFileSync(`${out}/results.json`, `${JSON.stringify(result, null, 2)}\n`);
  for (const m of mods) console.log(`${m}: ${line(result.summary[m]!)}`);
  console.log(`Overlap ${JSON.stringify(result.overlap)}`);
}
