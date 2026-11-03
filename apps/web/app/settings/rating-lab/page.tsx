// Rating lab (Settings): what the gem rating is, the live constants behind it, a prop to try, the
// Week 9 formula comparison and the rating's history. Every rule and number comes from packages/core.
import {
  CLARITY_MAX, CLARITY_V3, FULL_CARAT, HOUSE_CUT, INJURY_SETUP, MODEL_V3, NEW_GEM_JUMP, NEW_GEM_RATING, V3,
} from '@hiddengems/core';
import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';
import { HISTORY } from '@/lib/rating-lab/history';
import { FormulaComparison } from './formula-comparison';
import { TryProp } from './try-prop';

export const metadata: Metadata = { title: 'Rating lab' };

const REPO = 'https://github.com/foundingadmin/hiddengems/blob/main';
const pc = (n: number) => `${Math.round(n * 100)}%`;
const minus = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const USER = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
const COMMIT = icon(<><circle cx="12" cy="12" r="3" /><path d="M3 12h6" /><path d="M15 12h6" /></>);

function Docs({ href, children }: { href: string; children: ReactNode }) {
  return (
    <footer className="fc-fieldset-footer">
      <p className="fc-fieldset-status" data-kind="docs">
        <a className="fc-link-action" data-external href={href} target="_blank" rel="noopener noreferrer">{children}</a>
      </p>
    </footer>
  );
}

function Rows({ title, rows }: { title: string; rows: [string, ReactNode, ReactNode?][] }) {
  const id = `cs-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div className="fc-fieldset-section">
      <h3 className="text-heading-14" id={id}>{title}</h3>
      <dl className="fc-description" data-layout="rows" aria-labelledby={id}>
        {rows.map(([term, value, note]) => (
          <div key={term}><dt>{term}</dt><dd>{value}{note && <small>{note}</small>}</dd></div>
        ))}
      </dl>
    </div>
  );
}

const day = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));

export default function RatingLabPage() {
  const injuries = Object.entries(INJURY_SETUP).map(([status, pts]) => `${status} ${pts}`).join(', ');
  const days = [...new Set(HISTORY.map((h) => h.date))];

  return (
    <div className="fc-settings-main">
      <section className="fc-fieldset" aria-labelledby="gem-t">
        <div className="fc-fieldset-content">
          <h2 className="fc-fieldset-title" id="gem-t">Gem rating</h2>
          <p className="fc-fieldset-subtitle">
            Carat times clarity, so a big edge on a murky read cannot score high.
          </p>
          <dl className="fc-description">
            <div><dt>Model</dt><dd className="hg-mono">{MODEL_V3}</dd></div>
            <div><dt>Range</dt><dd>0 to 100, gems only</dd></div>
            <div><dt>Gem</dt><dd>Our hit chance beats the posted price</dd></div>
            <div><dt>Fool&apos;s Gold</dt><dd>Beats the fair price, not the posted price</dd></div>
            <div><dt>Unrated</dt><dd>No 2026 stats, so the market stands</dd></div>
            <div><dt>New gem</dt><dd>Reaches {NEW_GEM_RATING}, or rises {NEW_GEM_JUMP} since found or read</dd></div>
          </dl>
        </div>
        <Docs href={`${REPO}/docs/prd.md#8-gem-rating-approved-for-now-nov-2-2026`}>How the formula was chosen</Docs>
      </section>

      <Suspense>
        <TryProp />
      </Suspense>

      <section className="fc-fieldset" aria-labelledby="cs-t">
        <div className="fc-fieldset-content">
          <div className="fc-fieldset-header">
            <div>
              <h2 className="fc-fieldset-title" id="cs-t">Current settings</h2>
              <p className="fc-fieldset-subtitle">The live values in packages/core. Changing one is a code change, reviewed in a pull request.</p>
            </div>
          </div>
        </div>
        <Rows title="Rating" rows={[
          ['Formula', <span key="r" className="hg-mono">round(100 × clamp(carat / {FULL_CARAT}, 0, 1) × clarity / 100)</span>, 'Only for props that clear the posted price'],
          ['Board order', 'Hit chance × clarity', "Gems first, then unrated, Fool's Gold last"],
        ]} />
        <Rows title="Market" rows={[
          ['Assumed cut', `${pc(HOUSE_CUT.base)} plus ${pc(HOUSE_CUT.perPoint)} per point of decimal odds, at most ${pc(HOUSE_CUT.max)}`],
          ['Fair chance', 'Implied chance × (1 − cut)'],
          ['Stats weight', `${V3.statsWeight} from ${V3.thinGames} games, ${V3.statsWeightThin} under`,
            `Times min(1, ${V3.longShotScale} / (odds + ${V3.longShotShift})). The fair price gets the rest`],
        ]} />
        <Rows title="Model" rows={[
          ['Red zone read', pc(V3.redZoneWeight), 'The rest is the shrunk touchdown hit rate'],
          ['Recalibration', `a = ${minus(V3.calA)}, b = ${V3.calB}`, 'Logistic, fit on Weeks 4 to 8'],
          ['Hit rate prior', `${V3.hitPrior} games at ${pc(V3.hitPriorRate)}`, `Full weight at ${pc(V3.hitPriorSnaps)} snap share`],
          ['Long touchdown prior', `${V3.longPrior} games`, `${V3.longFallback} per game where a position has no history`],
          ['Implied points exponent', String(V3.impliedExponent)],
        ]} />
        <Rows title="Clarity" rows={[
          ['Sample', `${CLARITY_MAX.sample} points`, `Full at ${CLARITY_V3.sampleTds} expected touchdowns`],
          ['Consistency', `${CLARITY_MAX.consistency} points`, `Zero once the red zone read and hit rate differ by ${pc(CLARITY_V3.consistencyGap)}`],
          ['Books agree', `${CLARITY_MAX.booksAgree} points`, `Zero at a ${pc(CLARITY_V3.booksRange)} price range, ${CLARITY_V3.oneBook} with one book`],
          ['Setup', `${CLARITY_MAX.setup} points`, `${injuries}. ${minus(-CLARITY_V3.fallingPenalty)} when snaps fall under ${pc(CLARITY_V3.fallingSnaps)} of the season's`],
        ]} />
        <Docs href={`${REPO}/docs/prd.md#11-model-spec--hidden-gems-v30`}>How the model was fit</Docs>
      </section>

      <Suspense>
        <FormulaComparison />
      </Suspense>

      <section className="fc-fieldset" aria-labelledby="hist-t">
        <div className="fc-fieldset-content">
          <h2 className="fc-fieldset-title hg-gap-below" id="hist-t">Update history</h2>
          <div className="fc-feed">
            {days.map((d) => (
              <section key={d} className="fc-feed-group" aria-labelledby={`h-${d}`}>
                <h3 className="fc-feed-heading" id={`h-${d}`}><time dateTime={d}>{day(d)}</time></h3>
                <ul className="fc-feed-list" role="list">
                  {HISTORY.filter((h) => h.date === d).map((h) => (
                    <li key={h.subject} className="fc-feed-row">
                      <span className="fc-feed-icon" title={h.actor === 'decision' ? 'You' : 'Code'}>{h.actor === 'decision' ? USER : COMMIT}</span>
                      <span className="fc-feed-text"><strong>{h.subject}</strong> {h.text}</span>
                      <a
                        className="fc-link-action fc-feed-source" data-external data-tone="quiet" data-mono={h.source.mono || undefined}
                        href={h.source.href} target="_blank" rel="noopener noreferrer"
                      >{h.source.label}</a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
