import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { JewelerChat } from '@/components/jeweler';
import { JEWELER } from '@/lib/features';
import { jewelerView } from '@/lib/jeweler';

export const metadata: Metadata = { title: 'Ask the Jeweler' };

export default async function JewelerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!JEWELER) redirect('/');
  const { gem } = await searchParams;
  const gemId = typeof gem === 'string' && gem ? gem : null;
  const view = await jewelerView(gemId);
  return (
    <>
      <h1 className="fc-visually-hidden">Ask the Jeweler</h1>
      <JewelerChat key={gemId ?? ''} initial={view} frame="page" />
    </>
  );
}
