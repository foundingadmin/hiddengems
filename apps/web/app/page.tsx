import { BOOKS, type Signals, impliedFromDecimal, marketById } from '@hiddengems/core';
import { games, picks, players, runs } from '@hiddengems/db';
import { dataMode } from '@hiddengems/ingest';
import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import { Edge, Gem, Player, SignalStrip, Verdict } from '@/components/marks';
import { db } from '@/lib/db';
import { ago, clock, kickoff, odds, pct } from '@/lib/format';
import { pullNow } from './data/actions';

export const dynamic = 'force-dynamic';

const BOOK_NAMES: Record<string, string> = Object.fromEntries(BOOKS.map((b) => [b.id, b.name]));

function detail(position: string | null, marketId: string, side: string, line: number | null) {
  const market = marketById(marketId)?.label ?? marketId;
  const sideText = side === 'yes' ? '' : `, ${side} ${line ?? ''}`.trimEnd();
  return [position, `${market}${sideText}`].filter(Boolean).join(' · ');
}

export default async function SlatePage() {
  const { db: d } = await db();
  const now = new Date();
  const rows = await d.select({ pick: picks, game: games, player: players })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .leftJoin(players, eq(players.id, picks.playerId))
    .where(gt(games.kickoffAt, now))
    .orderBy(desc(picks.gapPts), asc(picks.selectionKey))
    .limit(200);
  const [lastPull] = await d.select().from(runs)
    .where(and(eq(runs.job, 'pull-odds'), inArray(runs.status, ['succeeded', 'warned'])))
    .orderBy(desc(runs.startedAt)).limit(1);
  const fresh = lastPull?.finishedAt && now.getTime() - lastPull.finishedAt.getTime() < 15 * 60_000;

  return (
    <>
      <div className="fc-page-header" data-variant="controls">
        <div className="fc-page-header-scope">
          <h1 className="fc-visually-hidden">Slate</h1>
          {lastPull?.finishedAt && (
            <p className="fc-status">
              <span className="fc-status-dot" data-state={fresh ? 'live' : 'stale'} aria-hidden="true" />
              <span>Odds updated <time dateTime={lastPull.finishedAt.toISOString()} title={clock(lastPull.finishedAt)} data-relative>{ago(lastPull.finishedAt, now)}</time></span>
            </p>
          )}
        </div>
        <div className="fc-page-header-actions">
          <form action={pullNow} className="hg-inline-form">
            <input type="hidden" name="job" value="pull-odds" />
            <button className="fc-button" data-variant="secondary" data-size="small" type="submit">Pull odds</button>
          </form>
        </div>
      </div>

      {dataMode() === 'sample' && (
        <div className="fc-note" data-size="small"><span>Sample data. Add ODDS_API_KEY and SPORTSDATAIO_KEY to pull live odds.</span></div>
      )}

      {rows.length === 0 ? (
        <div className="fc-empty">
          <strong>No picks yet</strong>
          <span className="text-copy-14">The slate fills in once the schedule, rosters and odds are pulled.</span>
          <form action={pullNow}>
            <input type="hidden" name="job" value="all" />
            <button className="fc-button" data-variant="secondary" data-size="small" type="submit">Pull everything</button>
          </form>
        </div>
      ) : (
        <div className="fc-table-wrap">
          <table className="fc-table" data-interactive data-sticky data-sticky-column>
            <caption className="fc-visually-hidden">Picks sorted by gap, largest first</caption>
            <thead>
              <tr>
                <th scope="col" data-grow>Pick<span className="fc-th-count">{rows.length}</span></th>
                <th scope="col">Kickoff</th>
                <th scope="col">Book</th>
                <th scope="col" data-align="numeric">Odds</th>
                <th scope="col" data-align="numeric">Priced</th>
                <th scope="col" data-align="numeric">Our est.</th>
                <th scope="col" data-align="numeric">Gap</th>
                <th scope="col">Signals</th>
                <th scope="col">Verdict</th>
                <th scope="col">Gem tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ pick, game, player }) => (
                <tr key={pick.selectionKey}>
                  <th scope="row">
                    <Player
                      name={player?.name ?? pick.playerName ?? 'Game market'}
                      teamId={player?.teamId ?? null}
                      number={player?.jerseyNumber ?? null}
                      detail={detail(player?.position ?? null, pick.marketId, pick.side, pick.line)}
                    />
                  </th>
                  <td><time dateTime={game.kickoffAt.toISOString()}>{kickoff(game.kickoffAt)}</time></td>
                  <td>{BOOK_NAMES[pick.bestBookId] ?? pick.bestBookId}</td>
                  <td data-align="numeric">{odds(pick.bestPrice)}</td>
                  <td data-align="numeric">{pct(impliedFromDecimal(pick.bestPrice))}</td>
                  <td data-align="numeric">{pct(pick.estimate)}</td>
                  <td data-align="numeric"><Edge pts={pick.gapPts} /></td>
                  <td><SignalStrip signals={pick.signals as Signals} /></td>
                  <td><Verdict verdict={pick.verdict as 'go' | 'wait' | 'stop' | 'none'} /></td>
                  <td><Gem tier={pick.tier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
