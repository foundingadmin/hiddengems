// Marks shared by History and the graded slip: signed money, CLV, the slip's result and its name.
// Markup per packages/facet/components/money.md and the Facet signal and delta parts.
import type { SlipOutcome } from '@hiddengems/core';
import { ZONE } from '@/lib/format';
import { money, stakeWords } from './slip-parts';

const MINUS = '−';
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? MINUS : '');

/** CLV as a signed percent with one decimal ("+4.2%", "−1.4%"). */
export const clvText = (clv: number) => `${sign(Math.round(clv * 1000))}${Math.abs(clv * 100).toFixed(1)}%`;

/** A profit or loss: the sign in the text, edge green or red repeating it (Facet .fc-money). */
export function Money({ value }: { value: number }) {
  const s = value > 0 ? 'positive' : value < 0 ? 'negative' : undefined;
  return <span className="fc-money" data-sign={s}>{sign(value)}{money(Math.abs(value))}</span>;
}

/** CLV as an edge: sign, arrow and color. */
export function ClvDelta({ clv }: { clv: number }) {
  const d = Math.round(clv * 1000);
  return <span className="fc-delta" data-direction={d > 0 ? 'positive' : d < 0 ? 'negative' : 'neutral'}>{clvText(clv)}</span>;
}

const RESULT: Record<SlipOutcome['result'], [string, string]> = {
  earned: ['go', 'Earned'], missed: ['stop', 'Missed'], pending: ['none', 'Pending'], void: ['none', 'Void'],
};
export function SlipResult({ result }: { result: SlipOutcome['result'] }) {
  const [signal, word] = RESULT[result];
  return <span className="fc-signal" data-signal={signal}>{word}</span>;
}

const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;
const lastName = (name: string) => name.split(' ').filter((w, i, all) => i === 0 || !(SUFFIX.test(w) && i === all.length - 1)).at(-1) ?? name;

/** "James Cook" for a single, "Cook and McLaurin" for two legs, "3 leg parlay" beyond. */
export function slipName(names: string[]): string {
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${lastName(names[0]!)} and ${lastName(names[1]!)}`;
  return `${names.length} leg parlay`;
}

/** "$15 parlay", "$10 single". */
export const betWords = (stake: number, legs: number) => `${stakeWords(stake)} ${legs > 1 ? 'parlay' : 'single'}`;

export const playWords = (play: string) => (play === 'suggested' ? 'Suggested' : 'Your own');

/** "Tue Nov 3", in the display zone. */
export function shortDate(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', month: 'short', day: 'numeric' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.month} ${p.day}`;
}
