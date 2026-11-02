import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Slips' };

export default function SlipsPage() {
  return (
    <>
      <h1 className="fc-visually-hidden">Slips</h1>
      <div className="fc-empty">
        <strong>No slip yet</strong>
        <span className="text-copy-14">Gems you add to a slip show up here, with the chance of losing it all.</span>
      </div>
    </>
  );
}
