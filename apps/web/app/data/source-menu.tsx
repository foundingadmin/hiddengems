'use client';
// A source's overflow menu on Data health (Facet patterns/connections.md, components/schedule.md "Menu"):
// View runs, View usage, then Pause or Resume its scheduled runs. Pull now stays a button on the row.
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Dropdown } from '@/components/dropdown';
import { setPaused } from './actions';

const MORE = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
);

export function SourceMenu({ job, label, paused, canPause }: { job: string; label: string; paused: boolean; canPause: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const items = [
    { value: 'runs', label: 'View runs' },
    { value: 'usage', label: 'View usage' },
    ...(canPause ? [{ value: paused ? 'resume' : 'pause', label: paused ? 'Resume scheduled runs' : 'Pause scheduled runs' }] : []),
  ];
  return (
    <Dropdown
      actions align="end" label={`Actions for ${label}`} items={items}
      trigger={MORE} triggerClass="fc-button" triggerProps={{ 'data-variant': 'tertiary', 'data-size': 'small', 'data-shape': 'square', 'aria-label': `More actions for ${label}` }}
      onSelect={(v) => {
        if (v === 'runs') router.push(`/data/logs?source=${encodeURIComponent(job)}`);
        else if (v === 'usage') router.push('/data/usage');
        else start(async () => { await setPaused(job, v === 'pause'); router.refresh(); });
      }}
    />
  );
}
