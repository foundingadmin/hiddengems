// Replays 2026 Weeks 1 to 8 as time capsules. Each MOD picks from that Saturday's 7:47 PM board knowing only what
// was knowable then, and every pick is graded against the real box score. Writes one ledger file per MOD, week and
// segment (experiments/ledger/{MOD}-WK{n}{SEG}-back.json), results.json and the README.
//
//   MOD0   the retired rules (gems.ts before PR 51): anytime TD only, a gem at any edge over the posted price
//   MOD1q  MOD1 without its read: DraftKings 2.50 or more and a 60% hit rate at that line over 3+ games before the week
//   MOD2   main today: core readProp, readStatProp, availabilityBlock, appraise and GEM_RULES, called as build-picks calls them
//
// Run: packages/ingest/node_modules/.bin/tsx ops/backtest/replay.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  CLARITY_V3, PURCHASE_BOOK, STAT_MARKETS, type StatKey, type UsageGame, appraise, availabilityBlock, clarityScore, closingLineValue,
  fairDecimal, impliedFactor, impliedFromDecimal, isStatMarket, nameKey, playerForms, practicePenalty, propHit, readProp, readStatProp,
  selectionKey, statNeeded,
} from '../../packages/core/src/index';
import type { OddsQuote } from '../../packages/ingest/src/providers/types';
import { type Season, type Stamp, capsule, injuryReportAt, loadOdds, loadSeason, nameMatcher, rosterAt } from './data';
import { appraiseMod0 } from './mod0-appraise';
import { LEDGER_DIR, PLAN_PATH, SUMMARY_PATH } from './paths';
import type { PlanWeek, Segment } from './plan';
import { writeReadme } from './report';

export const MODS = ['MOD0', 'MOD1q', 'MOD2'] as const;
/** MOD1 and MOD3 are MOD1q and MOD2 after the read (apply-reads.ts). */
export type Mod = (typeof MODS)[number] | 'MOD1' | 'MOD3';
const SEGMENTS: Segment[] = ['AM', 'PM', 'SNF'];

/** MOD1q: DraftKings price floor, hit rate bands for GEM1 to GEM5, and games needed before the week. */
export const MOD1Q = { minPrice: 2.5, bands: [0.6, 0.65, 0.7, 0.75, 0.8], minGames: 3 } as const;

export interface Pick {
  selection_key: string; game_id: string; player: string; market: string; line: number | null; side: string; book: string;
  lock_price: number; implied: number; mod_chance: number; edge: number; gem_level: number; rating: number | null; clarity: number | null;
  reads: string[]; close_price: number | null; clv: number | null; stat_value: number | null; hit: boolean | null;
}
export interface Result { book_expected_hits: number; hits: number; pass: boolean | null; flat_roi: number | null; clv_avg: number | null }
export interface Ledger {
  run: string; mod: Mod; week: number; segment: Segment; kind: 'back'; board_at: string; locked_at: string; picks: Pick[]; result: Result;
}

/** A rating's fifth: 1 to 20 is GEM1, 81 to 100 is GEM5. */
export const ratingLevel = (rating: number) => Math.min(5, Math.max(1, Math.ceil(rating / 20)));
export const bandLevel = (rate: number) => MOD1Q.bands.filter((b) => rate >= b).length;
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Graded picks only: a player who did not play is void, as the book voids it. Pass means at least the book's expected hits. */
export function resultOf(picks: Pick[]): Result {
  const graded = picks.filter((p) => p.hit !== null);
  const expected = graded.reduce((s, p) => s + p.implied, 0);
  const hits = graded.filter((p) => p.hit).length;
  const clvs = picks.map((p) => p.clv).filter((c): c is number => c !== null);
  return {
    book_expected_hits: round(expected, 3), hits,
    pass: graded.length ? hits >= expected : null,
    flat_roi: graded.length ? round(graded.reduce((s, p) => s + (p.hit ? p.lock_price - 1 : -1), 0) / graded.length) : null,
    clv_avg: clvs.length ? round(clvs.reduce((a, b) => a + b, 0) / clvs.length) : null,
  };
}

interface WeekInputs {
  forms: ReturnType<typeof playerForms>;
  lastTeam: Map<string, string>;
  statValues: (playerId: string, stat: StatKey | 'touchdowns') => number[];
  played: Set<string>;
}

/** Everything a MOD may know at the board: usage and box scores from games that kicked off before it. */
function inputsAt(season: Season, week: number, boardAt: Date, stamps: Stamp[]): WeekInputs {
  const kick = new Map(season.games.map((g) => [g.gameId, g.kickoff]));
  const logs: UsageGame[] = season.usage.filter((u) => u.week < week);
  for (const u of logs) stamps.push({ source: `usage ${u.gameId} ${u.playerId}`, at: kick.get(u.gameId)! });
  const forms = playerForms(logs);
  const lastTeam = new Map<string, { week: number; team: string }>();
  for (const g of logs) if ((lastTeam.get(g.playerId)?.week ?? -1) < g.week) lastTeam.set(g.playerId, { week: g.week, team: g.team });
  const weekOf = new Map(season.games.map((g) => [g.gameId, g.week]));
  const playedBy = new Map<string, { gameId: string; week: number }[]>();
  for (const g of logs) playedBy.set(g.playerId, [...(playedBy.get(g.playerId) ?? []), { gameId: g.gameId, week: g.week }]);
  for (const k of season.box.keys()) {
    const [gid, pid] = [k.slice(0, k.lastIndexOf(':')), k.slice(k.lastIndexOf(':') + 1)];
    const wk = weekOf.get(gid);
    if (wk === undefined || wk >= week) continue;
    stamps.push({ source: `box ${gid} ${pid}`, at: kick.get(gid)! });
    const list = playedBy.get(pid) ?? [];
    if (!list.some((g) => g.gameId === gid)) playedBy.set(pid, [...list, { gameId: gid, week: wk }]);
  }
  const statValues = (pid: string, stat: StatKey | 'touchdowns') =>
    [...(playedBy.get(pid) ?? [])].sort((a, b) => a.week - b.week).map((g) => Number(season.box.get(`${g.gameId}:${pid}`)?.[stat] ?? 0));
  const played = new Set(season.usage.filter((u) => u.week === week).map((u) => `${u.gameId}:${u.playerId}`));
  for (const k of season.box.keys()) if (weekOf.get(k.slice(0, k.lastIndexOf(':'))) === week) played.add(k);
  return { forms, lastTeam: new Map([...lastTeam].map(([k, x]) => [k, x.team])), statValues, played };
}

export function replayWeek(season: Season, w: PlanWeek): { ledgers: Ledger[]; unmatched: number; selections: number; inputs: number } {
  const boardAt = new Date(w.boardAt);
  const stamps: Stamp[] = [];
  const inp = inputsAt(season, w.week, boardAt, stamps);
  const roster = season.rosters.get(w.week) ?? new Map();
  const injuries = season.injuries.get(w.week) ?? new Map();
  stamps.push({ source: `week ${w.week} roster`, at: rosterAt(w.sunday) }, { source: `week ${w.week} injury report`, at: injuryReportAt(w.sunday) });
  const board = loadOdds(w.week, 'board');
  const close = loadOdds(w.week, 'close');
  if (w.buy && !board.size) throw new Error(`Week ${w.week} has no cached board. Run node ops/backtest/fetch-odds.mjs first.`);
  // The board itself may be stamped at the board; every price on it must be no later.
  for (const s of board.values()) {
    if (!w.games.some((g) => g.gameId === s.gameId)) continue;
    const late = [s.timestamp, ...s.quotes.map((q) => q.observedAt)].find((t) => t.getTime() > boardAt.getTime());
    if (late) throw new Error(`Time capsule broken: week ${w.week} board ${s.gameId} carries a price stamped ${late.toISOString()}, after the board at ${w.boardAt}`);
  }
  for (const s of close.values()) {
    const g = w.games.find((x) => x.gameId === s.gameId);
    if (g && !(s.timestamp > boardAt && s.timestamp <= new Date(g.closeAt))) throw new Error(`Close for ${s.gameId} is stamped ${s.timestamp.toISOString()}, outside the board to ${g.closeAt}`);
  }
  const inputs = capsule(boardAt, stamps) + [...board.values()].reduce((n, b) => n + b.quotes.length + 1, 0);

  const picks: Record<(typeof MODS)[number], (Pick & { segment: Segment })[]> = { MOD0: [], MOD1q: [], MOD2: [] };
  let unmatched = 0, selections = 0;
  for (const g of w.games) {
    const snap = board.get(g.gameId);
    if (!snap) { if (w.buy) console.warn(`Week ${w.week}: no board for ${g.gameId}`); continue; }
    const match = nameMatcher(roster, [g.away, g.home]);
    const groups = new Map<string, OddsQuote[]>();
    for (const q of snap.quotes) {
      const k = [q.marketId, nameKey(q.playerName ?? ''), q.side, q.line ?? '-'].join('|');
      groups.set(k, [...(groups.get(k) ?? []), q]);
    }
    const closeBy = new Map<string, number>();
    for (const q of close.get(g.gameId)?.quotes ?? []) if (q.bookId === PURCHASE_BOOK) closeBy.set([q.marketId, nameKey(q.playerName ?? ''), q.side, q.line ?? '-'].join('|'), q.priceDecimal);

    for (const [k, quotes] of groups) {
      const posted = quotes.find((q) => q.bookId === PURCHASE_BOOK);
      if (!posted) continue;
      selections++;
      const pid = match(posted.playerName);
      if (!pid) { unmatched++; continue; }
      const price = posted.priceDecimal;
      const bookPrices = quotes.map((q) => q.priceDecimal);
      const market = posted.marketId;
      const stat = isStatMarket(market) && posted.line != null ? market : null;
      const statKey = stat ? STAT_MARKETS[stat].stat : 'touchdowns';
      const box = season.box.get(`${g.gameId}:${pid}`) ?? { touchdowns: 0, receptions: 0, receivingYards: 0, rushingYards: 0 };
      const played = inp.played.has(`${g.gameId}:${pid}`);
      const hit = played ? propHit({ marketId: market, side: posted.side, line: posted.line }, box) : null;
      const closePrice = closeBy.get(k) ?? null;
      const base = {
        selection_key: selectionKey({ gameId: g.gameId, marketId: market, playerId: pid, side: posted.side, line: posted.line }),
        game_id: g.gameId, player: posted.playerName ?? pid, market, line: posted.line, side: posted.side, book: PURCHASE_BOOK,
        lock_price: price, implied: round(impliedFromDecimal(price)), reads: [] as string[], close_price: closePrice,
        clv: closePrice ? round(closingLineValue(price, fairDecimal(closePrice))) : null,
        stat_value: played ? Number(box[statKey] ?? 0) : null, hit, segment: g.segment,
      };
      const form = inp.forms.get(pid) ?? null;
      const injury = injuries.get(pid) ?? null;
      const implied = form ? impliedFactor(season.lines.find((l) => l.gameId === g.gameId)!, form.team, season.lines) : null;

      // MOD2: build-picks today.
      const block = availabilityBlock({ status: injury?.status ?? null, practice: injury?.practice ?? null, injury: injury?.injury ?? null,
        team: roster.get(pid)?.team ?? null, lastGameTeam: inp.lastTeam.get(pid) ?? null });
      const read = stat
        ? readStatProp({ market: stat, line: posted.line!, values: inp.statValues(pid, statKey as StatKey), price, bookPrices, injuryStatus: injury?.status ?? null,
            snapsFalling: Boolean(form && form.snapRecent < CLARITY_V3.fallingSnaps * form.snapSeason) })
        : readProp({ form, impliedFactor: implied?.factor, price, bookPrices, injuryStatus: injury?.status ?? null });
      const clarity2 = clarityScore({ ...read.parts, setup: Math.max(0, read.parts.setup - practicePenalty(injury?.practice ?? null)) });
      const gem2 = appraise({ hitChance: read.hitChance, price, clarity: clarity2, hasStats: read.hasStats, block });
      if (gem2.kind === 'gem') picks.MOD2.push({ ...base, mod_chance: round(read.hitChance), edge: round(gem2.gapToPosted / 100), gem_level: ratingLevel(gem2.rating!), rating: gem2.rating, clarity: clarity2 });

      // MOD0: the retired gate on the TD model, no blocks, no practice penalty.
      if (market === 'anytime_td') {
        const r0 = readProp({ form, impliedFactor: implied?.factor, price, bookPrices, injuryStatus: injury?.status ?? null });
        const c0 = clarityScore(r0.parts);
        const gem0 = appraiseMod0({ hitChance: r0.hitChance, price, clarity: c0, hasStats: r0.hasStats });
        if (gem0.kind === 'gem') picks.MOD0.push({ ...base, mod_chance: round(r0.hitChance), edge: round(gem0.gapToPosted / 100), gem_level: ratingLevel(gem0.rating!), rating: gem0.rating, clarity: c0 });
      }

      // MOD1q: the plain hit rate at this line, no read.
      if (price >= MOD1Q.minPrice) {
        const values = inp.statValues(pid, statKey);
        const need = stat ? statNeeded(posted.line!) : 1;
        if (values.length >= MOD1Q.minGames) {
          const rate = values.filter((x) => x >= need).length / values.length;
          if (rate >= MOD1Q.bands[0]) picks.MOD1q.push({ ...base, mod_chance: round(rate), edge: round(rate - impliedFromDecimal(price)), gem_level: bandLevel(rate), rating: null, clarity: null });
        }
      }
    }
  }

  const ledgers: Ledger[] = [];
  for (const mod of MODS) for (const seg of SEGMENTS) {
    const segPicks = picks[mod].filter((p) => p.segment === seg).map(({ segment: _s, ...p }) => p)
      .sort((a, b) => b.gem_level - a.gem_level || b.mod_chance - a.mod_chance);
    ledgers.push({ run: `${mod}-WK${w.week}${seg}-back`, mod, week: w.week, segment: seg, kind: 'back', board_at: w.boardAt, locked_at: w.boardAt, picks: segPicks, result: resultOf(segPicks) });
  }
  return { ledgers, unmatched, selections, inputs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const plan: PlanWeek[] = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
  const season = loadSeason();
  mkdirSync(LEDGER_DIR, { recursive: true });
  const all: Ledger[] = [];
  const audit: { week: number; inputs: number; selections: number; unmatched: number }[] = [];
  for (const w of plan) {
    const r = replayWeek(season, w);
    for (const l of r.ledgers) writeFileSync(`${LEDGER_DIR}/${l.run}.json`, `${JSON.stringify(l, null, 2)}\n`);
    all.push(...r.ledgers);
    audit.push({ week: w.week, inputs: r.inputs, selections: r.selections, unmatched: r.unmatched });
    console.log(`Week ${w.week}: ${r.inputs} inputs passed the guard, ${r.selections} DraftKings selections, ${r.unmatched} unmatched names, picks ${MODS.map((m) => `${m} ${r.ledgers.filter((l) => l.mod === m).reduce((s, l) => s + l.picks.length, 0)}`).join(', ')}`);
  }
  writeFileSync(SUMMARY_PATH, `${JSON.stringify({ audit, ledgers: all.map(({ picks: _p, ...l }) => l) }, null, 2)}\n`);
  writeReadme();
}
