// The slip's shared marks: one leg (player, rating, price), the rating mark and Unknown. Markup per
// packages/facet/components/cert.md.
import type { CSSProperties, ReactNode } from 'react';
import type { SlipLegView } from '@hiddengems/db';
import { Player } from '@/components/marks';
import { ZONE, odds } from '@/lib/format';

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const LINK = svg(<><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><path d="M8 12h8" /></>);
export const SHIELD = svg(<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />);
export const ALERT = svg(<><path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);
export const ARROW = svg(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);
export const GEM = svg(<><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>);
export const BACK = svg(<path d="m15 18-6-6 6-6" />);

/** Kickoff on a leg: the clock time for Sunday games, the day first otherwise ("Thu 8:15 PM"). */
export function legTime(d: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(d);
  return weekday === 'Sun' ? time : `${weekday} ${time}`;
}

/** A value nobody can know yet: an en dash on screen, the word for screen readers. */
export const Unknown = () => <><span aria-hidden="true">{'–'}</span><span className="fc-visually-hidden">Unknown</span></>;

export const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Whole dollars when the stake is whole ("$15"), cents otherwise, for sentences. */
export const stakeWords = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : money(n));

export function RatingMark({ rating, index }: { rating: number; index: number }) {
  const style = { '--rating': rating, '--fc-gem-delay': `${index * 200}ms` } as CSSProperties;
  return (
    <span className="fc-gem" data-live style={style}>
      <svg viewBox="0 0 24 22" aria-hidden="true">
        <path className="fc-gem-fill" d="M6 1h12l5 7-11 13L1 8Z" />
        <path className="fc-gem-cut" d="M1 8h22M8.5 1 6.5 8l5.5 13 5.5-13-2-7" />
      </svg>
      <span><span className="fc-visually-hidden">Gem rating </span>{rating}</span>
    </span>
  );
}

/** One leg: player with matchup and kickoff, the rating (when shown and still rated), the price, an optional action. */
export function Leg({ leg, index, sameGame, showRating = true, showMatchup = true, action }: {
  leg: SlipLegView; index: number; sameGame?: boolean; showRating?: boolean; showMatchup?: boolean; action?: ReactNode;
}) {
  const time = <time className="fc-time" dateTime={leg.kickoffAt.toISOString()}>{legTime(leg.kickoffAt)}</time>;
  const detail = showMatchup ? <>{leg.awayTeamId.toUpperCase()} @ {leg.homeTeamId.toUpperCase()} · {time}</> : <>Anytime TD · {time}</>;
  const flag = sameGame && <span className="fc-badge" data-variant="amber" data-size="sm" data-contrast="low">{LINK}Same game</span>;
  return (
    <li className="fc-leg">
      <Player name={leg.name} teamId={leg.teamId} number={leg.number} detail={detail} badge={flag} />
      {showRating && leg.kind === 'gem' && leg.rating != null && <RatingMark rating={leg.rating} index={index} />}
      <span className="fc-price text-label-14"><span className="fc-visually-hidden">Price </span>{odds(leg.price)}</span>
      {action}
    </li>
  );
}
