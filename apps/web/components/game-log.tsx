// The Last 10 game log (packages/facet/components/game-log.md) from core gameLog(): filled for a TD (or, on a stat
// ladder, a game that reached the line), hollow for none, dashed for a bye, with the season record leading beside
// it. The loupe draws its own rates beside the cells. `hit` names a filled cell ("5+ receptions"); TD by default.
import type { GameLog as Log, LogCell } from '@hiddengems/core';

export function GameLog({ log, hit }: { log: Log; hit?: string }) {
  return (
    <div className="fc-game-log">
      <p className="fc-game-log-rate">
        <span className="fc-game-log-value">{log.season.hits} of {log.season.games}</span>
        <span className="fc-game-log-label">This season</span>
      </p>
      <GameLogCells cells={log.cells} hit={hit} />
    </div>
  );
}

/** One cell per game, oldest first. `matching` names the games when a filter chose them. */
export function GameLogCells({ cells, matching = false, cloudy = false, hit }: { cells: LogCell[]; matching?: boolean; cloudy?: boolean; hit?: string }) {
  const played = cells.filter((c) => c.kind !== 'bye').length;
  return (
    <ol className="fc-game-log-cells" data-cloudy={cloudy ? '' : undefined}
      aria-label={`Last ${played} ${matching ? 'matching ' : ''}${played === 1 ? 'game' : 'games'}, oldest first`}>
      {cells.map((c) => c.kind === 'bye' ? (
        <li key={`bye-${c.week}`} data-result="bye"><span aria-hidden="true">Bye</span><span className="fc-visually-hidden">Week {c.week}, bye</span></li>
      ) : (
        <li key={`${c.week}-${c.opponent}`} data-result={c.kind}>
          <span aria-hidden="true">{c.opponent.toUpperCase()}</span>
          <span className="fc-visually-hidden">
            Week {c.week}, {c.home ? 'vs' : 'at'} {c.opponent.toUpperCase()}, {hit ? (c.touchdowns > 0 ? hit : `not ${hit}`) : c.touchdowns === 0 ? 'no TD' : c.touchdowns === 1 ? 'TD' : `${c.touchdowns} TDs`}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function GameLogKey({ hit }: { hit?: string }) {
  return (
    <ul className="fc-game-log-key" aria-label="Key">
      <li data-result="hit">{hit ?? 'TD'}</li>
      <li data-result="miss">{hit ? 'Short' : 'No TD'}</li>
      <li data-result="bye">Bye</li>
    </ul>
  );
}
