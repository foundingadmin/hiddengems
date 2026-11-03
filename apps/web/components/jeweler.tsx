'use client';
// The Jeweler (docs/build-brief.md, "The Jeweler"; packages/facet/components/chat.md): context chips, the
// conversation, suggested questions and the composer. A right sheet on desktop (JewelerSheet, ?ask=1), the
// /jeweler tab on phone. It explains the app's numbers; nothing in it places, changes or sends a bet.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ask, loadJeweler } from '@/app/jeweler/actions';
import type { JewelerView } from '@/lib/jeweler';
import './jeweler.css';

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const MARK = svg(<><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>);
const SEND = svg(<><path d="M14.5 21.7a.5.5 0 0 0 .9-.1l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0-.1.9l7.9 3.2a2 2 0 0 1 1.1 1.1z" /><path d="m21.9 2.1-10.9 10.9" /></>);
const CLOSE = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const QUESTION_CHARS = 500;

interface Turn { role: 'user' | 'assistant'; text: string }
type Problem = { message: string; logs?: boolean };

/** Answers come back as plain text; blank lines separate paragraphs. */
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

function useJeweler(initial: JewelerView) {
  const [view, setView] = useState(initial);
  // A fresh view (the sheet reopened, the slip changed) keeps the conversation.
  useEffect(() => setView(initial), [initial]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const send = async (question: string) => {
    const q = question.trim().slice(0, QUESTION_CHARS);
    if (!q || pending || !view.ready) return false;
    const next = [...turns, { role: 'user' as const, text: q }];
    setTurns(next);
    setAsked((a) => [...a, q]);
    setProblem(null);
    setPending(true);
    try {
      const r = await ask(view.gem?.id ?? null, next);
      if (r.ok) setTurns([...next, { role: 'assistant', text: r.text }]);
      else {
        setProblem({ message: r.message, logs: r.logs });
        if (r.view) setView(r.view);
      }
    } catch {
      setProblem({ message: 'The Jeweler could not answer.', logs: true });
    } finally {
      setPending(false);
    }
    return true;
  };
  // Suggestions are replaced after each answer: the ones already asked drop out.
  const suggestions = view.suggestions.filter((s) => !asked.includes(s));
  return { view, turns, pending, problem, send, suggestions };
}

export function JewelerChat({ initial, frame, onClose }: { initial: JewelerView; frame: 'page' | 'sheet'; onClose?: () => void }) {
  const { view, turns, pending, problem, send, suggestions } = useJeweler(initial);
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (turns.length || pending) end.current?.scrollIntoView({ block: 'nearest' }); }, [turns.length, pending, problem]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = draft;
    if (await send(q)) setDraft((d) => (d === q ? '' : d));
    input.current?.focus();
  };
  const pick = (q: string) => { void send(q); input.current?.focus(); };

  const chips = (view.gem || view.slip) && (
    <ul className="fc-chat-context" aria-label="Looking at">
      {view.gem && <li><span className="fc-badge" data-size="sm" data-contrast="low">About {view.gem.name}</span></li>}
      {view.slip && <li><span className="fc-badge" data-size="sm" data-contrast="low">{view.slip.name}</span></li>}
    </ul>
  );
  const log = (
    <div className="fc-chat" role="log" aria-label="Conversation with the Jeweler" aria-busy={pending || undefined}>
      {turns.map((t, i) => t.role === 'user' ? (
        <div key={i} className="fc-msg text-copy-14" data-from="user"><p className="fc-visually-hidden">You</p><p>{t.text}</p></div>
      ) : (
        <div key={i} className="fc-msg text-copy-14" data-from="assistant">
          <p className="fc-msg-by text-label-12">{MARK}The Jeweler</p>
          {paragraphs(t.text).map((p, j) => <p key={j}>{p}</p>)}
        </div>
      ))}
      {pending && (
        <div className="fc-msg text-copy-14" data-from="assistant">
          <p className="fc-msg-by text-label-12">{MARK}The Jeweler</p>
          <p className="hg-jeweler-wait"><span className="fc-spinner" data-size="small" aria-hidden="true" />Reading the numbers</p>
        </div>
      )}
      {problem && (
        <div className="fc-note" data-size="small" data-type="error" role="alert">
          <span>{problem.message}</span>
          {problem.logs && <Link className="fc-note-link fc-link-action" href="/data/logs">Logs</Link>}
        </div>
      )}
    </div>
  );
  const foot = (
    <>
      {view.note && <div className="fc-note" role="note">{view.note}</div>}
      {view.ready && suggestions.length > 0 && (
        <ul className="fc-suggest" aria-label="Suggested questions">
          {suggestions.slice(0, 3).map((s) => (
            <li key={s}>
              <button type="button" className="fc-button" data-variant="secondary" data-size="small" data-shape="rounded" disabled={pending} onClick={() => pick(s)}>
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="fc-composer" onSubmit={submit}>
        <input
          ref={input} className="fc-input" type="text" name="question" autoComplete="off" maxLength={QUESTION_CHARS}
          placeholder={view.gem ? `Ask about ${view.gem.name}` : "Ask about this week's gems"} aria-label="Ask the Jeweler"
          value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!view.ready} autoFocus={frame === 'sheet' && view.ready}
        />
        <button type="submit" className="fc-button" data-shape="square" aria-label="Send" disabled={!view.ready || pending || !draft.trim()}>{SEND}</button>
      </form>
    </>
  );

  if (frame === 'sheet') {
    return (
      <>
        <header className="fc-sheet-header hg-jeweler-head">
          <div className="fc-sheet-titlebar">
            <div className="fc-sheet-titles">
              <h2 className="fc-sheet-title text-heading-20" id="jeweler-title">The Jeweler</h2>
              <p className="fc-sheet-subtitle text-copy-14">Answers from this week&apos;s gems and prices</p>
            </div>
            <button type="button" className="fc-button fc-sheet-close" data-variant="tertiary" data-shape="square" data-size="small" aria-label="Close" onClick={onClose}>{CLOSE}</button>
          </div>
          {chips}
        </header>
        <div className="fc-sheet-body">{log}<div ref={end} /></div>
        <footer className="fc-sheet-footer hg-jeweler-foot">{foot}</footer>
      </>
    );
  }
  return (
    <div className="hg-jeweler-page">
      {chips}
      {log}
      <div className="hg-jeweler-foot">{foot}</div>
      <div ref={end} />
    </div>
  );
}

/** Desktop: the Jeweler as a right sheet over whatever page is open, while ?ask=1 is in the URL (gem=<id> adds a gem). */
export function JewelerSheet() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const open = params.get('ask') === '1' && path !== '/jeweler';
  const gemId = params.get('gem');
  const [view, setView] = useState<{ gemId: string | null; view: JewelerView } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  // Read on every open, so the chips show the slip as it is now.
  useEffect(() => {
    if (!open) return;
    let live = true;
    loadJeweler(gemId).then((v) => { if (live) setView({ gemId, view: v }); }).catch(() => {});
    return () => { live = false; };
  }, [open, gemId]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, view]);

  // Closing (the button, Escape) only drops ?ask, so any page state in the URL stays as it was.
  const close = () => {
    if (params.get('ask') !== '1') return;
    const next = new URLSearchParams(params);
    next.delete('ask');
    router.replace(`${path}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  if (!view) return null;
  return (
    <dialog ref={dialog} className="fc-sheet" aria-labelledby="jeweler-title" onClose={close}>
      <JewelerChat key={view.gemId ?? ''} initial={view.view} frame="sheet" onClose={() => dialog.current?.close()} />
    </dialog>
  );
}
