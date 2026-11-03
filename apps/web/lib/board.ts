import 'server-only';
// The Gems board for one week: every gem and Fool's Gold in Recommended order, which gems are new, and
// the reasons behind each, written from the model's stored inputs (estimates.inputs).
import { type GemKind, compareRecommended, findTeam, newGemReason, seasonOf } from '@hiddengems/core';
import { estimates, gemMarks, games, picks, players } from '@hiddengems/db';
import { and, asc, eq, gt, inArray, isNotNull, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ZONE, clock, pct } from '@/lib/format';

export interface Week { week: number; label: string; detail?: string }

/** Regular season weeks with games, and the current one: the week of the next kickoff. */
export async function weeks(now = new Date()): Promise<{ list: Week[]; current: number | null }> {
  const { db: d } = await db();
  const season = seasonOf(now);
  const rows = await d.select({ week: games.week, kickoff: games.kickoffAt }).from(games)
    .where(and(eq(games.season, season), eq(games.seasonType, 'reg'), isNotNull(games.week))).orderBy(asc(games.kickoffAt));
  const nums = [...new Set(rows.map((r) => r.week!))].sort((a, b) => b - a);
  const next = rows.find((r) => r.kickoff > now);
  const current = next?.week ?? nums[0] ?? null;
  return { list: nums.map((w) => ({ week: w, label: `Week ${w}`, detail: w === current ? 'This week' : undefined })), current };
}

/** The selected week from ?week=, else the current one. */
export async function resolveWeek(param: string | string[] | undefined, now = new Date()) {
  const w = await weeks(now);
  const asked = Number(Array.isArray(param) ? param[0] : param);
  const week = w.list.some((x) => x.week === asked) ? asked : w.current;
  return { ...w, week };
}

type Inputs = {
  statsChance?: number | null; impliedPoints?: number | null; impliedFactor?: number | null; injury?: string | null;
  form?: { games: number; tdGames: number; rzCarriesPerGame: number; rzTargetsPerGame: number; snapRecent: number } | null;
};

/** Kickoff windows in the display zone: Thursday, Sunday morning, afternoon and night, Monday, other days. */
export function windowOf(d: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'long', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(d).map((p) => [p.type, p.value]));
  const day = parts.weekday!, hour = Number(parts.hour);
  if (day !== 'Sunday') return day;
  return hour < 12 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Night';
}

/** Three plain reasons, each with its number: the price against our read, his usage, and his record or team total. */
export function reasons(p: { priced: number; hitChance: number }, inputs: Inputs | null, team: string | null): string[] {
  // When both round to the same whole percent, one decimal shows the gap the edge column reports.
  const same = Math.round(p.priced * 100) === Math.round(p.hitChance * 100);
  const show = (x: number) => (same ? `${(x * 100).toFixed(1)}%` : pct(x));
  const out = [`Priced like a ${show(p.priced)} shot, we read ${show(p.hitChance)}`];
  const f = inputs?.form;
  if (f) {
    const rz = f.rzCarriesPerGame + f.rzTargetsPerGame;
    const snaps = `, on ${Math.round(f.snapRecent * 100)}% of snaps`;
    out.push(rz >= 0.95
      ? `Gets about ${Math.round(rz)} ${Math.round(rz) === 1 ? 'touch' : 'touches'} a game inside the 10${snaps}`
      : rz > 0 ? `Gets the ball inside the 10 about ${Math.max(1, Math.round(rz * 10))} times every 10 games${snaps}` : `No touches inside the 10 yet${snaps}`);
    if (inputs?.impliedPoints != null && inputs.impliedFactor != null && inputs.impliedFactor >= 1.05) {
      out.push(`${team ?? 'His team'} is implied for ${inputs.impliedPoints.toFixed(1)} points, above the league average`);
    } else {
      out.push(`Scored in ${f.tdGames} of ${f.games} games this season`);
    }
  }
  return out;
}

export interface BoardRow {
  key: string;
  kind: GemKind;
  rating: number | null;
  name: string;
  teamId: string | null;
  number: number | null;
  position: string | null;
  matchup: string;
  kickoff: string;
  started: boolean;
  window: string;
  price: number;
  priced: number;
  hitChance: number;
  gap: number;
  /** Gap to fair: our estimate minus the fair chance, in points. */
  carat: number;
  clarity: number;
  recommended: number;
  /** Unread and new: crossed 90 or jumped 15 since found or read. */
  fresh: { kind: 'crossed' | 'jumped'; from: number; at: string } | null;
  reasons: string[];
}

export async function board(week: number | null, now = new Date()): Promise<{ rows: BoardRow[]; lastRead: Date | null }> {
  const { db: d } = await db();
  if (week === null) return { rows: [], lastRead: null };
  const data = await d.select({ pick: picks, game: games, player: players, inputs: estimates.inputs, mark: gemMarks })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .leftJoin(players, eq(players.id, picks.playerId))
    .leftJoin(estimates, and(eq(estimates.runId, picks.runId), eq(estimates.selectionKey, picks.selectionKey)))
    .leftJoin(gemMarks, eq(gemMarks.selectionKey, picks.selectionKey))
    .where(and(eq(games.season, seasonOf(now)), eq(games.week, week), inArray(picks.kind, ['gem', 'fools-gold'])));
  const sorted = data.sort((a, b) => compareRecommended({ ...a.pick, kind: a.pick.kind as GemKind }, { ...b.pick, kind: b.pick.kind as GemKind }));
  const [last] = await d.select({ at: max(gemMarks.readAt) }).from(gemMarks);
  const rows = sorted.map(({ pick, game, player, inputs, mark }, i): BoardRow => {
    const team = player?.teamId ? findTeam(player.teamId) : null;
    const started = game.kickoffAt <= now;
    const isNew = pick.kind === 'gem' && !started && mark ? newGemReason(pick.rating, mark) : null;
    return {
      key: pick.selectionKey, kind: pick.kind as GemKind, rating: pick.rating,
      name: player?.name ?? pick.playerName ?? 'Unknown player', teamId: team?.id ?? null, number: player?.jerseyNumber ?? null,
      position: player?.position ?? null, matchup: `${game.awayTeamId.toUpperCase()} @ ${game.homeTeamId.toUpperCase()}`,
      kickoff: game.kickoffAt.toISOString(), started, window: windowOf(game.kickoffAt),
      price: pick.price, priced: pick.priced, hitChance: pick.hitChance, gap: pick.gapToPosted, carat: pick.carat, clarity: pick.clarity,
      recommended: i,
      fresh: isNew ? { ...isNew, at: clock(isNew.kind === 'crossed' && !mark?.readAt ? mark!.foundAt : (mark?.readAt ?? mark!.foundAt)) } : null,
      reasons: reasons(pick, inputs as Inputs | null, team?.name ?? null),
    };
  });
  return { rows, lastRead: last?.at ?? null };
}

/** How many gems are new right now, for the Gems nav count. Upcoming games only. */
export async function newGemCount(now = new Date()): Promise<number> {
  const { db: d } = await db();
  const rows = await d.select({ rating: picks.rating, mark: gemMarks }).from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .leftJoin(gemMarks, eq(gemMarks.selectionKey, picks.selectionKey))
    .where(and(eq(picks.kind, 'gem'), gt(games.kickoffAt, now)));
  return rows.filter((r) => r.mark && newGemReason(r.rating, r.mark)).length;
}
