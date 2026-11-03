// Facet encodings as React: player tile and number, gem rating, edge, run status.
// Markup mirrors packages/facet (css/teams.css, css/components.css); see packages/facet/patterns/hidden-gems.md.
import { findTeam } from '@hiddengems/core';
import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { points } from '@/lib/format';

/** link puts the name in a row link (packages/facet, .fc-row-link) that opens the row's record. */
export function Player({ name, teamId, number, detail, badge, size = 'sm', link }: {
  name: string; teamId: string | null; number: number | null; detail: ReactNode; badge?: ReactNode; size?: 'sm' | 'lg';
  link?: AnchorHTMLAttributes<HTMLAnchorElement> & Record<`data-${string}`, string>;
}) {
  const team = teamId ? findTeam(teamId) : null;
  return (
    <span className="fc-player" data-size={size === 'lg' ? 'lg' : undefined}>
      {team
        ? <span className="fc-player-avatar" data-team={team.id} data-size={size} role="img" aria-label={`${team.city} ${team.name}`} />
        : <span className="fc-player-avatar" data-size={size} aria-hidden="true" />}
      <span className="fc-player-main">
        <span className="fc-player-line">
          {link ? <a className="fc-player-name fc-row-link" {...link}>{name}</a> : <span className="fc-player-name">{name}</span>}
          {number != null && (
            <span className="fc-player-number"><span aria-hidden="true">#{number}</span><span className="fc-visually-hidden">, number {number}</span></span>
          )}
          {badge}
        </span>
        <span className="fc-player-meta">{detail}</span>
      </span>
    </span>
  );
}

const GEM_PATHS = (
  <svg viewBox="0 0 24 22" aria-hidden="true">
    <path className="fc-gem-fill" d="M6 1h12l5 7-11 13L1 8Z" />
    <path className="fc-gem-cut" d="M1 8h22M8.5 1 6.5 8l5.5 13 5.5-13-2-7" />
  </svg>
);

/** The gem rating mark (packages/facet, .fc-gem): one 0 to 100 number, purple deepening with it.
 * Fool's Gold is the hollow dashed gem with its label, never purple. bare leaves the label out, for a row
 * too narrow to hold it that shows FoolsLabel beside the name instead. */
export function GemMark({ kind, rating, delay, size, bare }: { kind: string; rating: number | null; delay?: number; size?: 'lg' | 'stat'; bare?: boolean }) {
  if (kind === 'fools-gold') {
    if (bare) return <span className="fc-gem" data-fools aria-hidden="true">{GEM_PATHS}</span>;
    return (
      <span className="hg-gem-cell">
        <span className="fc-gem" data-fools aria-hidden="true">{GEM_PATHS}</span>
        <FoolsLabel />
      </span>
    );
  }
  if (rating == null) return <span><span aria-hidden="true">{'\u2013'}</span><span className="fc-visually-hidden">No rating</span></span>;
  const style = { '--rating': rating, ...(delay != null ? { '--fc-gem-delay': `${delay}ms` } : {}) } as CSSProperties;
  return (
    <span className="fc-gem" data-live data-size={size} style={style}>
      {GEM_PATHS}<span><span className="fc-visually-hidden">Gem rating </span>{rating}</span>
    </span>
  );
}

export function FoolsLabel() {
  return <span className="fc-gem-fools text-label-12">Fool&apos;s Gold</span>;
}

export function Edge({ pts }: { pts: number }) {
  const direction = pts > 0 ? 'positive' : pts < 0 ? 'negative' : 'neutral';
  return <span className="fc-delta" data-direction={direction}>{points(pts)}</span>;
}

/** Run status as dot plus word. A provider outage reads amber "Provider down", never red. */
export function RunStatus({ status, owner }: { status: string; owner: string | null }) {
  if (status === 'failed' && owner === 'provider') return <span className="fc-level" data-level="warning">Provider down</span>;
  const map: Record<string, [string, string]> = {
    succeeded: ['success', 'Succeeded'], warned: ['warning', 'Warned'], failed: ['error', 'Failed'], running: ['info', 'Running'],
  };
  const [level, word] = map[status] ?? ['info', status];
  return <span className="fc-level" data-level={level}>{word}</span>;
}
