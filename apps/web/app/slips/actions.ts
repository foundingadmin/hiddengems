'use server';
// Slip actions. Each validates its input, writes through the slip store (packages/db/src/slips.ts) and refreshes
// every page, since the rail slip shows on all of them. Nothing here talks to a sportsbook: the slip link only
// adds picks, and Josh places the bet himself (docs/prd.md section 13).
import { parseStake } from '@hiddengems/core';
import {
  type RemovedLeg, type SlipResult, addLeg as storeAddLeg, changeToOwnPlay, markPlaced as storeMarkPlaced, markSent as storeMarkSent,
  removeLeg as storeRemoveLeg, restoreLeg as storeRestoreLeg, setStake as storeSetStake,
} from '@hiddengems/db';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

/**
 * value: what was typed, so a form that resets after the action shows it again beside the error. confirm 'change':
 * the slip is a suggested play, so the Change slip dialog comes first (components/change-slip-dialog.tsx).
 */
export type ActionState = { ok: boolean; error?: string; value?: string; confirm?: 'change'; slipId?: string } | null;

/** A removed leg, kept by the client for Undo (restoreLeg). */
export type { RemovedLeg };

const SLIP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECTION_KEY = /^[A-Za-z0-9:._-]{1,200}$/;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const invalid = (what: string): ActionState => ({ ok: false, error: `That ${what} is not valid` });

async function done(r: SlipResult | Promise<SlipResult>): Promise<ActionState> {
  const result = await r;
  if (result.ok) revalidatePath('/', 'layout');
  if (result.ok) return { ok: true };
  return 'confirm' in result ? { ok: false, confirm: result.confirm, slipId: result.slipId } : { ok: false, error: result.error };
}

/** Adds a gem to this week's slip (its game's week), starting a draft when there is none. */
export async function addLeg(selectionKey: string): Promise<ActionState> {
  const key = text(selectionKey);
  if (!SELECTION_KEY.test(key)) return invalid('pick');
  return done(storeAddLeg((await db()).db, key));
}

/** Removes a leg. removed is what Undo sends back to restoreLeg. */
export async function removeLeg(slipId: string, selectionKey: string): Promise<NonNullable<ActionState> & { removed?: RemovedLeg }> {
  const id = text(slipId), key = text(selectionKey);
  if (!SLIP_ID.test(id)) return invalid('slip')!;
  if (!SELECTION_KEY.test(key)) return invalid('pick')!;
  const r = await storeRemoveLeg((await db()).db, id, key);
  const state = await done(r);
  return r.ok && r.removed ? { ...state!, removed: r.removed } : state!;
}

/** Undo for removeLeg: the same leg back on the same slip, at the price it was added at. */
export async function restoreLeg(slipId: string, leg: RemovedLeg): Promise<ActionState> {
  const id = text(slipId), key = text(leg?.selectionKey);
  if (!SLIP_ID.test(id)) return invalid('slip');
  if (!SELECTION_KEY.test(key)) return invalid('pick');
  const price = Number(leg.price), addedAt = text(leg.addedAt).slice(0, 40);
  return done(storeRestoreLeg((await db()).db, id, { selectionKey: key, price, addedAt }));
}

/** Form action: slipId and stake ("15", "$15.00"). */
export async function setStake(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = text(form.get('slipId'));
  if (!SLIP_ID.test(id)) return invalid('slip');
  const typed = text(form.get('stake')).slice(0, 20);
  const stake = parseStake(typed);
  if (stake == null) return { ok: false, error: 'Enter a stake in dollars, like 15 or 12.50', value: typed };
  return done(storeSetStake((await db()).db, id, stake));
}

/** Change slip, confirmed in the dialog: the suggested play becomes your own play. */
export async function changeSlip(slipId: string): Promise<ActionState> {
  const id = text(slipId);
  if (!SLIP_ID.test(id)) return invalid('slip');
  return done(changeToOwnPlay((await db()).db, id));
}

/** The DraftKings link was opened. */
export async function markSent(slipId: string): Promise<ActionState> {
  const id = text(slipId);
  if (!SLIP_ID.test(id)) return invalid('slip');
  return done(storeMarkSent((await db()).db, id));
}

/** Form action: slipId, as (slip or other) and, when the slip has none yet, stake. Writes one bet per leg. */
export async function markPlaced(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = text(form.get('slipId'));
  if (!SLIP_ID.test(id)) return invalid('slip');
  const as = text(form.get('as'));
  if (as !== 'slip' && as !== 'other') return invalid('choice');
  const typed = text(form.get('stake')).slice(0, 20);
  const stake = typed === '' ? undefined : parseStake(typed);
  if (stake === null) return { ok: false, error: 'Enter a stake in dollars, like 15 or 12.50', value: typed };
  return done(storeMarkPlaced((await db()).db, id, as, new Date(), stake));
}
