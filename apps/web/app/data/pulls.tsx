'use client';
// Pull progress on Data health. Pulls run one at a time from a queue: the header pull queues every
// source, a row's "Pull now" queues one. Each row shows Queued, then Running, then its fresh result as
// the page refreshes after each pull, so progress is visible while it happens.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type PullOutcome, pull } from './actions';

interface Item { job: string; spend: boolean }
/** What a pull left behind that the pull log does not show: skipped and locked pulls write no run. */
interface Note { status: 'skipped' | 'locked'; message: string }

interface Pulls {
  queued: string[];
  running: string | null;
  batch: { done: number; total: number } | null;
  summary: string | null;
  notes: Record<string, Note>;
  enqueue(items: Item[], batch?: boolean): void;
  /** Sources whose pause or resume is saving, shown at once in the status cell (INT-12). */
  saving: Record<string, 'Pausing' | 'Resuming'>;
  setSaving(job: string, state: 'Pausing' | 'Resuming' | null): void;
}

const Ctx = createContext<Pulls | null>(null);
export const usePulls = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Pull controls need <PullQueue>');
  return c;
};

const STATUS_WORDS: Record<string, string> = { succeeded: 'succeeded', warned: 'warned', failed: 'failed', skipped: 'skipped', locked: 'already running' };

function summarize(outcomes: PullOutcome[]): string {
  const counts = new Map<string, number>();
  for (const o of outcomes) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  return [...counts].map(([s, n]) => `${n} ${STATUS_WORDS[s] ?? s}`).join(', ');
}

export function PullQueue({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Item[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [saving, setSavingState] = useState<Record<string, 'Pausing' | 'Resuming'>>({});
  const setSaving = useCallback((job: string, state: 'Pausing' | 'Resuming' | null) => {
    setSavingState(({ [job]: _old, ...rest }) => (state ? { ...rest, [job]: state } : rest));
  }, []);
  const busy = useRef(false);
  const outcomes = useRef<PullOutcome[]>([]);

  const enqueue = useCallback((items: Item[], asBatch = false) => {
    setQueue((q) => {
      const taken = new Set([...q.map((i) => i.job), ...(busy.current && running ? [running] : [])]);
      const fresh = items.filter((i) => !taken.has(i.job));
      if (asBatch && fresh.length) {
        outcomes.current = [];
        setSummary(null);
        setBatch({ done: 0, total: fresh.length });
      }
      return [...q, ...fresh];
    });
  }, [running]);

  useEffect(() => {
    if (busy.current || !queue.length) return;
    const [next, ...rest] = queue as [Item, ...Item[]];
    busy.current = true;
    setQueue(rest);
    setRunning(next.job);
    setNotes(({ [next.job]: _gone, ...keep }) => keep);
    pull(next.job, next.spend)
      .catch((e: unknown): PullOutcome[] => [{ job: next.job, status: 'failed', message: e instanceof Error ? e.message : 'The pull did not finish' }])
      .then((results) => {
        const [main] = results;
        if (main && (main.status === 'skipped' || main.status === 'locked')) {
          setNotes((n) => ({ ...n, [main.job]: { status: main.status as Note['status'], message: main.message } }));
        }
        if (main) outcomes.current.push(main);
        setBatch((b) => {
          if (!b) return b;
          const done = b.done + 1;
          if (done >= b.total) { setSummary(summarize(outcomes.current)); return null; }
          return { ...b, done };
        });
        busy.current = false;
        setRunning(null);
      });
  }, [queue, running]);

  return (
    <Ctx.Provider value={{ queued: queue.map((i) => i.job), running, batch, summary, notes, enqueue, saving, setSaving }}>
      {children}
    </Ctx.Provider>
  );
}

const Spinner = () => <span className="fc-spinner" aria-hidden="true" />;

/** The header pull: queues every free source and counts through them. */
export function PullAllButton({ jobs, label }: { jobs: string[]; label: string }) {
  const { batch, summary, enqueue } = usePulls();
  return (
    <>
      <span className="hg-secondary text-copy-14" role="status">{summary && !batch ? summary : ''}</span>
      <button
        className="fc-button" data-variant="secondary" data-size="small" type="button"
        aria-busy={batch ? true : undefined}
        onClick={() => { if (!batch) enqueue(jobs.map((job) => ({ job, spend: false })), true); }}
      >
        {batch ? <><Spinner />Pulling {Math.min(batch.done + 1, batch.total)} of {batch.total}</> : label}
      </button>
    </>
  );
}

/**
 * A row's "Pull now". With a cost (paid odds), the first press asks to confirm the credits it spends;
 * the confirm is refused when the month cannot cover it.
 */
export function PullButton({ job, label, text = 'Pull now', variant = 'tertiary', cost, left }: {
  job: string; label: string; text?: string; variant?: 'secondary' | 'tertiary'; cost?: number; left?: number | null;
}) {
  const { queued, running, enqueue } = usePulls();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirming) confirmRef.current?.focus(); }, [confirming]);

  // The status cell already says Queued or Running; the button just stops taking presses.
  if (running === job || queued.includes(job)) {
    return <button className="fc-button" data-variant={variant} data-size="small" type="button" aria-disabled="true">{text}</button>;
  }
  if (cost != null && confirming) {
    const short = left != null && left < cost;
    return (
      <span className="hg-confirm" onKeyDown={(e) => { if (e.key === 'Escape') setConfirming(false); }}>
        <span className="hg-secondary text-copy-13">{short ? `${left} credits left` : left != null ? `${cost} of ${left} credits` : `${cost} credits`}</span>
        <button
          ref={confirmRef} className="fc-button" data-variant="secondary" data-size="small" type="button"
          aria-disabled={short || undefined}
          onClick={() => { if (short) return; setConfirming(false); enqueue([{ job, spend: true }]); }}
        >
          Pull odds
        </button>
        <button className="fc-button" data-variant="tertiary" data-size="small" type="button" onClick={() => setConfirming(false)}>Cancel</button>
      </span>
    );
  }
  return (
    <button
      className="fc-button" data-variant={variant} data-size="small" type="button" aria-label={`${text} for ${label.toLowerCase()}`}
      onClick={() => (cost != null ? setConfirming(true) : enqueue([{ job, spend: false }]))}
    >
      {text}
    </button>
  );
}

/** The row's last run, replaced by Queued or Running while a pull is under way, or a skip it left. */
export function RunCell({ job, children }: { job: string; children: ReactNode }) {
  const { queued, running, notes, saving } = usePulls();
  if (saving[job]) return <span className="fc-status text-copy-14" aria-busy="true"><span className="fc-spinner" data-size="small" aria-hidden="true" />{saving[job]}</span>;
  if (running === job) return <span className="fc-status text-copy-14" aria-busy="true"><span className="fc-spinner" data-size="small" aria-hidden="true" />Running</span>;
  if (queued.includes(job)) return <span className="fc-level">Queued</span>;
  const note = notes[job];
  if (note) return <span className="fc-level">{note.status === 'locked' ? 'Already running' : 'Skipped'}</span>;
  return <>{children}</>;
}

/** The row's last message, or why a pull just now was skipped. */
export function ResultCell({ job, children }: { job: string; children: ReactNode }) {
  const { notes } = usePulls();
  const note = notes[job];
  return <>{note ? note.message : children}</>;
}

/**
 * A fix: queues one or more pulls in order ("Pull rosters, then results"). Paid odds never ride a fix; they
 * keep their own confirmed button. `look="note"` is the link-style action inside a row's note
 * (Facet button.fc-note-link), since the row already has buttons.
 */
export function FixButton({ jobs, text, name, variant = 'secondary', look = 'button' }: {
  jobs: string[]; text: string; name?: string; variant?: 'secondary' | 'tertiary'; look?: 'button' | 'note';
}) {
  const { queued, running, enqueue } = usePulls();
  const busy = jobs.some((j) => j === running || queued.includes(j));
  const style = look === 'note'
    ? { className: 'fc-note-link' }
    : { className: 'fc-button', 'data-variant': variant, 'data-size': 'small' };
  return (
    <button
      {...style} type="button"
      aria-busy={busy || undefined} aria-label={name}
      onClick={() => { if (!busy) enqueue(jobs.map((job) => ({ job, spend: false }))); }}
    >
      {busy && <Spinner />}{text}
    </button>
  );
}
