'use client';
// The gem sheet (docs/build-brief.md, Gem sheet): a right side Facet sheet over Gems, full screen on a phone.
// The open gem lives in the URL (?gem=<selection key>), so it can be linked and Back closes it. The header and
// tabs stay pinned; the body is one scroll and each tab jumps to its section. It springs in and out with the drawer
// moment (lib/moments/drawer.ts), keeping the gem on screen while it slides out after Back.
import { FULL_CARAT } from '@hiddengems/core';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type MouseEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SlipButton } from '@/components/add-to-slip';
import { GameLog, GameLogKey } from '@/components/game-log';
import { ConditionsList, CoreSampleTable, GemNotes, LoupeView, PriceChart, TrendLines, scrollTopFor } from '@/components/gem-read';
import { useCrumb } from '@/components/shell';
import { Edge, GemMark, Player } from '@/components/marks';
import type { BoardRow } from '@/lib/board';
import type { GemDetail } from '@/lib/gem';
import { dismissible, scrollBodyTo } from '@foundingcreative/facet/js/sheet.mjs';
import { closeSheet, keepOpen, openerOf, rippleOpen } from '@/lib/moments/drawer';

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const X = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const CHAT = svg(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />);

const SECTIONS = [
  { id: 'gem-overview', tab: 'Overview' },
  { id: 'gem-notes', tab: 'Notes' },
  { id: 'gem-loupe', tab: 'The loupe' },
  { id: 'gem-context', tab: 'Context' },
] as const;

/** Set when this tab opened the sheet itself, so closing can go Back instead of stacking history. */
let pushed = false;

// The gem a click asked for. The sheet opens on it at once, with the board row's header and a loading body, while
// the push to ?gem= renders on the server; it clears once the URL catches up.
let pending: string | null = null;
const listeners = new Set<() => void>();
const setPending = (k: string | null) => { pending = k; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const usePending = () => useSyncExternalStore(subscribe, () => pending, () => null);

/** Links that open a gem: a real href (new tab works) that pushes ?gem= so Back closes the sheet. */
export function useGemLink() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const href = useCallback((key: string) => {
    const next = new URLSearchParams(params);
    next.set('gem', key);
    next.delete('loupe');
    return `${path}?${next}`;
  }, [params, path]);
  const open = useCallback((e: MouseEvent, key: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    pushed = true;
    setPending(key);
    router.push(href(key), { scroll: false });
  }, [href, router]);
  return { href, open, current: params.get('gem') };
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
/** Whole points, or one decimal under a point so a small edge never reads as zero. */
const pts = (n: number) => (Math.abs(n) < 1 ? Math.round(n * 10) / 10 : Math.round(n));
const possessive = (s: string) => (s.endsWith('s') ? `${s}’` : `${s}’s`);
const kickoffLabel = (iso: string, zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const kickoffFull = (iso: string, zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

/** What the header needs, from the board row while the sheet loads, then from the gem itself. */
type Head = Pick<GemDetail, 'key' | 'kind' | 'rating' | 'name' | 'teamId' | 'number' | 'position' | 'matchup' | 'kickoff' | 'price' | 'gapToPosted' | 'fresh'>;
const headOf = (r: BoardRow): Head => ({ ...r, gapToPosted: r.gap, fresh: !!r.fresh });

export function GemSheet({ rows, detail, asked, zone }: {
  rows: BoardRow[]; detail: GemDetail | null; asked: string | null; zone: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const inUrl = params.get('gem');
  const wanted = usePending();
  const key = wanted ?? inUrl;
  // Closed before its push landed: take the entry back off once it does.
  const abandoned = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  // The gem on screen: the one in the URL, or the last one while the sheet slides out after Back took it away.
  const [shown, setShown] = useState<string | null>(key);
  const [kept, setKept] = useState<GemDetail | null>(detail);
  if (key && key !== shown) setShown(key);
  if (detail && detail !== kept) setKept(detail);
  const view = key ?? shown;

  const row = view ? rows.find((r) => r.key === view) : undefined;
  const gem = detail && detail.key === view ? detail : kept && kept.key === view ? kept : null;
  const head: Head | null = gem ?? (row ? headOf(row) : null);
  const missing = key != null && asked === key && !detail;
  useCrumb(key ? (head?.name ?? null) : null);
  // Ask the Jeweler about this gem: the sheet over this page on desktop (?ask=1 keeps ?gem=), the tab on phone.
  const asking = new URLSearchParams(params);
  asking.set('ask', '1');

  // Open on a gem in the URL, close when it leaves (Back, or a link without it).
  useEffect(() => { if (wanted && inUrl === wanted) setPending(null); }, [wanted, inUrl]);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (key && key === abandoned.current) {
      abandoned.current = null;
      router.back();
      return;
    }
    if (key) {
      last.current = key;
      keepOpen(el);
      if (!el.open) {
        // Where the row sits, read before the sheet covers it; the row keeps aria-selected under the tint.
        const opener = openerOf(key);
        el.showModal();
        void rippleOpen(el, opener);
      }
      // Focus the scroll body, so arrow keys read the sheet; Tab reaches the tabs and Close.
      body.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      // A link with conditions (?loupe=) opens on the loupe.
      const loupe = new URLSearchParams(location.search).has('loupe') ? document.getElementById('gem-loupe') : null;
      body.current?.scrollTo({ top: loupe ? scrollTopFor(body.current, loupe) : 0 });
      setActive(loupe ? 'gem-loupe' : SECTIONS[0].id);
    } else if (el.open) closeSheet(el);
  }, [key, router]);

  // A click on the dimmed page, or a drag down on phone, closes it like the close button (js/sheet.mjs).
  useEffect(() => {
    const el = dialog.current;
    return el ? dismissible(el, { dismiss: () => closeSheet(el) }) : undefined;
  }, []);

  // Escape, the close button, or Back: drop ?gem= from the URL, then hand focus back to the row.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    // Escape plays the close too.
    const onCancel = (e: Event) => { e.preventDefault(); closeSheet(el); };
    const onClose = () => {
      setShown(null);
      const back = pushed;
      pushed = false;
      if (pending) {
        if (!new URLSearchParams(location.search).has('gem')) abandoned.current = pending;
        setPending(null);
      }
      if (new URLSearchParams(location.search).has('gem')) {
        if (back) router.back(); else {
          const next = new URLSearchParams(location.search);
          next.delete('gem');
          next.delete('loupe');
          router.replace(`${path}${next.size ? `?${next}` : ''}`, { scroll: false });
        }
      }
      const links = [...document.querySelectorAll<HTMLElement>(`[data-gem-link="${CSS.escape(last.current ?? '')}"]`)];
      links.find((a) => a.offsetParent !== null)?.focus();
    };
    el.addEventListener('cancel', onCancel);
    el.addEventListener('close', onClose);
    return () => { el.removeEventListener('cancel', onCancel); el.removeEventListener('close', onClose); };
  }, [path, router]);

  // The tab for the section in view. A jump keeps its tab until the scroll it started settles, since a short
  // last section can never reach the top.
  const jumping = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = () => {
    const b = body.current;
    if (!b || jumping.current) return;
    if (b.scrollTop + b.clientHeight >= b.scrollHeight - 2) { setActive(SECTIONS[SECTIONS.length - 1]!.id); return; }
    const top = b.getBoundingClientRect().top;
    let current: string = SECTIONS[0].id;
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el && el.getBoundingClientRect().top - top <= b.clientHeight / 3) current = s.id;
    }
    setActive(current);
  };
  const jump = (e: MouseEvent, id: string) => {
    e.preventDefault();
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (jumping.current) clearTimeout(jumping.current);
    jumping.current = setTimeout(() => { jumping.current = null; }, smooth ? 1000 : 100);
    const target = document.getElementById(id);
    if (target && body.current) scrollBodyTo(body.current, target, smooth ? 'smooth' : 'auto');
    setActive(id);
  };

  return (
    <dialog ref={dialog} className="fc-sheet" data-phone="full" data-motion="spring" aria-labelledby="gem-sheet-title">
      {view && (
        <>
          <header className="fc-sheet-header">
            <div className="fc-sheet-handle" aria-hidden="true" />
            <div className="fc-sheet-titlebar">
              <div className="fc-sheet-titles">
                <h2 id="gem-sheet-title" className="fc-sheet-title">
                  {head ? (
                    <Player name={head.name} teamId={head.teamId} number={head.number} size="lg"
                      detail={<>{[head.position, 'Anytime TD', head.matchup].filter(Boolean).join(' · ')} · <time dateTime={head.kickoff} title={kickoffFull(head.kickoff, zone)}>{kickoffLabel(head.kickoff, zone)}</time></>} />
                  ) : missing ? 'Gem not found' : <span className="fc-skeleton" style={{ height: 'var(--fc-space-12)', width: 'calc(var(--fc-space-32) * 2)' }}>Loading</span>}
                </h2>
              </div>
              <button type="button" className="fc-button fc-sheet-close" data-variant="tertiary" data-size="small" data-shape="square" aria-label="Close"
                onClick={() => { if (dialog.current) closeSheet(dialog.current); }}>{X}</button>
            </div>
            {head && (
              <div className="fc-sheet-badges">
                <GemMark kind={head.kind} rating={head.rating} size="lg" />
                <span className="fc-price text-label-14">{head.price.toFixed(2)}</span>
                <Edge pts={pts(head.gapToPosted)} />
                {head.fresh && <span className="fc-badge" data-variant="purple" data-size="sm" data-contrast="low">New</span>}
              </div>
            )}
          </header>
          {!missing && (
            <nav className="fc-tabs fc-sheet-tabs" aria-label="Gem sections">
              {SECTIONS.map((s) => (
                <a key={s.id} className="fc-tab" href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined} onClick={(e) => jump(e, s.id)}>{s.tab}</a>
              ))}
            </nav>
          )}
          <div className="fc-sheet-body" ref={body} onScroll={onScroll} tabIndex={-1}>
            {gem ? <Sections gem={gem} zone={zone} /> : missing ? (
              <div className="fc-empty"><strong>This gem is no longer on the board</strong></div>
            ) : (
              <div className="fc-stack" aria-busy="true">
                <span className="fc-skeleton" style={{ height: 'var(--fc-space-24)' }} />
                <span className="fc-skeleton" style={{ height: 'var(--fc-space-32)' }} />
              </div>
            )}
          </div>
          <footer className="fc-sheet-footer">
            <Link className="fc-button hg-desktop-only" data-variant="secondary" data-size="small" href={`${path}?${asking}`} scroll={false}>{CHAT}Ask the Jeweler</Link>
            <Link className="fc-button hg-phone-only" data-variant="secondary" data-size="small" href={`/jeweler?gem=${encodeURIComponent(view)}`}>{CHAT}Ask the Jeweler</Link>
            {head && !missing && (
              <SlipButton row={{ key: head.key, name: head.name, kind: head.kind, started: Date.parse(head.kickoff) <= Date.now() }} place="footer" />
            )}
          </footer>
        </>
      )}
    </dialog>
  );
}

function Sections({ gem, zone }: { gem: GemDetail; zone: string }) {
  const same = Math.round(gem.priced * 100) === Math.round(gem.hitChance * 100);
  const show = (p: number) => (same ? `${(p * 100).toFixed(1)}%` : pct(p));
  const share = Math.min(1, Math.max(0, gem.carat / FULL_CARAT));
  const caratPts = Math.round(gem.carat * 10) / 10;
  return (
    <>
      <section id="gem-overview" className="fc-sheet-section" aria-label="Overview">
        <div className="fc-stat-strip fc-card" role="group" aria-label="Price and read">
          <div className="fc-stat"><p className="fc-stat-label">Priced</p><p className="fc-stat-value">{show(gem.priced)}</p><p className="fc-stat-detail">{gem.price.toFixed(2)} at {gem.book}</p></div>
          <div className="fc-stat"><p className="fc-stat-label">Our est.</p><p className="fc-stat-value">{show(gem.hitChance)}</p><p className="fc-stat-detail">Clarity {gem.clarity}</p></div>
          <div className="fc-stat">
            <p className="fc-stat-label">Edge</p>
            <p className="fc-stat-value"><Edge pts={pts(gem.gapToPosted)} /></p>
            {gem.gapToPosted > 0 && <p className="fc-stat-detail">Clears the cut</p>}
          </div>
        </div>
        <p className="fc-runin text-copy-14">
          <strong>Why two prices.</strong> Without {possessive(gem.book)} cut, the fair price is {(1 / gem.fair).toFixed(2)}, a {pct(gem.fair)} shot.
        </p>
        <dl className="fc-description" data-compact aria-label="Rating">
          <div>
            <dt>Rating</dt>
            {gem.rating != null ? (
              <dd>{gem.rating}<small>Gap to fair, as a share of {FULL_CARAT} pts, times clarity</small></dd>
            ) : (
              <dd>None<small>{gem.kind === 'unrated' ? 'No 2026 stats, so the market stands' : 'Does not clear the posted price'}</small></dd>
            )}
          </div>
          <div>
            <dt>Gap to fair</dt>
            <dd><Edge pts={caratPts} /><small>{gem.carat > 0 ? `Counts ${pct(share)}, full at ${FULL_CARAT} pts` : 'Counts nothing'}</small></dd>
          </div>
          {gem.best && <div><dt>Best price</dt><dd>{gem.best.price.toFixed(2)} at {gem.best.book}</dd></div>}
        </dl>
        <PriceChart appraisal={gem.appraisal} book={gem.book} kickoff={gem.kickoff} now={gem.now} zone={zone} />
      </section>

      <section id="gem-notes" className="fc-sheet-section" aria-label="Notes">
        <div className="hg-blocks">
          <div className="fc-stack">
            <h3 id="gem-adds-h" className="text-heading-20">Adds and costs</h3>
            <GemNotes notes={gem.notes} now={gem.now} zone={zone} labelledBy="gem-adds-h" />
          </div>
          <div className="fc-stack">
            <h3 id="gem-notes-h" className="text-heading-20">What the numbers miss</h3>
            <TrendLines trends={gem.trends} loupe={gem.loupe} labelledBy="gem-notes-h" />
          </div>
        </div>
      </section>

      <section id="gem-loupe" className="fc-sheet-section" aria-labelledby="gem-loupe-h">
        <h3 id="gem-loupe-h" className="text-heading-20">The loupe</h3>
        {gem.loupe ? <LoupeView loupe={gem.loupe} log={gem.log} /> : gem.log.season.games ? (
          <>
            <GameLog log={gem.log} />
            <GameLogKey />
          </>
        ) : (
          <div className="fc-empty"><strong>No games this season yet</strong></div>
        )}
      </section>

      <section id="gem-context" className="fc-sheet-section" aria-labelledby="gem-context-h">
        <h3 id="gem-context-h" className="text-heading-20">Core sample and conditions</h3>
        {gem.sample ? <CoreSampleTable sample={gem.sample} team={gem.teamId?.toUpperCase() ?? null} /> : <div className="fc-empty"><strong>No games this season yet</strong></div>}
        <ConditionsList conditions={gem.conditions} now={gem.now} />
      </section>
    </>
  );
}
