import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ask the Jeweler' };

export default function JewelerPage() {
  return (
    <>
      <h1 className="fc-visually-hidden">Ask the Jeweler</h1>
      <div className="fc-empty">
        <strong>The Jeweler is not connected yet</strong>
        <span className="text-copy-14">It will answer questions about any gem or slip with the app&apos;s own numbers. It never places anything.</span>
      </div>
    </>
  );
}
