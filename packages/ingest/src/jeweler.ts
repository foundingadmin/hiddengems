// The Jeweler (PRD F3.3): answers questions about a gem with the app's own numbers, through the Anthropic
// Messages API. It explains; it never places, changes or sends anything (PRD section 13).
//
// Spend is guarded: no call happens unless ANTHROPIC_API_KEY is set AND the owner has set a monthly cap
// (provider_caps, in US cents), and the month's spend (provider_usage, in cents) leaves room for the
// largest answer. Each ask runs as the ask-jeweler job through runJob, so it lands in the pull log.
import { type Db, providerCaps, providerUsage } from '@hiddengems/db';
import { eq } from 'drizzle-orm';
import type { FailureOwner } from './errors';
import { anthropic, type AssistantTurn } from './providers/anthropic';
import { sampleProviders } from './providers/sample';
import type { Providers } from './providers/types';
import { type Job, runJob } from './runner';

export const JEWELER = {
  job: 'ask-jeweler',
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  maxTokens: 600,
  /** US dollars per million tokens, input and output. Confirm against Anthropic's price list when the key goes in. */
  price: { input: 3, output: 15 },
  /** Turns of the conversation sent with each ask, the new question included. */
  turns: 8,
  questionChars: 500,
} as const;

// ---------------------------------------------------------------- The guard

export interface JewelerStatus {
  ready: boolean;
  /** What the owner still has to set up. */
  missing: ('key' | 'cap')[];
  /** The cap is set and this month's spend has reached it. */
  capReached: boolean;
  capCents: number | null;
  usedCents: number;
}

/** Pure: whether the Jeweler may call the API. Both the key and a cap above zero, with room left. */
export function jewelerGate(i: { hasKey: boolean; capCents: number | null; usedCents: number; nextCents?: number }): JewelerStatus {
  const cap = i.capCents != null && i.capCents > 0 ? i.capCents : null;
  const missing: JewelerStatus['missing'] = [...(i.hasKey ? [] : ['key' as const]), ...(cap == null ? ['cap' as const] : [])];
  const capReached = cap != null && i.usedCents + (i.nextCents ?? 1) > cap;
  return { ready: missing.length === 0 && !capReached, missing, capReached, capCents: cap, usedCents: i.usedCents };
}

const monthOf = (d: Date) => d.toISOString().slice(0, 7);

/** The owner's cap in cents, or null. Reads as unset until migration 0005 has run. */
export async function jewelerCap(db: Db): Promise<number | null> {
  try {
    const [row] = await db.select({ cents: providerCaps.monthlyCents }).from(providerCaps).where(eq(providerCaps.provider, JEWELER.provider));
    return row?.cents ?? null;
  } catch {
    return null;
  }
}

/** Cents spent this calendar month (UTC). The row's count restarts when the month changes. */
export async function jewelerSpend(db: Db, now = new Date()): Promise<number> {
  const [row] = await db.select().from(providerUsage).where(eq(providerUsage.provider, JEWELER.provider));
  return row && monthOf(row.updatedAt) === monthOf(now) ? row.used ?? 0 : 0;
}

export async function jewelerStatus(db: Db, env: Record<string, string | undefined> = process.env, now = new Date()): Promise<JewelerStatus> {
  return jewelerGate({ hasKey: Boolean(env.ANTHROPIC_API_KEY?.trim()), capCents: await jewelerCap(db), usedCents: await jewelerSpend(db, now) });
}

/** Cents for a call, rounded up so the cap is never passed. */
export const costCents = (inputTokens: number, outputTokens: number) =>
  Math.ceil((inputTokens * JEWELER.price.input + outputTokens * JEWELER.price.output) / 10_000);

/** The most an ask can cost: its prompt at about 3 characters a token, plus the longest answer. */
export const worstCents = (chars: number) => costCents(Math.ceil(chars / 3), JEWELER.maxTokens);

// ---------------------------------------------------------------- The prompt

/** One prop as the app shows it. Chances are 0 to 1; edge is in points. */
export interface JewelerGem {
  id: string;
  player: string;
  number: number | null;
  position: string | null;
  team: string | null;
  matchup: string;
  /** Kickoff as the app prints it ("Sun 1:00 PM"). */
  kickoff: string;
  kind: string;
  rating: number | null;
  price: number;
  priced: number;
  hitChance: number;
  edge: number;
  clarity: number;
  reasons: string[];
}

/** What the Jeweler is looking at: the gem in context, else the week's board. */
export interface JewelerContext {
  week: number | null;
  gem: JewelerGem | null;
  board: JewelerGem[];
  /** The slip in progress for the week, null when there is none (or the slips update has not run). */
  slip: JewelerSlip | null;
}

/** One leg of the slip, with the numbers the certificate shows. */
export interface JewelerSlipLeg {
  player: string;
  number: number | null;
  matchup: string;
  kickoff: string;
  price: number;
  /** Null once the board no longer lists the prop. */
  hitChance: number | null;
  rating: number | null;
}

/** The slip as the certificate shows it: legs, stake, pays and the lose it all chance. */
export interface JewelerSlip {
  /** "Slip 1". */
  name: string;
  play: 'suggested' | 'own';
  legs: JewelerSlipLeg[];
  stake: number | null;
  pays: number | null;
  /** 0 to 1; null when a leg has no read or legs share a game. */
  loseItAll: number | null;
  /** Two or more legs share a game, so no lose it all chance is shown. */
  correlated: boolean;
  appraisal: string | null;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
const pts = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))} pts`;
const standing = (g: JewelerGem) =>
  g.kind === 'gem' ? `gem rating ${g.rating}`
    : g.kind === 'fools-gold' ? "Fool's Gold (beats the fair price, not the posted price; no rating)"
      : g.kind === 'unrated' ? 'no rating (no 2026 stats yet, so the market stands)' : 'not a gem (does not clear the posted price)';

/** One line per prop, with every number the app shows for it, formatted the way the app prints it. */
export function describeGem(g: JewelerGem): string {
  const who = [`${g.player}${g.number != null ? ` #${g.number}` : ''}`, g.position, g.team].filter(Boolean).join(', ');
  return `${who}. ${g.matchup}, kickoff ${g.kickoff}. Anytime touchdown at DraftKings ${g.price.toFixed(2)}. ` +
    `Priced ${pct(g.priced)}, our estimate ${pct(g.hitChance)}, edge ${pts(g.edge)}, clarity ${g.clarity}, ${standing(g)}.`;
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The slip as its certificate reads: one line per leg, then stake, pays and lose it all. */
export function describeSlip(s: JewelerSlip): string {
  const kind = s.legs.length === 1 ? 'a single' : `a ${s.legs.length} leg parlay`;
  const lines = [`${s.name}, ${s.play === 'suggested' ? "the Jeweler's suggested play" : 'their own play'}, ${kind}:`];
  for (const l of s.legs) {
    lines.push(`- ${l.player}${l.number != null ? ` #${l.number}` : ''}. ${l.matchup}, kickoff ${l.kickoff}. DraftKings ${l.price.toFixed(2)}` +
      (l.hitChance != null ? `, our estimate ${pct(l.hitChance)}` : ', no longer on the board') +
      (l.rating != null ? `, gem rating ${l.rating}` : '') + '.');
  }
  lines.push(s.stake != null ? `Stake ${money(s.stake)}${s.pays != null ? `, pays ${money(s.pays)} if every leg hits` : ''}.` : 'No stake set yet.');
  lines.push(s.correlated
    ? 'Lose it all: not shown, because legs share a game and move together.'
    : s.loseItAll != null ? `Lose it all (the chance at least one leg misses): ${pct(s.loseItAll)}.` : 'Lose it all: unknown, a leg has no read.');
  if (s.appraisal) lines.push(`The Jeweler's appraisal on the slip: ${s.appraisal}`);
  return lines.join('\n');
}

const RULES = `You are the Jeweler, the assistant inside Hidden Gems. Hidden Gems reads NFL anytime touchdown props for one person and rates each one.

Voice: a trusted jeweler, not a casino. Calm, exacting, plain spoken, quietly confident. Answer in one or two short paragraphs of plain text, no lists or headings unless asked. No hype, no superlatives (great, lock, best bet), no emoji.

Rules:
- Explain with the app's numbers below, cited exactly as written, with the same precision. Never invent a number, a stat, an injury or news. If the numbers below do not answer the question, say so.
- You never place, change or send a bet, never touch money or a sportsbook account, and have no way to. If asked, say that Hidden Gems never places bets or handles money; the user places bets themselves in DraftKings.
- Never push the user to bet more often or bigger. Be honest about risk: any prop can miss, a longer price pays more when it hits but hits less often, and passing on Fool's Gold is a good call.

How Hidden Gems reads a prop:
- Price: DraftKings decimal odds. Priced: the chance that price implies, the book's cut included.
- Our estimate: the model's hit chance from 2026 red zone usage, touchdown rate, snap share and implied team points, blended with the market.
- Edge: our estimate minus priced, in points. Above zero clears the cut.
- Clarity: confidence in the read, 0 to 100, from sample size, whether the red zone read and the hit rate agree, whether the books agree, and the injury report.
- Gem rating: 0 to 100. The gap between our estimate and the fair chance (the price with the book's cut taken out), counted in full at 10 points, times clarity. That gap is not shown and runs larger than the edge, which is measured against the posted price. Only props that clear the posted price are gems.
- Fool's Gold: beats the fair price but not the posted price, so the cut eats it.`;

export function buildJewelerPrompt(ctx: JewelerContext): string {
  const parts = [RULES];
  if (ctx.gem) {
    parts.push(`The user is looking at this prop:\n${describeGem(ctx.gem)}` +
      (ctx.gem.reasons.length
        ? `\n${ctx.gem.kind === 'gem' ? 'What the app lists under "Why it\'s a gem"' : 'What the app lists about it'}:\n${ctx.gem.reasons.map((r) => `- ${r}`).join('\n')}`
        : ''));
  }
  if (ctx.slip?.legs.length) parts.push(`The user's slip in progress:\n${describeSlip(ctx.slip)}`);
  const others = ctx.board.filter((g) => g.id !== ctx.gem?.id);
  if (others.length) {
    parts.push(`${ctx.gem ? 'Other props' : 'Props'} on the board${ctx.week != null ? ` for Week ${ctx.week}` : ''}, in Recommended order:\n` +
      others.map((g) => `- ${describeGem(g)}`).join('\n'));
  } else if (!ctx.gem) {
    parts.push('The board has no gems this week yet.');
  }
  return parts.join('\n\n');
}

// ---------------------------------------------------------------- The ask

export interface JewelerTurn { role: 'user' | 'assistant'; text: string }

export type JewelerAnswer =
  | { ok: true; text: string }
  | { ok: false; reason: 'not-set-up' | 'cap-reached' | 'busy' | 'failed'; message: string; owner?: FailureOwner; status?: JewelerStatus };

/** The turns sent: the latest few, starting with a question, each cut to length. */
export function trimTurns(turns: JewelerTurn[]): AssistantTurn[] {
  const clean = turns.filter((t) => t.text.trim()).map((t) => ({ role: t.role, content: t.text.trim().slice(0, t.role === 'user' ? JEWELER.questionChars : 4000) }));
  let recent = clean.slice(-JEWELER.turns);
  while (recent.length && recent[0]!.role !== 'user') recent = recent.slice(1);
  return recent;
}

export interface AskOptions {
  db: Db;
  context: JewelerContext;
  /** The conversation so far, ending with the new question. */
  turns: JewelerTurn[];
  env?: Record<string, string | undefined>;
  now?: Date;
  /** Replaces the network, for tests. */
  fetch?: typeof fetch;
  providers?: Providers;
  echo?: boolean;
}

export async function askJeweler(opts: AskOptions): Promise<JewelerAnswer> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const messages = trimTurns(opts.turns);
  if (messages.at(-1)?.role !== 'user') return { ok: false, reason: 'failed', message: 'Ask a question first.' };
  const system = buildJewelerPrompt(opts.context);
  const next = worstCents(system.length + messages.reduce((n, m) => n + m.content.length, 0));

  // The guard runs before the job, so a Jeweler that is not set up never writes a run or makes a call.
  const capCents = await jewelerCap(opts.db);
  const status = jewelerGate({ hasKey: Boolean(env.ANTHROPIC_API_KEY?.trim()), capCents, usedCents: await jewelerSpend(opts.db, now), nextCents: next });
  if (status.missing.length) return { ok: false, reason: 'not-set-up', message: 'The Jeweler is not set up yet.', status };
  if (!status.ready) return { ok: false, reason: 'cap-reached', message: "This month's cap is used up.", status };

  const provider = anthropic(env.ANTHROPIC_API_KEY!.trim(), { baseUrl: env.ANTHROPIC_BASE_URL, fetch: opts.fetch });
  let text: string | null = null;
  let over = false;
  const job: Job = {
    name: JEWELER.job,
    providerId: provider.id,
    lockMs: 60_000,
    async run(ctx) {
      // Asks run one at a time (the job lock), so this read is current: refuse an ask the month cannot cover.
      const used = await jewelerSpend(ctx.db, now);
      if (used + next > capCents!) { over = true; return { skipped: 'Monthly cap reached' }; }
      const reply = await provider.reply(ctx.using(provider), { model: JEWELER.model, system, messages, maxTokens: JEWELER.maxTokens });
      const cents = costCents(reply.inputTokens, reply.outputTokens);
      const spent = used + cents;
      await ctx.db.insert(providerUsage).values({ provider: provider.id, used: spent, remaining: capCents! - spent, updatedAt: now })
        .onConflictDoUpdate({ target: providerUsage.provider, set: { used: spent, remaining: capCents! - spent, updatedAt: now } });
      text = reply.text;
      return {
        message: `Answered in ${reply.inputTokens + reply.outputTokens} tokens for ${cents}¢, ${spent}¢ of ${capCents}¢ this month`,
        meta: { model: JEWELER.model, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, cents },
      };
    },
  };
  const result = await runJob(JEWELER.job, {
    db: opts.db, providers: opts.providers ?? sampleProviders(), trigger: 'manual', now, registry: { [JEWELER.job]: job }, echo: opts.echo,
  });
  if (result.status === 'locked') return { ok: false, reason: 'busy', message: 'The Jeweler is answering another question.' };
  if (over) return { ok: false, reason: 'cap-reached', message: "This month's cap is used up." };
  if (result.status === 'failed' || text == null) return { ok: false, reason: 'failed', message: result.message, owner: result.failureOwner };
  return { ok: true, text };
}
