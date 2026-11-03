'use client';
// The rail slip's play, as the certificate names it: "Suggested parlay", or for your own play "Single", "3 leg
// parlay". When a gem is added the count pops (packages/facet/components/rail-slip.md, Facet's
// .fc-railslip-count[data-pop]): a new element per count, so the animation plays once per change.
import { useState } from 'react';

export function SlipKind({ n, suggested }: { n: number; suggested: boolean }) {
  const [shown, setShown] = useState(n);
  const [pop, setPop] = useState(false);
  if (n !== shown) { setShown(n); setPop(n > shown); }
  if (suggested) return <>Suggested {n === 1 ? 'single' : 'parlay'}</>;
  if (n === 1) return <>Single</>;
  return <><span key={n} className="fc-railslip-count" data-pop={pop ? '' : undefined}>{n}</span> leg parlay</>;
}
