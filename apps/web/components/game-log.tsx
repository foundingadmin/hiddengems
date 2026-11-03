// The Last 10 game log (packages/facet/components/game-log.md) from core gameLog(): filled for a TD, hollow for
// none, dashed for a bye, with the season record leading beside it.
import type { GameLog as Log } from '@hiddengems/core';

export function GameLog({ log }: { log: Log }) {
  const played = log.cells.filter((c) => c.kind !== 'bye').length;
  return (
    <div className="fc-game-log">
      <p className="fc-game-log-rate">
        <span className="fc-game-log-value">{log.season.hits} of {log.season.games}</span>
        <span className="fc-game-log-label">This season</span>
      </p>
      <ol className="fc-game-log-cells" aria-label={`Last ${played} ${played === 1 ? 'game' : 'games'}, oldest first`}>
        {log.cells.map((c) => c.kind === 'bye' ? (
          <li key={`bye-${c.week}`} data-result="bye"><span aria-hidden="true">Bye</span><span className="fc-visually-hidden">Week {c.week}, bye</span></li>
        ) : (
          <li key={`${c.week}-${c.opponent}`} data-result={c.kind}>
            <span aria-hidden="true">{c.opponent.toUpperCase()}</span>
            <span className="fc-visually-hidden">
              Week {c.week}, {c.home ? 'vs' : 'at'} {c.opponent.toUpperCase()}, {c.touchdowns === 0 ? 'no TD' : c.touchdowns === 1 ? 'TD' : `${c.touchdowns} TDs`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GameLogKey() {
  return (
    <ul className="fc-game-log-key" aria-label="Key">
      <li data-result="hit">TD</li>
      <li data-result="miss">No TD</li>
      <li data-result="bye">Bye</li>
    </ul>
  );
}
