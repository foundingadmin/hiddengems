'use client';
// The Gems page body (docs/build-brief.md, Gems): the New gems row, then All gems with its filter bar.
// Filters, sort and the open gem live in the URL (?q, ?window, ?fools, ?sort, ?gem), so a view survives refresh and can be shared.
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';
import { betLabel } from '@hiddengems/core';
import { markRead } from '@/app/gems-actions';
import { SlipButton, useSlip } from '@/components/add-to-slip';
import { Dropdown } from '@/components/dropdown';
import { useGemLink } from '@/components/gem-sheet';
import { Edge, FoolsLabel, GemMark, Player } from '@/components/marks';
import { SEARCH_EVENT } from '@/components/shell';
import type { BoardRow } from '@/lib/board';
import { readDelay, sweepRead, unsweepRead } from '@/lib/moments/mark-read';
import { newestKey, orbitNewest } from '@/lib/moments/newest';
import { useMoments } from '@/lib/moments/provider';

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CHECK = svg(<path d="M20 6 9 17l-5-5" />);
const PLUS = svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const X = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const SEARCH = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
const FILTER = svg(<><path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" /></>);
const SORT = svg(<><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M11 4h10" /><path d="M11 8h7" /><path d="M11 12h4" /></>);
const LEFT = svg(<path d="m15 18-6-6 6-6" />);
const RIGHT = svg(<path d="m9 18 6-6-6-6" />);

const SORTS = {
  recommended: { label: 'Recommended', caption: 'Recommended: likeliest real gems first, Fool’s Gold last' },
  rating: { label: 'Rating', caption: 'Highest rating first' },
  edge: { label: 'Edge', caption: 'Largest edge first' },
  kickoff: { label: 'Kickoff', caption: 'Earliest kickoff first' },
  price: { label: 'Price', caption: 'Longest price first' },
} as const;
type SortKey = keyof typeof SORTS;
const WINDOW_ORDER = ['Thursday', 'Friday', 'Saturday', 'Morning', 'Afternoon', 'Night', 'Monday'];

const kickoffTime = (iso: string, zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const kickoffFull = (iso: string, zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
const pct = (p: number) => `${Math.round(p * 100)}%`;
const detail = (r: BoardRow) => [r.position, r.matchup].filter(Boolean).join(' · ');
/** The prop is the gem: every card and row names its bet. */
const bet = (r: BoardRow) => betLabel(r.marketId);

function Kickoff({ iso, zone }: { iso: string; zone: string }) {
  return <time className="text-copy-13-mono" dateTime={iso} title={kickoffFull(iso, zone)}>{kickoffTime(iso, zone)}</time>;
}

export function NewGems({ rows, since, zone }: { rows: BoardRow[]; since: string | null; zone: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const moments = useMoments();
  const slip = useSlip();
  const [pending, start] = useTransition();
  // Gems read here and not yet confirmed by the server, with when each card's tint fades (packages/facet
  // patterns/moments.md: state first, the motion follows, a failure puts it back).
  const [reading, setReading] = useState<Map<string, string>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const newest = useMemo(() => newestKey(rows), [rows]);
  const orbiting = newest && !reading.has(newest) ? newest : null;
  // Once the server has answered, read gems leave the row; forget them so a gem that turns new again shows it.
  useEffect(() => setReading((m) => {
    const live = new Set(rows.map((r) => r.key));
    const next = new Map([...m].filter(([k]) => live.has(k)));
    return next.size === m.size ? m : next;
  }), [rows]);
  useEffect(() => {
    const card = orbiting ? cards.current.get(orbiting) : null;
    if (!card || !wrap.current) return;
    return orbitNewest(card, wrap.current);
  }, [orbiting]);
  if (!rows.length) return null;
  const read = (keys: string[]) => {
    const els = keys.flatMap((k) => cards.current.get(k) ?? []);
    setReading((m) => new Map([...m, ...keys.map((k, i) => [k, readDelay(i)] as const)]));
    const swept = sweepRead(moments.stage(), els);
    const left = rows.filter((r) => !reading.has(r.key) && !keys.includes(r.key)).length;
    // A refused or failed read puts the shine back and says why (role="alert" below speaks it).
    const undo = (why: string) => {
      setReading((m) => { const next = new Map(m); for (const k of keys) next.delete(k); return next; });
      void unsweepRead(moments.stage(), els);
      setError(why);
    };
    setError(null);
    start(async () => {
      try {
        // The row keeps its cards until their clouds have passed (under a second; at once under reduced motion),
        // so no cloud is left drawing over the table once the server's answer removes them.
        const [r] = await Promise.all([markRead(keys), swept]);
        if (!r.ok) return undo(r.error);
        moments.announce(left ? `${left} new ${left === 1 ? 'gem' : 'gems'}` : 'No new gems');
      } catch {
        undo(keys.length > 1 ? 'Couldn’t mark them read. Try again.' : 'Couldn’t mark it read. Try again.');
      }
    });
  };
  const scroll = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="hg-section" aria-labelledby="new-h">
      <div className="fc-section-head">
        <div>
          <h2 id="new-h" className="text-heading-24">New gems</h2>
          <p className="text-copy-14 hg-secondary">
            {rows.length} {since ? <>since your last look, {since}</> : rows.length === 1 ? 'gem' : 'gems'}. Unread ones clear at kickoff.
          </p>
          {error && <span className="fc-helper" data-type="error" role="alert">{error}</span>}
        </div>
        <div className="fc-section-head-actions">
          <button type="button" className="fc-button" data-variant="tertiary" data-size="small" disabled={pending}
            onClick={() => read(rows.filter((r) => !reading.has(r.key)).map((r) => r.key))}>Mark all read</button>
          <span className="hg-desktop-only fc-section-head-actions">
            <button type="button" className="fc-button" data-variant="secondary" data-size="small" data-shape="square" aria-label="Scroll back" onClick={() => scroll(-1)}>{LEFT}</button>
            <button type="button" className="fc-button" data-variant="secondary" data-size="small" data-shape="square" aria-label="Scroll forward" onClick={() => scroll(1)}>{RIGHT}</button>
          </span>
        </div>
      </div>
      <div className="fc-strip-wrap" ref={wrap}>
        <div className="fc-strip" role="list" ref={strip}>
          {rows.map((r, i) => (
            <article key={r.key} className="fc-gem-card fc-card" role="listitem"
              aria-label={`${r.name}, new gem${slip.has(r.key) ? ', on your slip' : ''}`}
              ref={(el) => { if (el) cards.current.set(r.key, el); else cards.current.delete(r.key); }}
              data-unread={reading.has(r.key) ? undefined : ''} data-selected={slip.has(r.key) ? '' : undefined}
              style={reading.has(r.key) ? { ['--fc-state-delay' as string]: reading.get(r.key) } : undefined}>
              <div className="fc-gem-card-head">
                <GemMark kind={r.kind} rating={r.rating} size="lg" delay={i * 160} />
                <Player name={r.name} teamId={r.teamId} number={r.number} detail={[bet(r), r.position, r.matchup].filter(Boolean).join(' · ')} />
                <span className="fc-stack hg-end hg-desktop-only" style={{ ['--fc-gap' as string]: 'var(--fc-space-1)' }}>
                  <span className="fc-price text-label-14">{r.price.toFixed(2)}</span>
                  <Edge pts={Math.round(r.gap)} />
                </span>
              </div>
              <div className="fc-stack" style={{ ['--fc-gap' as string]: 'var(--fc-space-2)' }}>
                <h3 className="text-heading-14">Why it&apos;s a gem</h3>
                <ul className="fc-why text-copy-14">{r.reasons.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              <div className="fc-gem-card-foot">
                <span className="hg-phone-only hg-card-price">
                  <span className="fc-price text-label-14">{r.price.toFixed(2)}</span>
                  <Edge pts={Math.round(r.gap)} />
                </span>
                <span className="text-label-13 hg-desktop-only">
                  {r.fresh?.kind === 'jumped' ? `Jumped ${r.fresh.from} to ${r.rating}` : `Found ${r.fresh?.at ?? ''}`}
                </span>
                <button type="button" className="fc-button" data-variant="tertiary" data-size="small" disabled={pending || reading.has(r.key)}
                  onClick={() => read([r.key])}>{CHECK}Mark read</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AllGems({ rows, zone, freshness }: { rows: BoardRow[]; zone: string; freshness: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const search = useRef<HTMLInputElement>(null);
  const gemLink = useGemLink();
  const slip = useSlip();
  const q = params.get('q') ?? '';
  const win = params.get('window');
  const hideFools = params.get('fools') === 'hide';
  const sort = (params.get('sort') ?? 'recommended') as SortKey;
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) if (v === null || v === '') next.delete(k); else next.set(k, v);
    router.replace(`${path}${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  // Under 768px search hides until the top bar's search button opens it (SEARCH_EVENT, or #search from another page).
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const open = () => { flushSync(() => setSearching(true)); search.current?.focus(); };
    if (location.hash === '#search') { setSearching(true); requestAnimationFrame(() => search.current?.focus()); }
    window.addEventListener(SEARCH_EVENT, open);
    return () => window.removeEventListener(SEARCH_EVENT, open);
  }, []);

  const windows = useMemo(() => [...new Set(rows.map((r) => r.window))].sort((a, b) => WINDOW_ORDER.indexOf(a) - WINDOW_ORDER.indexOf(b)), [rows]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => (!needle || `${r.name} ${r.matchup}`.toLowerCase().includes(needle))
      && (!win || r.window === win) && (!hideFools || r.kind !== 'fools-gold'));
    const by: Record<SortKey, (a: BoardRow, b: BoardRow) => number> = {
      recommended: (a, b) => a.recommended - b.recommended,
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.recommended - b.recommended,
      edge: (a, b) => b.gap - a.gap,
      kickoff: (a, b) => a.kickoff.localeCompare(b.kickoff) || a.recommended - b.recommended,
      price: (a, b) => b.price - a.price,
    };
    return out.sort(by[sort] ?? by.recommended);
  }, [rows, q, win, hideFools, sort]);
  const gems = rows.filter((r) => r.kind === 'gem').length;
  const tip = (text: string, tipText: string) => <span className="fc-has-tip" tabIndex={0} data-tip={tipText}>{text}</span>;

  return (
    <section className="hg-section" aria-labelledby="all-h">
      <div className="fc-section-head">
        <div><h2 id="all-h" className="text-heading-24">All gems</h2></div>
        <div className="fc-section-head-actions">{freshness}</div>
      </div>
      <div className="fc-filter-bar" data-phone="scroll" role="search" aria-label="Filter gems">
        <label className="fc-filter-search" data-open={searching || q ? '' : undefined}>
          {SEARCH}
          <span className="fc-visually-hidden">Search players</span>
          <input ref={search} id="search" className="fc-input" data-size="small" type="search" placeholder="Search players…" autoComplete="off"
            defaultValue={q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <Dropdown
          label="Add filter" triggerClass="fc-button" triggerProps={{ 'data-variant': 'secondary', 'data-size': 'small', 'data-shape': 'rounded' }}
          trigger={<>{FILTER}<span className="fc-filter-add-label">Add filter</span></>}
          items={[...windows.map((w) => ({ value: `window:${w}`, label: w, group: w === windows[0] ? 'Window' : undefined })),
            { value: 'fools', label: 'Hide Fool’s Gold', group: 'Fool’s Gold' }]}
          value={win ? `window:${win}` : null}
          onSelect={(v) => (v === 'fools' ? set({ fools: 'hide' }) : set({ window: v.slice(7) }))}
        />
        <div className="fc-filter-scroll">
          <span className="fc-filter-chip" data-state="readonly"><span className="fc-filter-key">Market</span><span className="fc-filter-value">Anytime TD</span></span>
          {win ? (
            <span className="fc-filter-chip">
              <span className="fc-filter-edit"><span className="fc-filter-key">Window</span><span className="fc-filter-value">{win}</span></span>
              <button type="button" className="fc-filter-remove" aria-label={`Remove window ${win}`} onClick={() => set({ window: null })}>{X}</button>
            </span>
          ) : windows.length > 1 && (
            <button type="button" className="fc-filter-chip" data-state="suggested" onClick={() => set({ window: windows[0]! })}>
              {PLUS}<span className="fc-filter-key">Window</span><span className="fc-filter-value">{windows[0]}</span>
            </button>
          )}
          {hideFools ? (
            <span className="fc-filter-chip">
              <span className="fc-filter-edit"><span className="fc-filter-value">Fool&apos;s Gold hidden</span></span>
              <button type="button" className="fc-filter-remove" aria-label="Show Fool's Gold" onClick={() => set({ fools: null })}>{X}</button>
            </span>
          ) : (
            <button type="button" className="fc-filter-chip" data-state="suggested" onClick={() => set({ fools: 'hide' })}>
              {PLUS}<span className="fc-filter-key">Hide</span><span className="fc-filter-value">Fool&apos;s Gold</span>
            </button>
          )}
          <label className="fc-filter-sort">
            {SORT}
            <span className="fc-visually-hidden">Sort</span>
            <select className="fc-select" data-size="small" value={sort} onChange={(e) => set({ sort: e.target.value === 'recommended' ? null : e.target.value })}>
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {gems === 0 && rows.length > 0 && (
        <div className="fc-note" data-size="small"><span>Nothing clears the posted price right now. The Fool&apos;s Gold below looks good, but the book&apos;s cut eats it.</span></div>
      )}
      {shown.length === 0 ? (
        <div className="fc-empty">
          <strong>{rows.length ? 'No gems match' : 'No gems yet'}</strong>
          <span className="text-copy-14">{rows.length ? 'Clear a filter to see more.' : 'The board fills in after the next odds snapshot.'}</span>
        </div>
      ) : (
        <>
          <div className="fc-table-wrap hg-desktop-only">
            <table className="fc-table" data-interactive data-sticky>
              <caption className="fc-visually-hidden">{SORTS[sort]?.caption ?? SORTS.recommended.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{tip('Rating', 'Edge over the fair price times clarity, 0 to 100. Only props that clear the posted price get one')}</th>
                  <th scope="col" data-grow>Pick<span className="fc-th-count">{shown.length === rows.length ? rows.length : `${shown.length} of ${rows.length}`}</span></th>
                  <th scope="col">Bet</th>
                  <th scope="col">Kickoff</th>
                  <th scope="col" data-align="numeric">Price</th>
                  <th scope="col" data-align="numeric">{tip('Priced', 'The chance the DraftKings price implies, cut included')}</th>
                  <th scope="col" data-align="numeric">{tip('Our est.', 'Our hit chance: the v3.0 model blended with the fair price')}</th>
                  <th scope="col" data-align="numeric">{tip('Edge', 'Our estimate minus the priced chance. Above zero clears the cut')}</th>
                  <th scope="col" data-align="numeric">{tip('Clarity', 'Confidence in the read, 0 to 100: sample, consistency, books agreeing, setup')}</th>
                  <th scope="col"><span className="fc-visually-hidden">Slip</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.key} className={r.started ? 'hg-started' : undefined} aria-selected={gemLink.current === r.key ? true : undefined}
                    data-checked={slip.has(r.key) ? '' : undefined}>
                    <td><GemMark kind={r.kind} rating={r.rating} delay={(shown.length - 1 - i) * 160} /></td>
                    <th scope="row">
                      <Player name={r.name} teamId={r.teamId} number={r.number} detail={detail(r)}
                        link={{ href: gemLink.href(r.key), onClick: (e) => gemLink.open(e, r.key), 'data-gem-link': r.key }}
                        badge={r.fresh ? <span className="fc-badge" data-variant="purple" data-size="sm" data-contrast="low">New</span> : null} />
                    </th>
                    <td data-nowrap>{bet(r)}</td>
                    <td><Kickoff iso={r.kickoff} zone={zone} /></td>
                    <td data-align="numeric">{r.price.toFixed(2)}</td>
                    <td data-align="numeric">{pct(r.priced)}</td>
                    <td data-align="numeric">{pct(r.hitChance)}</td>
                    <td data-align="numeric"><Edge pts={Math.round(r.gap)} /></td>
                    <td data-align="numeric">{r.clarity}</td>
                    <td><SlipButton row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="fc-gem-list hg-phone-only" aria-label={SORTS[sort]?.caption}>
            {shown.map((r) => (
              <li key={r.key} className="fc-gem-item" data-checked={slip.has(r.key) ? '' : undefined}>
                <a className="fc-gem-row" href={gemLink.href(r.key)} onClick={(e) => gemLink.open(e, r.key)} data-gem-link={r.key}>
                  <GemMark kind={r.kind} rating={r.rating} bare />
                  <Player name={r.name} teamId={r.teamId} number={r.number}
                    detail={<>{bet(r)} · <Kickoff iso={r.kickoff} zone={zone} /> · {r.matchup}</>}
                    badge={r.kind === 'fools-gold' ? <FoolsLabel />
                      : r.fresh ? <span className="fc-badge" data-variant="purple" data-size="sm" data-contrast="low">New</span> : null} />
                  <span className="fc-gem-row-end">
                    <span className="fc-price text-label-14">{r.price.toFixed(2)}</span>
                    <Edge pts={Math.round(r.gap)} />
                  </span>
                </a>
                <SlipButton row={r} place="icon" />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
