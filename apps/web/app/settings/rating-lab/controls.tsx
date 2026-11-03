'use client';
// Shared lab controls: a collapsible group (Facet's details group) and a slider paired with a number
// field, as packages/facet/components/slider.md asks ("pair with a numeric Input for exact values").
import { type ReactNode, useEffect, useId, useState } from 'react';

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

/** A collapsible group of controls; the summary carries the group's current value. */
export function Group({ title, value, open, children }: { title: string; value: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="fc-facet-group" open={open}>
      <summary>
        <span>{title}</span>
        <span className="fc-row"><span className="hg-sub tabular">{value}</span>{CHEVRON}</span>
      </summary>
      <div className="fc-stack hg-group-body">{children}</div>
    </details>
  );
}

/** Keeps a value in the query string so a lab view can be shared (DESIGN.md rule 10). */
export function writeParams(values: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(values)) {
    if (v === null) url.searchParams.delete(k); else url.searchParams.set(k, v);
  }
  window.history.replaceState(window.history.state, '', url);
}

export function Slider({ label, value, min, max, step, unit, digits, helper, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; digits: number;
  helper?: ReactNode; onChange: (v: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value.toFixed(digits));
  useEffect(() => setDraft(value.toFixed(digits)), [value, digits]);
  const commit = (text: string) => {
    setDraft(text);
    const n = Number(text);
    if (text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
  };
  return (
    <div>
      <label className="fc-label" htmlFor={`${id}-r`}>{label}</label>
      <div className="fc-row">
        <input
          id={`${id}-r`} className="hg-grow" type="range" min={min} max={max} step={step} value={value}
          aria-describedby={helper ? `${id}-h` : undefined} onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="fc-input-group" data-size="small" data-width="short">
          <input
            className="fc-input fc-num" inputMode="decimal" aria-label={unit ? `${label}, ${unit}` : label} value={draft}
            onChange={(e) => commit(e.target.value)} onBlur={() => setDraft(value.toFixed(digits))}
          />
          {unit && <span className="fc-input-affix" aria-hidden="true">{unit}</span>}
        </div>
      </div>
      {helper && <p className="fc-helper" id={`${id}-h`}>{helper}</p>}
    </div>
  );
}
