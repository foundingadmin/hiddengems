// Every prop's score under one formula against its odds (Facet scatter, packages/facet/components/chart-card.md).
// Odds run on a log scale so short prices get room; a prop that clears the posted price is a gem point, the
// rest are gray, and the top 10 are ringed. Positions are percentages, so the chart needs no measuring.
import { clears, type Formula, type LabProp } from '@/lib/rating-lab/formulas';

const ODDS: [number, number] = [1.3, 30];
const ODDS_TICKS = [1.5, 2, 3, 5, 10, 20];

const lo = Math.log(ODDS[0]), hi = Math.log(ODDS[1]);
const xPct = (price: number) => ((Math.log(Math.min(Math.max(price, ODDS[0]), ODDS[1])) - lo) / (hi - lo)) * 100;

/** 3 to 5 round steps covering [min, max]. */
function ticks(min: number, max: number) {
  const span = max - min || 1;
  const pow = 10 ** Math.floor(Math.log10(span / 4));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= 4) ?? span / 4;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 1e6; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

const pct = (n: number) => `${n.toFixed(2)}%`;

export function ScoreScatter({ formula, pool, top, scoreName }: {
  formula: Formula; pool: readonly LabProp[]; top: ReadonlySet<LabProp>; scoreName: string;
}) {
  const points = pool.flatMap((prop) => {
    const score = formula.score(prop);
    return score === null ? [] : [{ prop, score, gem: clears(prop) }];
  });
  const values = points.map((p) => p.score);
  const yTicks = ticks(Math.min(0, ...values), Math.max(1, ...values));
  const y0 = yTicks[0]!, y1 = yTicks[yTicks.length - 1]!;
  const yPct = (v: number) => (1 - (v - y0) / (y1 - y0 || 1)) * 100;
  const gems = points.filter((p) => p.gem).length;
  const digits = formula.id === 'scorecard' ? 0 : 1;

  return (
    <div className="fc-stack">
      <ul className="fc-legend" role="list">
        <li className="fc-legend-item"><span className="fc-legend-key" data-gem /><span className="fc-legend-name">Clears the posted price</span><span className="fc-legend-value">{gems}</span></li>
        {points.length > gems && (
          <li className="fc-legend-item"><span className="fc-legend-key" data-series="muted" /><span className="fc-legend-name">Misses</span><span className="fc-legend-value">{points.length - gems}</span></li>
        )}
        <li className="fc-legend-item"><span className="fc-legend-key" data-shape="ring" /><span className="fc-legend-name">Top 10</span></li>
      </ul>
      <figure
        className="fc-chart" data-kind="scatter" role="img"
        aria-label={`${scoreName} against odds for ${points.length} props, ${gems} clear the posted price. The top 10 are listed in the table below.`}
      >
        <svg aria-hidden="true" focusable="false">
          {yTicks.map((v) => (
            <g key={v}>
              <line className={v === 0 ? 'fc-chart-baseline' : 'fc-chart-grid'} x1="0" x2="100%" y1={pct(yPct(v))} y2={pct(yPct(v))} />
              <text className="fc-chart-tick" x="-8" y={pct(yPct(v))} dy="4" textAnchor="end">{v}</text>
            </g>
          ))}
          {ODDS_TICKS.map((o) => (
            <text key={o} className="fc-chart-tick" x={pct(xPct(o))} y="100%" dy="18" textAnchor="middle">{o}</text>
          ))}
          <text className="fc-chart-axis-title" x="100%" y="100%" dy="34" textAnchor="end">Odds, log scale</text>
          <text className="fc-chart-axis-title" x="0" y="0" dy="-12">{scoreName}</text>
          {points.filter((p) => !p.gem).concat(points.filter((p) => p.gem)).map(({ prop, score, gem }) => (
            <circle
              key={prop.player + prop.game} className="fc-chart-point" data-gem={gem || undefined} data-series={gem ? undefined : 'muted'}
              cx={pct(xPct(prop.price))} cy={pct(yPct(score))} r="4"
            >
              <title>{`${prop.player}, ${prop.price.toFixed(2)}, ${score.toFixed(digits)}`}</title>
            </circle>
          ))}
          {points.filter((p) => top.has(p.prop)).map(({ prop, score }) => (
            <circle key={`ring-${prop.player}${prop.game}`} className="fc-chart-ring" cx={pct(xPct(prop.price))} cy={pct(yPct(score))} r="8" />
          ))}
        </svg>
      </figure>
    </div>
  );
}
