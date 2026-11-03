'use client';
// The Facet app shell (packages/facet/components/app-shell.md): the rail holds Gems and Slips, with
// Ask the Jeweler pinned at the bottom and freshness in the foot (docs/build-brief.md, Navigation).
// Under 768px the rail opens as a sheet from the menu button.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const GEM = icon(<><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>);
const SLIP = icon(<><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></>);
const CHAT = icon(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />);

const TITLES: Record<string, string> = { '/': 'Gems', '/slips': 'Slips', '/jeweler': 'Ask the Jeweler', '/data': 'Data health', '/settings/rating-lab': 'Rating lab' };
/** Settings sections (packages/facet/patterns/settings.md): one route each; the rail drills into them. */
const SETTINGS = [{ href: '/settings/rating-lab', label: 'Rating lab' }, { href: '/data', label: 'Data health' }];
const LEFT = icon(<path d="m15 18-6-6 6-6" />);
const GEAR = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>);

export function Shell({ children, foot }: { children: ReactNode; foot: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const inSettings = path.startsWith('/settings') || path === '/data';
  const item = (href: string, label: string, glyph: ReactNode) => (
    <li>
      <Link className="fc-sidenav-item" href={href} aria-current={path === href ? 'page' : undefined}>{glyph}<span>{label}</span></Link>
    </li>
  );
  return (
    <div className="fc-shell" data-nav={open ? 'open' : undefined}>
      <aside className="fc-sidenav" id="main-nav" aria-label="Main navigation">
        <div className="fc-sidenav-head">{GEM}Hidden Gems</div>
        {inSettings ? (
          <nav className="fc-sidenav-level" aria-labelledby="settings-nav-t">
            <div className="fc-sidenav-back">
              <Link className="fc-button" data-variant="tertiary" data-size="small" data-shape="square" href="/" aria-label="Back to main navigation">{LEFT}</Link>
              <span id="settings-nav-t">Settings</span>
            </div>
            <ul className="fc-sidenav-list" role="list">
              {SETTINGS.map((s) => <li key={s.href}><Link className="fc-sidenav-item" href={s.href} aria-current={path === s.href ? 'page' : undefined}><span>{s.label}</span></Link></li>)}
            </ul>
          </nav>
        ) : (
          <nav className="fc-sidenav-level" aria-label="Main">
            <ul className="fc-sidenav-list" role="list">
              {item('/', 'Gems', GEM)}
              {item('/slips', 'Slips', SLIP)}
            </ul>
            <hr className="fc-sidenav-rule" />
            <ul className="fc-sidenav-list" role="list">{item(SETTINGS[0]!.href, 'Settings', GEAR)}</ul>
          </nav>
        )}
        <div className="hg-rail-spacer" />
        <ul className="fc-sidenav-list" role="list">{item('/jeweler', 'Ask the Jeweler', CHAT)}</ul>
        <div className="fc-sidenav-foot">{foot}</div>
      </aside>
      <div className="fc-shell-main">
        <header className="fc-topbar">
          <div className="fc-topbar-start">
            <button
              type="button" className="fc-button fc-shell-toggle" data-variant="tertiary" data-size="small" data-shape="square"
              aria-label="Menu" aria-controls="main-nav" aria-expanded={open} onClick={() => setOpen((o) => !o)}
            >
              {icon(open ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>)}
            </button>
          </div>
          <nav className="fc-breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {inSettings && <li><Link href={SETTINGS[0]!.href}>Settings</Link></li>}
              <li><span aria-current="page">{TITLES[path] ?? 'Hidden Gems'}</span></li>
            </ol>
          </nav>
        </header>
        <main id="main" className="fc-shell-content">{children}</main>
      </div>
    </div>
  );
}
