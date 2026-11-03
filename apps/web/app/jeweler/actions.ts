'use server';
// The Jeweler's two calls from the browser: what it is looking at, and an ask. The ask rebuilds its context
// from the database and runs as the ask-jeweler job (packages/ingest jeweler.ts), which refuses to call
// Anthropic without both the key and a monthly cap.
import { askJeweler, JEWELER, type JewelerTurn } from '@hiddengems/ingest';
import { db } from '@/lib/db';
import { jewelerContext, jewelerView, type JewelerView } from '@/lib/jeweler';

export type AskResult =
  | { ok: true; text: string }
  | { ok: false; message: string; logs?: boolean; view?: JewelerView };

export async function loadJeweler(gemId: string | null): Promise<JewelerView> {
  return jewelerView(typeof gemId === 'string' && gemId ? gemId.slice(0, 200) : null);
}

export async function ask(gemId: string | null, turns: JewelerTurn[]): Promise<AskResult> {
  const id = typeof gemId === 'string' && gemId ? gemId.slice(0, 200) : null;
  const clean = (Array.isArray(turns) ? turns : [])
    .filter((t): t is JewelerTurn => (t?.role === 'user' || t?.role === 'assistant') && typeof t.text === 'string')
    .map((t) => ({ role: t.role, text: t.text.slice(0, t.role === 'user' ? JEWELER.questionChars : 4000) }));
  const handle = await db();
  const answer = await askJeweler({ db: handle.db, context: await jewelerContext(id), turns: clean, echo: true });
  if (answer.ok) return answer;
  switch (answer.reason) {
    case 'not-set-up':
    case 'cap-reached':
      return { ok: false, message: answer.message, view: await jewelerView(id) };
    case 'busy':
      return { ok: false, message: 'The Jeweler is answering another question. Ask again in a moment.' };
    default:
      return answer.owner === 'provider'
        ? { ok: false, message: 'Anthropic did not answer. Ask again in a minute.' }
        : { ok: false, message: 'The Jeweler could not answer.', logs: true };
  }
}
