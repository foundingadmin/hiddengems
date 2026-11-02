// Game identity. Our game id is provider-neutral, so every provider maps onto the same row:
// the kickoff date in US Eastern time, then away and home team ids ("2026-11-08-buf-kc").

const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

export function gameId(kickoff: Date, awayTeamId: string, homeTeamId: string): string {
  return `${eastern.format(kickoff)}-${awayTeamId}-${homeTeamId}`;
}

/** A selection is one priced outcome: a market, a side, a line and (for player props) a player, in one game. */
export function selectionKey(s: { gameId: string; marketId: string; playerId: string | null; side: string; line: number | null }): string {
  return [s.gameId, s.marketId, s.playerId ?? '-', s.side, s.line ?? '-'].join(':');
}

/** Normalizes a person's name for matching across providers ("D'Andre Swift Jr." and "Dandre Swift" match). */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '')
    .replace(/[^a-z]/g, '');
}

/** The NFL season a date belongs to: September through February counts as the year it started. */
export const seasonOf = (date: Date): number => (date.getUTCMonth() >= 2 ? date.getUTCFullYear() : date.getUTCFullYear() - 1);
