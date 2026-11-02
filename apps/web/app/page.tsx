import { type GemKind, compareRecommended, marketById } from '@hiddengems/core';
import { games, picks, players } from '@hiddengems/db';
import { dataMode } from '@hiddengems/ingest';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { Edge, GemMark, Player } from '@/components/marks';
import { Tips } from '@/components/tips';
import { db } from '@/lib/db';
import { kickoff, odds, pct } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TEAM = (id: string) => id.toUpperCase();

export default async function GemsPage() {
  const { db: d } = await db();
  const now = new Date();
  const rows = (await d.select({ pick: picks, game: games, player: players })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .leftJoin(players, eq(players.id, picks.playerId))
    .where(and(gt(games.kickoffAt, now), inArray(picks.kind, ['gem', 'fools-gold']))))
    .sort((a, b) => compareRecommended({ ...a.pick, kind: a.pick.kind as GemKind }, { ...b.pick, kind: b.pick.kind as GemKind }));
  const gems = rows.filter((r) => r.pick.kind === 'gem').length;

  return (
    <>
      <h1 className="fc-visually-hidden">Gems</h1>
      {dataMode() === 'sample' && (
        <div className="fc-note" data-size="small"><span>Sample data. Add ODDS_API_KEY to pull live odds.</span></div>
      )}
      <section className="hg-section" aria-labelledby="all-h">
        <h2 id="all-h" className="text-heading-20">All gems</h2>
        {rows.length === 0 ? (
          <div className="fc-empty">
            <strong>No gems yet</strong>
            <span className="text-copy-14">The board fills in after the next odds snapshot.</span>
          </div>
        ) : (
          <>
            {gems === 0 && (
              <div className="fc-note" data-size="small"><span>Nothing clears the posted price right now. The Fool&apos;s Gold below looks good but the book&apos;s cut eats it.</span></div>
            )}
            <div className="fc-table-wrap">
              <table className="fc-table" data-interactive data-sticky>
                <caption className="fc-visually-hidden">Recommended: likeliest real gems first, Fool&apos;s Gold last</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="fc-has-tip" tabIndex={0} data-tip="Edge over the fair price times clarity, 0 to 100. Only props that clear the posted price get one">Rating</span></th>
                    <th scope="col" data-grow>Pick<span className="fc-th-count">{rows.length}</span></th>
                    <th scope="col">Kickoff</th>
                    <th scope="col" data-align="numeric">Price</th>
                    <th scope="col" data-align="numeric"><span className="fc-has-tip" tabIndex={0} data-tip="The chance the DraftKings price implies, cut included">Priced</span></th>
                    <th scope="col" data-align="numeric"><span className="fc-has-tip" tabIndex={0} data-tip="Our hit chance for this prop">Our est.</span></th>
                    <th scope="col" data-align="numeric"><span className="fc-has-tip" tabIndex={0} data-tip="Our estimate minus the priced chance. Above zero clears the cut">Edge</span></th>
                    <th scope="col" data-align="numeric"><span className="fc-has-tip" tabIndex={0} data-tip="Confidence in the read, 0 to 100">Clarity</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ pick, game, player }, i) => (
                    <tr key={pick.selectionKey}>
                      <td><GemMark kind={pick.kind} rating={pick.rating} delay={(rows.length - 1 - i) * 160} /></td>
                      <th scope="row">
                        <Player
                          name={player?.name ?? pick.playerName ?? 'Unknown player'}
                          teamId={player?.teamId ?? null}
                          number={player?.jerseyNumber ?? null}
                          detail={[player?.position, `${TEAM(game.awayTeamId)} @ ${TEAM(game.homeTeamId)}`, marketById(pick.marketId)?.label].filter(Boolean).join(' · ')}
                        />
                      </th>
                      <td><time dateTime={game.kickoffAt.toISOString()}>{kickoff(game.kickoffAt)}</time></td>
                      <td data-align="numeric">{odds(pick.price)}</td>
                      <td data-align="numeric">{pct(pick.priced)}</td>
                      <td data-align="numeric">{pct(pick.hitChance)}</td>
                      <td data-align="numeric"><Edge pts={Math.round(pick.gapToPosted)} /></td>
                      <td data-align="numeric">{pick.clarity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <Tips />
    </>
  );
}
