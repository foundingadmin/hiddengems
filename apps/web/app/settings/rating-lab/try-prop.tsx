'use client';
// Try a prop: every number here comes from core's live rules (appraise, clarityScore, houseCut,
// newGemReason), so the lab can never drift from the board.
import {
  appraise, CLARITY_MAX, CLARITY_V3, type ClarityParts, clarityScore, fairChance, FULL_CARAT, houseCut, impliedFromDecimal,
  newGemReason,
} from '@hiddengems/core';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GemMark } from '@/components/marks';
import { Group, Slider, writeParams } from './controls';

const PRICE = { min: 1.3, max: 30, step: 0.05 };
const HIT = { min: 0.5, max: 95, step: 0.5 };
const PARTS: { key: keyof ClarityParts; param: string; label: string; helper: string }[] = [
  { key: 'sample', param: 'sample', label: 'Sample', helper: 'Touchdowns we would expect to have seen so far.' },
  { key: 'consistency', param: 'consistency', label: 'Consistency', helper: 'How closely the red zone read and the hit rate agree.' },
  { key: 'booksAgree', param: 'books', label: 'Books agree', helper: `How close the books’ prices are; one book posted scores ${CLARITY_V3.oneBook}.` },
  { key: 'setup', param: 'setup', label: 'Setup', helper: 'Injury report and snap share trend.' },
];
const DEFAULT_PARTS: ClarityParts = { sample: 28, consistency: 21, booksAgree: 7, setup: 15 };

const clampTo = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const read = (params: URLSearchParams, key: string, fallback: number, lo: number, hi: number) => {
  const raw = params.get(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? clampTo(n, lo, hi) : fallback;
};
/** Signed with a real minus (packages/facet/patterns/hidden-gems.md, number formats). */
const signed = (n: number, digits = 1) => {
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(digits)}`;
};
const pct1 = (p: number) => `${(p * 100).toFixed(1)}%`;
const fmtHit = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function TryProp() {
  const params = useSearchParams();
  const [price, setPrice] = useState(() => read(params, 'price', 6, PRICE.min, PRICE.max));
  const [hit, setHit] = useState(() => read(params, 'hit', 20, HIT.min, HIT.max));
  const [parts, setParts] = useState<ClarityParts>(() => ({
    sample: read(params, 'sample', DEFAULT_PARTS.sample, 0, CLARITY_MAX.sample),
    consistency: read(params, 'consistency', DEFAULT_PARTS.consistency, 0, CLARITY_MAX.consistency),
    booksAgree: read(params, 'books', DEFAULT_PARTS.booksAgree, 0, CLARITY_MAX.booksAgree),
    setup: read(params, 'setup', DEFAULT_PARTS.setup, 0, CLARITY_MAX.setup),
  }));
  const [hasStats, setHasStats] = useState(() => params.get('stats') !== 'none');

  const clarity = clarityScore(parts);
  // Without 2026 stats the model's hit chance is the fair price (core readProp), so the market stands.
  const g = appraise({ hitChance: hasStats ? hit / 100 : fairChance(price), price, clarity, hasStats });
  const fresh = newGemReason(g.rating, null);
  const gapDir = g.gapToPosted > 0.05 ? 'positive' : g.gapToPosted < -0.05 ? 'negative' : 'neutral';

  const setPart = (key: keyof ClarityParts, param: string, v: number) => {
    setParts((p) => ({ ...p, [key]: v }));
    writeParams({ [param]: String(v) });
  };

  const result = {
    gem: <><GemMark kind="gem" rating={g.rating} size="lg" /><span className="fc-stat-qualifier">Gem</span></>,
    'fools-gold': <GemMark kind="fools-gold" rating={null} />,
    none: <span className="fc-stat-value">No gem</span>,
    unrated: <span className="fc-stat-value">Unrated</span>,
  }[g.kind];

  const why = {
    gem: (
      <>
        Clears the posted price, so it rates{' '}
        <span className="hg-mono">round(100 × clamp({signed(g.carat)} / {FULL_CARAT}, 0, 1) × {clarity} / 100) = {g.rating}</span>.
        {fresh && ' It would join New gems.'}
      </>
    ),
    'fools-gold': 'Beats the fair price but not the posted price, so the book’s cut eats the edge. No rating.',
    none: 'Beats neither the fair price nor the posted price. No rating.',
    unrated: 'No 2026 stats, so there is no read and the market stands. No rating.',
  }[g.kind];

  return (
    <section className="fc-fieldset" aria-labelledby="try-t">
      <div className="fc-fieldset-content">
        <h2 className="fc-fieldset-title" id="try-t">Try a prop</h2>
        <p className="fc-fieldset-subtitle">Set a price, a hit chance and clarity to see how the live rules rate the prop.</p>
        <div className="fc-stack">
          <div className="fc-stat-strip" data-variant="cells" role="group" aria-label="Appraisal" aria-live="polite">
            <div className="fc-stat">
              <p className="fc-stat-label">Result</p>
              <p className="fc-stat-figure">{result}</p>
            </div>
            <div className="fc-stat">
              <p className="fc-stat-label">Carat</p>
              <p className="fc-stat-figure"><span className="fc-stat-value">{signed(g.carat)}</span><span className="fc-stat-qualifier">pts</span></p>
              <p className="fc-stat-basis">Over the fair chance, {pct1(g.fair)}</p>
            </div>
            <div className="fc-stat">
              <p className="fc-stat-label">Gap to posted</p>
              <p className="fc-stat-figure">
                <span className="fc-stat-value"><span className="fc-delta" data-direction={gapDir}>{signed(g.gapToPosted)}</span></span>
                <span className="fc-stat-qualifier">pts</span>
              </p>
              <p className="fc-stat-basis">Over the priced chance, {pct1(g.priced)}</p>
            </div>
            <div className="fc-stat">
              <p className="fc-stat-label">Clarity</p>
              <p className="fc-stat-figure"><span className="fc-stat-value">{clarity}</span><span className="fc-stat-qualifier">of 100</span></p>
            </div>
          </div>
          <p className="fc-fieldset-consequence">{why}</p>
        </div>
      </div>
      <div className="fc-fieldset-section">
        <Group title="Price" value={price.toFixed(2)} open>
          <Slider
            label="Decimal odds" value={price} min={PRICE.min} max={PRICE.max} step={PRICE.step} digits={2}
            helper={`Implied ${pct1(impliedFromDecimal(price))}, less an assumed cut of ${Math.round(houseCut(price) * 100)}%.`}
            onChange={(v) => { setPrice(v); writeParams({ price: String(v) }); }}
          />
        </Group>
        <Group title="Hit chance" value={hasStats ? `${fmtHit(hit)}%` : 'No stats'} open>
          <label className="fc-row">
            <input
              type="checkbox" className="fc-toggle" role="switch" checked={hasStats}
              onChange={(e) => { setHasStats(e.target.checked); writeParams({ stats: e.target.checked ? null : 'none' }); }}
            />
            <span className="text-label-14">Has 2026 stats</span>
          </label>
          {hasStats && (
            <Slider
              label="Our hit chance" value={hit} min={HIT.min} max={HIT.max} step={HIT.step} unit="%" digits={1}
              onChange={(v) => { setHit(v); writeParams({ hit: String(v) }); }}
            />
          )}
        </Group>
        <Group title="Clarity" value={`${clarity} of 100`}>
          {PARTS.map((p) => (
            <Slider
              key={p.key} label={p.label} value={parts[p.key]} min={0} max={CLARITY_MAX[p.key]} step={1} unit={`of ${CLARITY_MAX[p.key]}`} digits={0}
              helper={p.helper} onChange={(v) => setPart(p.key, p.param, v)}
            />
          ))}
        </Group>
      </div>
    </section>
  );
}
