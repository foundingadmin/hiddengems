import { describe, expect, it } from 'vitest';
import { type LogGame, gameLog } from '../src';

const game = (week: number, touchdowns: number | null, opponent = 'mia'): LogGame => ({ week, opponent, home: week % 2 === 0, touchdowns });

describe('game log', () => {
  it('fills a game with a TD, leaves one without hollow, and counts the season', () => {
    const log = gameLog([1, 2, 3], [game(1, 1), game(2, 0), game(3, 2)]);
    expect(log.cells.map((c) => c.kind)).toEqual(['hit', 'miss', 'hit']);
    expect(log.season).toEqual({ games: 3, hits: 2 });
  });

  it('marks a week with league games and none for his team as a bye', () => {
    const log = gameLog([1, 2, 3, 4], [game(1, 0), game(2, 1), game(4, 0)]);
    expect(log.cells.map((c) => `${c.week}:${c.kind}`)).toEqual(['1:miss', '2:hit', '3:bye', '4:miss']);
  });

  it('leaves out games he did not play, and keeps them from reading as a bye', () => {
    const log = gameLog([1, 2, 3], [game(1, 1), game(2, null), game(3, 0)]);
    expect(log.cells.map((c) => `${c.week}:${c.kind}`)).toEqual(['1:hit', '3:miss']);
    expect(log.season).toEqual({ games: 2, hits: 1 });
  });

  it('shows the last 10 games played, while the season counts every game', () => {
    const weeks = Array.from({ length: 13 }, (_, i) => i + 1);
    const games = weeks.filter((w) => w !== 9).map((w) => game(w, w <= 3 ? 1 : 0));
    const log = gameLog(weeks, games);
    const played = log.cells.filter((c) => c.kind !== 'bye');
    expect(played).toHaveLength(10);
    expect(played[0]!.week).toBe(3);
    expect(log.cells.find((c) => c.kind === 'bye')?.week).toBe(9);
    expect(log.season).toEqual({ games: 12, hits: 3 });
  });

  it('drops a bye from before the oldest game shown', () => {
    const log = gameLog([1, 2, 3, 4], [game(2, 1), game(3, 0), game(4, 0)], 2);
    expect(log.cells.map((c) => c.week)).toEqual([3, 4]);
  });

  it('is empty before his first game', () => {
    expect(gameLog([1, 2], [])).toEqual({ cells: [], season: { games: 0, hits: 0 } });
  });
});
