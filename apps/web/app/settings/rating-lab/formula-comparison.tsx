'use client';
// The Week 9 formula comparison carried over from the old standalone lab page (docs/prd.md section 8).
import { useSearchParams } from 'next/navigation';
import { type KeyboardEvent, useState } from 'react';
import { GemMark, Player } from '@/components/marks';
import { clears, FORMULAS, median, topTen, WEEK9 } from '@/lib/rating-lab/formulas';
import { writeParams } from './controls';
import { ScoreScatter } from './score-scatter';

const LONG_SHOT = 10;

export function FormulaComparison() {
  const params = useSearchParams();
  const [id, setId] = useState(() => (FORMULAS.some((f) => f.id === params.get('formula')) ? params.get('formula')! : 'rating'));
  const [hideLong, setHideLong] = useState(() => params.get('longshots') === 'hide');
  const f = FORMULAS.find((x) => x.id === id)!;
  const pool = hideLong ? WEEK9.filter((p) => p.price <= LONG_SHOT) : WEEK9;
  const top = topTen(f, pool);
  const n = top.length;
  const avg = (pick: (x: (typeof top)[number]) => number) => (n ? Math.round(top.reduce((a, x) => a + pick(x), 0) / n) : null);
  const hitAvg = avg((x) => x.prop.hitPct), clarityAvg = avg((x) => x.prop.clarity);
  const clearCount = top.filter((x) => clears(x.prop)).length;
  const scoreName = f.status === 'Live rating' ? 'Rating' : 'Score';

  const choose = (next: string) => { setId(next); writeParams({ formula: next === 'rating' ? null : next }); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = FORMULAS.findIndex((x) => x.id === id);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = FORMULAS[(i + step + FORMULAS.length) % FORMULAS.length]!;
    choose(next.id);
    document.getElementById(`formula-tab-${next.id}`)?.focus();
  };

  return (
    <section className="fc-fieldset" aria-labelledby="cmp-t">
      <div className="fc-fieldset-content">
        <h2 className="fc-fieldset-title" id="cmp-t">Formula comparison</h2>
        <p className="fc-fieldset-subtitle">Candidate ratings on the {WEEK9.length} Week 9 opening props, logged Nov 2 with one book posted.</p>
        <div className="fc-stack hg-gap-5">
          <div className="fc-row hg-wrap hg-between">
            <div className="fc-tabs" data-variant="secondary" role="tablist" aria-label="Formula" onKeyDown={onKey}>
              {FORMULAS.map((x) => (
                <button
                  key={x.id} id={`formula-tab-${x.id}`} type="button" role="tab" className="fc-tab" aria-controls="formula-panel"
                  aria-selected={x.id === id} tabIndex={x.id === id ? 0 : -1} onClick={() => choose(x.id)}
                >{x.name}</button>
              ))}
            </div>
            <label className="fc-row">
              <input
                type="checkbox" className="fc-toggle" role="switch" checked={hideLong}
                onChange={(e) => { setHideLong(e.target.checked); writeParams({ longshots: e.target.checked ? 'hide' : null }); }}
              />
              <span className="text-label-14">Hide odds over {LONG_SHOT.toFixed(1)}</span>
            </label>
          </div>

          <div id="formula-panel" role="tabpanel" aria-labelledby={`formula-tab-${f.id}`} className="fc-stack hg-gap-5">
            <div className="fc-stack hg-gap-2">
              <div className="fc-row hg-wrap">
                <span className="fc-badge" data-contrast="low" data-size="sm">{f.status}</span>
                <p className="text-copy-14 hg-flush">{f.plain}</p>
              </div>
              <div className="fc-snippet" data-wrap><pre className="fc-snippet-value">{f.code}</pre></div>
            </div>

            <div className="fc-stat-strip" data-variant="cells" role="group" aria-label={`Top 10 under ${f.name}`}>
              <div className="fc-stat">
                <p className="fc-stat-label">Middle odds</p>
                <p className="fc-stat-figure"><span className="fc-stat-value">{n ? median(top.map((x) => x.prop.price)).toFixed(2) : '–'}</span></p>
              </div>
              <div className="fc-stat">
                <p className="fc-stat-label">Average hit chance</p>
                <p className="fc-stat-figure"><span className="fc-stat-value">{hitAvg === null ? '–' : `${hitAvg}%`}</span></p>
              </div>
              <div className="fc-stat">
                <p className="fc-stat-label">Clear the posted price</p>
                <p className="fc-stat-figure"><span className="fc-stat-value">{clearCount}</span><span className="fc-stat-qualifier">of {n}</span></p>
              </div>
              <div className="fc-stat">
                <p className="fc-stat-label">Average clarity</p>
                <p className="fc-stat-figure"><span className="fc-stat-value">{clarityAvg ?? '–'}</span></p>
              </div>
            </div>

            <dl className="fc-description">
              <div><dt>Rewards</dt><dd>{f.rewards}</dd></div>
              <div><dt>Costs</dt><dd>{f.costs}</dd></div>
              <div><dt>Verdict</dt><dd>{f.verdict}</dd></div>
            </dl>

            <ScoreScatter formula={f} pool={pool} top={new Set(top.map((x) => x.prop))} scoreName={scoreName} />

            {n === 0 ? (
              <p className="text-copy-14 hg-secondary">No props qualify at these odds this week.</p>
            ) : (
              <div className="fc-table-wrap">
                <table className="fc-table" data-sticky-column>
                  <caption className="fc-visually-hidden">
                    Top 10 under {f.name}, highest score first{hideLong ? `, odds ${LONG_SHOT.toFixed(1)} and under` : ''}.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" data-grow>Player</th>
                      <th scope="col" data-align="numeric">Odds</th>
                      <th scope="col" data-align="numeric">Hit chance</th>
                      <th scope="col" data-align="numeric">Priced</th>
                      <th scope="col" data-align="numeric">{scoreName}</th>
                      <th scope="col">Posted price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map(({ prop, score }) => (
                      <tr key={prop.player + prop.game}>
                        <th scope="row"><Player name={prop.player} teamId={prop.team} number={prop.number} detail={[prop.position, prop.game].filter(Boolean).join(' · ')} /></th>
                        <td data-align="numeric">{prop.price.toFixed(2)}</td>
                        <td data-align="numeric">{prop.hitPct}%</td>
                        <td data-align="numeric">{prop.pricedPct}%</td>
                        <td data-align="numeric">
                          {f.status === 'Live rating' ? <GemMark kind="gem" rating={score} /> : score.toFixed(f.id === 'scorecard' ? 0 : 1)}
                        </td>
                        <td>{clears(prop) ? 'Clears' : 'Misses'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
