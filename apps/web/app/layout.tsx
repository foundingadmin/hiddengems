import '@foundingcreative/facet/css/facet.css';
import '@foundingcreative/facet/kits/nfl/teams.css';
import './app.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Freshness } from '@/components/freshness';
import { Shell } from '@/components/shell';
import { newGemCount, weeks } from '@/lib/board';

export const metadata: Metadata = {
  title: { default: 'Hidden Gems', template: '%s · Hidden Gems' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [w, newCount] = await Promise.all([weeks(), newGemCount()]);
  return (
    <html lang="en">
      <body>
        <a className="fc-visually-hidden" href="#main">Skip to content</a>
        <Shell foot={<Freshness label="Odds pulled" />} weeks={w} newCount={newCount}>{children}</Shell>
      </body>
    </html>
  );
}
