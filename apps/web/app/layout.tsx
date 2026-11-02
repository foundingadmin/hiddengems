import '@foundingcreative/facet/css/facet.css';
import '@foundingcreative/facet/kits/nfl/teams.css';
import './app.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: { default: 'Hidden Gems', template: '%s · Hidden Gems' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="fc-visually-hidden" href="#main">Skip to content</a>
        <header className="hg-top">
          <div className="fc-page hg-top-inner">
            <Link className="hg-brand" href="/">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" opacity=".35" /><path d="M12 21 7.5 9h9z" /></svg>
              <strong className="text-label-16">Hidden Gems</strong>
            </Link>
            <Nav />
          </div>
        </header>
        <main id="main" className="fc-page hg-main">{children}</main>
      </body>
    </html>
  );
}
