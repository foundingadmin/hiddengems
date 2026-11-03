// The v3.0 port against hgs.py on Week 8. The fixture holds nflverse usage for every skill player
// through Week 8 Sunday (the view the Week 8 board, CHI @ SEA, was frozen on) and what hgs.py computed
// from it. Regenerate with the export script described in the fixture's source field.
import { describe, expect, it } from 'vitest';
import {
  type GameLine, type UsageGame, appraise, booksAgree, clarityScore, impliedFactor, leagueRates, playerForms, readProp, statsChance, statsWeight,
} from '../src';
import week8 from './fixtures/week8.json';

type Fixture = {
  logs: [string, string, number, string, string, number | null, number, number, number, number, number][];
  lines: [string, number, string, string, number | null, number | null][];
  league: { carryTd: number; targetTd: number };
  players: Record<string, { lambda_: number; statsChance: number; team: string; implied: number; games: number; tdGames: number; snapRecent: number; snapSeason: number; longRate: number }>;
  board: {
    player: string; gsis: string | null; price: number; books: number[]; injury: string | null;
    expected: { hasStats: boolean; hitChance: number; team?: string; implied?: number; statsChance?: number; hitRate?: number; statsWeight?: number; parts?: number[]; clarity?: number; ourPct?: number };
  }[];
};
const fx = week8 as unknown as Fixture;

const logs: UsageGame[] = fx.logs.map(([playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns]) => ({
  playerId, gameId, week, team, position, snapPct, rzCarries, rzTargets, rzCarryTds, rzTargetTds, touchdowns,
}));
const lines: GameLine[] = fx.lines.map(([gameId, week, homeTeam, awayTeam, spreadLine, totalLine]) => ({ gameId, week, homeTeam, awayTeam, spreadLine, totalLine }));
const rates = leagueRates(logs);
const forms = playerForms(logs, rates);
const close = 1e-9;

describe('v3.0 model on Week 8 (hgs.py reference)', () => {
  it('reads the league rates per inside 10 carry and target', () => {
    expect(rates.carryTd).toBeCloseTo(fx.league.carryTd, 12);
    expect(rates.targetTd).toBeCloseTo(fx.league.targetTd, 12);
  });

  it("matches every player's form and stats chance", () => {
    const ids = Object.keys(fx.players);
    expect(forms.size).toBe(ids.length);
    for (const id of ids) {
      const want = fx.players[id]!;
      const form = forms.get(id)!;
      expect(form, id).toBeDefined();
      expect(form.team, id).toBe(want.team);
      expect(form.games, id).toBe(want.games);
      expect(form.tdGames, id).toBe(want.tdGames);
      expect(Math.abs(form.snapRecent - want.snapRecent), id).toBeLessThan(close);
      expect(Math.abs(form.snapSeason - want.snapSeason), id).toBeLessThan(close);
      expect(Math.abs(form.longRate - want.longRate), id).toBeLessThan(close);
      expect(Math.abs(form.lambda - want.lambda_), id).toBeLessThan(close);
      expect(Math.abs(statsChance(form, want.implied).chance - want.statsChance), id).toBeLessThan(close);
    }
  });

  it('scales by implied team points for the Monday night game', () => {
    const game = lines.find((l) => l.gameId === '2026_08_CHI_SEA')!;
    for (const team of ['CHI', 'SEA']) {
      const want = fx.board.find((b) => b.expected.team === team)!.expected.implied!;
      expect(impliedFactor(game, team, lines)!.factor).toBeCloseTo(want, 12);
    }
    expect(impliedFactor({ ...game, spreadLine: null }, 'SEA', lines)).toBeNull();
  });

  it('reproduces every Week 8 board read: hit chance, stats weight and clarity parts', () => {
    expect(fx.board).toHaveLength(12);
    const game = lines.find((l) => l.gameId === '2026_08_CHI_SEA')!;
    for (const b of fx.board) {
      const form = b.gsis ? forms.get(b.gsis) ?? null : null;
      const factor = form ? impliedFactor(game, form.team, lines)?.factor : undefined;
      const read = readProp({ form, impliedFactor: factor, price: b.price, bookPrices: b.books, injuryStatus: b.injury });
      const e = b.expected;
      expect(read.hasStats, b.player).toBe(e.hasStats);
      expect(Math.abs(read.hitChance - e.hitChance), b.player).toBeLessThan(close);
      if (!e.hasStats) continue;
      expect(Math.abs(read.statsChance! - e.statsChance!), b.player).toBeLessThan(close);
      expect(Math.abs(read.statsWeight - e.statsWeight!), b.player).toBeLessThan(close);
      const parts = [read.parts.sample, read.parts.consistency, read.parts.booksAgree, read.parts.setup];
      parts.forEach((p, i) => expect(Math.abs(p - e.parts![i]!), `${b.player} part ${i}`).toBeLessThan(close));
      expect(clarityScore(read.parts), b.player).toBe(e.clarity);
      expect(Math.round(read.hitChance * 100), b.player).toBe(e.ourPct);
    }
  });

  it("rates the board: no Week 8 prop cleared DraftKings' price", () => {
    const game = lines.find((l) => l.gameId === '2026_08_CHI_SEA')!;
    const kinds = fx.board.map((b) => {
      const form = b.gsis ? forms.get(b.gsis) ?? null : null;
      const read = readProp({ form, impliedFactor: form ? impliedFactor(game, form.team, lines)?.factor : undefined, price: b.price, bookPrices: b.books, injuryStatus: b.injury });
      return appraise({ hitChance: read.hitChance, price: b.price, clarity: clarityScore(read.parts), hasStats: read.hasStats }).kind;
    });
    expect(kinds.filter((k) => k === 'gem')).toHaveLength(0);
    expect(kinds.filter((k) => k === 'unrated')).toHaveLength(2);
  });
});

describe('v3.0 model rules', () => {
  const form = forms.get(fx.board.find((b) => b.player === 'Rome Odunze')!.gsis!)!;

  it('gives long shots less stats weight, and thin samples less still', () => {
    expect(statsWeight(7, 2)).toBe(0.5);
    expect(statsWeight(7, 12)).toBeCloseTo(0.25);
    expect(statsWeight(3, 2)).toBeCloseTo(0.3);
  });

  it('lets the market stand without 2026 stats', () => {
    const read = readProp({ form: null, price: 4, bookPrices: [4, 4.2], injuryStatus: null });
    expect(read).toMatchObject({ hasStats: false, statsChance: null, statsWeight: 0 });
    expect(read.hitChance).toBeCloseTo(0.25 * 0.91);
    expect(read.parts).toMatchObject({ sample: 0, consistency: 0, setup: 15 });
  });

  it('takes setup points for the injury report and a falling snap share', () => {
    const base = { form, price: 3.55, bookPrices: [3.5, 3.55] };
    expect(readProp({ ...base, injuryStatus: null }).parts.setup).toBe(15);
    expect(readProp({ ...base, injuryStatus: 'Questionable' }).parts.setup).toBe(8);
    expect(readProp({ ...base, injuryStatus: 'Out' }).parts.setup).toBe(0);
    const falling = { ...form, snapRecent: 0.5, snapSeason: 0.8 };
    expect(readProp({ ...base, form: falling, injuryStatus: null }).parts.setup).toBe(10);
  });

  it('scores books agreeing: 15 when equal, 7 with one book, 0 at a 25% spread', () => {
    expect(booksAgree([3, 3])).toBe(15);
    expect(booksAgree([3])).toBe(7);
    expect(booksAgree([2, 3])).toBe(0);
  });

  it('raises the chance with more implied points', () => {
    expect(statsChance(form, 1.2).chance).toBeGreaterThan(statsChance(form, 1).chance);
  });
});
