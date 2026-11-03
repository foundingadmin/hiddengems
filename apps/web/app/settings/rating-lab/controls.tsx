'use client';
// Shared lab controls built on Facet: a collapse that carries its group's value (components/collapse.md) and
// a slider with its exact number field in the label row (components/slider.md).
import { sliderShare } from '@foundingcreative/facet/js/forms.mjs';
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';

const CHEVRON = (
  <svg className="fc-collapse-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

/** A collapsible group of controls; the summary carries the group's current value. */
export function Group({ title, value, open, children }: { title: string; value: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="fc-collapse" data-size="small" open={open}>
      <summary>
        <span className="fc-collapse-title">{title}</span>
        <span className="fc-collapse-value">{value}</span>
        {CHEVRON}
      </summary>
      <div className="fc-collapse-body">{children}</div>
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
 * on release (pointer up, key up, blur, Enter) when the value changed, so the URL is written once per change,
 * not per step (INT-11).
 * A number outside the range keeps the last good value and marks the field invalid with the range (FRM-09).
 */
export function Slider({ label, value, min, max, step, unit, digits, helper, onChange, onCommit }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; digits: number;
  helper?: ReactNode; onChange: (v: number) => void; onCommit: (v: number) => void;
}) {
  const id = useId();
  const editing = useRef(false);
  // The last value written, so releasing or blurring without a change writes nothing (tabbing through is free).
  const committed = useRef(value);
  const commit = (v: number) => { if (v !== committed.current) { committed.current = v; onCommit(v); } };
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
    if (n !== null) commit(n);
    setDraft((n ?? value).toFixed(digits));
  };
  const release = (e: { currentTarget: HTMLInputElement }) => commit(Number(e.currentTarget.value));
  const helpId = `${id}-h`, errId = `${id}-e`;
  return (
    <div className="fc-slider">
      <div className="fc-slider-head">
        <label className="fc-label" htmlFor={`${id}-r`}>{label}</label>
        <div className="fc-input-group" data-size="small">
          <input
            className="fc-input fc-num" inputMode="decimal" aria-label={`${label}, ${unit ?? 'exact'}`} value={draft}
            aria-invalid={invalid || undefined} aria-describedby={invalid ? errId : helper ? helpId : undefined}
            onFocus={() => { editing.current = true; }} onChange={(e) => type(e.target.value)} onBlur={settle}
            onKeyDown={(e) => { if (e.key === 'Enter') settle(); }}
          />
          {unit && <span className="fc-input-affix" aria-hidden="true">{unit}</span>}
        </div>
      </div>
      <input
        id={`${id}-r`} className="fc-slider-track" type="range" min={min} max={max} step={step} value={value}
        style={{ '--value': sliderShare(value, min, max) } as CSSProperties}
        aria-describedby={helper ? helpId : undefined} onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={release} onKeyUp={release} onBlur={release}
      />
      {invalid
        ? <p className="fc-helper" data-type="error" id={errId}>From {min.toFixed(digits)} to {max.toFixed(digits)}.</p>
        : helper && <p className="fc-helper" id={helpId}>{helper}</p>}
    </div>
  );
}
