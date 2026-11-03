// The Anthropic Messages API, for the Jeweler. Only the ask-jeweler job calls it, through runJob, and only
// after the guard in jeweler.ts has seen both the key and a monthly cap.
import { z } from 'zod';
import { ours } from '../errors';
import type { ProviderBase, ProviderContext } from './types';

export interface AssistantTurn { role: 'user' | 'assistant'; content: string }
export interface AssistantRequest { model: string; system: string; messages: AssistantTurn[]; maxTokens: number }
export interface AssistantReply { text: string; inputTokens: number; outputTokens: number }

export interface AssistantProvider extends ProviderBase {
  reply(ctx: ProviderContext, req: AssistantRequest): Promise<AssistantReply>;
}

const Message = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

export function anthropic(key: string, opts: { baseUrl?: string; fetch?: typeof fetch } = {}): AssistantProvider {
  const base = (opts.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
  return {
    id: 'anthropic',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    fetch: opts.fetch,
    async reply(ctx, req) {
      const url = `${base}/v1/messages`;
      const body = await ctx.http.postJson(url, { model: req.model, max_tokens: req.maxTokens, system: req.system, messages: req.messages });
      const parsed = Message.safeParse(body);
      if (!parsed.success) throw ours('payload', 'anthropic sent a response we could not read', { provider: 'anthropic', url });
      const text = parsed.data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n\n').trim();
      return { text, inputTokens: parsed.data.usage.input_tokens, outputTokens: parsed.data.usage.output_tokens };
    },
  };
}
