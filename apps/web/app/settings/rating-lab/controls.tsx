'use client';
// Shared lab controls: a collapsible group (Facet's details group) and a slider paired with a number
// field, as packages/facet/components/slider.md asks ("pair with a numeric Input for exact values").
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

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

/**
 * A slider paired with an exact number field. onChange runs live while dragging or typing; onCommit runs
 * on release (pointer up, key up, blur, Enter), so the URL is written once per change, not per step (INT-11).
 * A number outside the range keeps the last good value and marks the field invalid with the range (FRM-09).
 */
export function Slider({ label, value, min, max, step, unit, digits, helper, onChange, onCommit }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; digits: number;
  helper?: ReactNode; onChange: (v: number) => void; onCommit: (v: number) => void;
}) {
  const id = useId();
  const editing = useRef(false);
  const [draft, setDraft] = useState(value.toFixed(digits));
  useEffect(() => { if (!editing.current) setDraft(value.toFixed(digits)); }, [value, digits]);
  const parse = (text: string) => {
    const n = Number(text);
    return text.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const invalid = parse(draft) === null;
  const type = (text: string) => {
    editing.current = true;
    setDraft(text);
    const n = parse(text);
    if (n !== null) onChange(n);
  };
  const settle = () => {
    editing.current = false;
    const n = parse(draft);
    if (n !== null) onCommit(n);
    setDraft((n ?? value).toFixed(digits));
  };
  const release = (e: { currentTarget: HTMLInputElement }) => onCommit(Number(e.currentTarget.value));
  const helpId = `${id}-h`, errId = `${id}-e`;
  return (
    <div>
      <label className="fc-label" htmlFor={`${id}-r`}>{label}</label>
      <div className="fc-row">
        <input
          id={`${id}-r`} className="hg-grow" type="range" min={min} max={max} step={step} value={value}
          aria-describedby={helper ? helpId : undefined} onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={release} onKeyUp={release} onBlur={release}
        />
        <div className="fc-input-group" data-size="small" data-width="short">
          <input
            className="fc-input fc-num" inputMode="decimal" aria-label={unit ? `${label}, ${unit}` : label} value={draft}
            aria-invalid={invalid || undefined} aria-describedby={invalid ? errId : helper ? helpId : undefined}
            onFocus={() => { editing.current = true; }} onChange={(e) => type(e.target.value)} onBlur={settle}
            onKeyDown={(e) => { if (e.key === 'Enter') settle(); }}
          />
          {unit && <span className="fc-input-affix" aria-hidden="true">{unit}</span>}
        </div>
      </div>
      {invalid
        ? <p className="fc-helper" data-type="error" id={errId}>From {min.toFixed(digits)} to {max.toFixed(digits)}.</p>
        : helper && <p className="fc-helper" id={helpId}>{helper}</p>}
    </div>
  );
}
