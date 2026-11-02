// Facet encodings as React: player tile and number, signal strip, verdict, gem tier, edge, level.
// Markup mirrors packages/facet (css/teams.css, css/components.css); see packages/facet/patterns/hidden-gems.md.
import { SIGNALS, type Signals, findTeam, signalSummary } from '@hiddengems/core';
import { points } from '@/lib/format';

export function Player({ name, teamId, number, detail }: { name: string; teamId: string | null; number: number | null; detail: string }) {
  const team = teamId ? findTeam(teamId) : null;
  return (
    <span className="fc-player">
      {team
        ? <span className="fc-player-avatar" data-team={team.id} data-size="sm" role="img" aria-label={`${team.city} ${team.name}`} />
        : <span className="fc-player-avatar" data-size="sm" aria-hidden="true" />}
      <span className="fc-player-main">
        <span className="fc-player-line">
          <span className="fc-player-name">{name}</span>
          {number != null && (
            <span className="fc-player-number"><span aria-hidden="true">#{number}</span><span className="fc-visually-hidden">, number {number}</span></span>
          )}
        </span>
        <span className="fc-player-meta">{detail}</span>
      </span>
    </span>
  );
}

export function SignalStrip({ signals }: { signals: Signals }) {
  return (
    <span className="fc-signal-strip" role="img" aria-label={signalSummary(signals)}>
      {SIGNALS.map((s) => <i key={s} data-signal={signals[s]} />)}
    </span>
  );
}

const VERDICT = { go: 'Go', wait: 'Wait', stop: 'Stop', none: 'Unchecked' } as const;
export function Verdict({ verdict }: { verdict: keyof typeof VERDICT }) {
  return <span className="fc-signal" data-signal={verdict}>{VERDICT[verdict]}</span>;
}

export function Gem({ tier }: { tier: string | null }) {
  if (!tier) return <span aria-label="No tier">{'–'}</span>;
  return (
    <span className="fc-gem" data-tier={tier} data-motion="once">
      <span className="fc-gem-facets" aria-hidden="true"><i /><i /><i /><i /></span>
      {tier[0]!.toUpperCase() + tier.slice(1)}
    </span>
  );
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
