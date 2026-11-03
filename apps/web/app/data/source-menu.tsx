'use client';
// A source's overflow menu on Data health (Facet components/schedule.md "Menu"): View runs, then Pause or Resume
// its scheduled runs. Pull now stays a button on the row. The status cell shows Pausing or Resuming at once.
import { useRouter } from 'next/navigation';
import { Dropdown } from '@/components/dropdown';
import { setPaused } from './actions';
import { usePulls } from './pulls';

const MORE = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
);

export function SourceMenu({ job, label, paused, canPause }: { job: string; label: string; paused: boolean; canPause: boolean }) {
  const router = useRouter();
  const { setSaving } = usePulls();
  const items = [
    { value: 'runs', label: 'View runs', href: `/data/logs?source=${encodeURIComponent(job)}` },
    ...(canPause ? [{ value: paused ? 'resume' : 'pause', label: paused ? 'Resume scheduled runs' : 'Pause scheduled runs' }] : []),
  ];
  return (
    <Dropdown
      actions align="end" label={`Actions for ${label}`} items={items}
      trigger={MORE} triggerClass="fc-button" triggerProps={{ 'data-variant': 'tertiary', 'data-size': 'small', 'data-shape': 'square', 'aria-label': `More actions for ${label}` }}
      onSelect={async (v) => {
        const pause = v === 'pause';
        setSaving(job, pause ? 'Pausing' : 'Resuming');
        try { await setPaused(job, pause); router.refresh(); } finally { setTimeout(() => setSaving(job, null), 600); }
      }}
    />
  );
}
