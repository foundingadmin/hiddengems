import 'server-only';
// What the Jeweler is looking at (a gem from ?gem=, else the week's board), its suggested questions, and
// whether it may answer (packages/ingest jeweler.ts holds the guard and the prompt).
import { betLabel, findTeam, injuryLine, seasonOf } from '@hiddengems/core';
import { estimates, games, picks, players } from '@hiddengems/db';
import { type JewelerContext, type JewelerGem, type JewelerSlip, type JewelerStatus, jewelerStatus } from '@hiddengems/ingest';
import { and, eq } from 'drizzle-orm';
import { type BoardRow, board, reasons, weeks } from '@/lib/board';
import { db } from '@/lib/db';
import { kickoff } from '@/lib/format';
import { type SlipSummary, getCurrentSlip } from '@/lib/slips';

/** Props the Jeweler sees besides the one in context: the week's upcoming board, in Recommended order. */
const BOARD_SIZE = 12;

/** What the chat needs on the client. */
export interface JewelerView {
  gem: { id: string; name: string } | null;
  /** The slip in progress, as its chip names it ("Slip 1"). */
  slip: { name: string } | null;
  ready: boolean;
  /** Why it cannot answer, when it cannot. */
  note: string | null;
  suggestions: string[];
}

const teamName = (id: string | null) => { const t = id ? findTeam(id) : null; return t ? `${t.city} ${t.name}` : null; };

const fromRow = (r: BoardRow): JewelerGem => ({
  id: r.key, player: r.name, number: r.number, position: r.position, team: teamName(r.teamId), matchup: r.matchup,
  kickoff: kickoff(new Date(r.kickoff)), kind: r.kind, rating: r.rating, price: r.price, priced: r.priced, hitChance: r.hitChance,
  edge: r.gap, carat: r.carat, clarity: r.clarity, reasons: r.reasons, bet: betLabel(r.marketId, r.line), injury: r.injury,
});

async function gemById(id: string): Promise<{ gem: JewelerGem; week: number | null } | null> {
  const { db: d } = await db();
  const [row] = await d.select({ pick: picks, game: games, player: players, inputs: estimates.inputs })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .leftJoin(players, eq(players.id, picks.playerId))
    .leftJoin(estimates, and(eq(estimates.runId, picks.runId), eq(estimates.selectionKey, picks.selectionKey)))
    .where(eq(picks.selectionKey, id));
  if (!row) return null;
  const { pick, game, player, inputs } = row;
  const team = teamName(player?.teamId ?? null);
  return {
    week: game.season === seasonOf(new Date()) ? game.week : null,
    gem: {
      id, player: player?.name ?? pick.playerName ?? 'Unknown player', number: player?.jerseyNumber ?? null, position: player?.position ?? null,
      team, matchup: `${game.awayTeamId.toUpperCase()} @ ${game.homeTeamId.toUpperCase()}`, kickoff: kickoff(game.kickoffAt), kind: pick.kind,
      rating: pick.rating, price: pick.price, priced: pick.priced, hitChance: pick.hitChance, edge: pick.gapToPosted, carat: pick.carat, clarity: pick.clarity,
      reasons: reasons(pick, inputs as Parameters<typeof reasons>[1], player?.teamId ? findTeam(player.teamId)?.name ?? null : null),
      bet: betLabel(pick.marketId, pick.line),
      injury: player ? injuryLine({ status: player.injuryStatus, practice: player.practiceStatus, injury: player.injuryDetail }) : null,
    },
  };
}

/** The slip as its certificate reads (lib/slips summarize()), for the prompt. */
export function slipFor(s: SlipSummary): JewelerSlip {
  return {
    name: `Slip ${s.slip.number}`, play: s.slip.play, stake: s.slip.stake, pays: s.pays,
    loseItAll: s.loseItAll.value, correlated: s.loseItAll.correlated, appraisal: s.slip.appraisal,
    legs: s.slip.legs.map((l) => ({
      player: l.name, number: l.number, matchup: `${l.awayTeamId.toUpperCase()} @ ${l.homeTeamId.toUpperCase()}`, kickoff: kickoff(l.kickoffAt),
      price: l.price, hitChance: l.hitChance, rating: l.rating,
    })),
  };
}

/** The gem in context, the slip in progress and the week's board, read from the database, never from the browser. */
export async function jewelerContext(gemId: string | null): Promise<JewelerContext> {
  const found = gemId ? await gemById(gemId) : null;
  const week = found?.week ?? (await weeks()).current;
  const [{ rows }, slip] = await Promise.all([board(week), getCurrentSlip(week)]);
  const upcoming = rows.filter((r) => !r.started).slice(0, BOARD_SIZE);
  return { week, gem: found?.gem ?? null, board: upcoming.map(fromRow), slip: slip ? slipFor(slip) : null };
}

/** Two or three short questions about what is in context (packages/facet/components/chat.md). */
export function suggestionsFor(gem: JewelerGem | null, slip: JewelerSlip | null = null): string[] {
  if (!gem && slip) return ['Which leg on my slip is the weakest?', 'Which gem has the clearest read?', 'How is the rating built?'];
  if (!gem) return ['Which gem has the clearest read?', 'How is the rating built?', "What makes a prop Fool's Gold?"];
  const lead = gem.kind === 'gem' ? "Why is it a gem?" : gem.kind === 'fools-gold' ? "Why is it Fool's Gold?" : 'Why is it not a gem?';
  return [lead, ...(gem.clarity < 100 ? ['What costs it clarity?'] : []), 'What could change before kickoff?'];
}

const nextMonth = () => {
  const d = new Date();
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
};

export function statusNote(s: JewelerStatus): string | null {
  if (s.missing.length) {
    const needs = s.missing.map((m) => (m === 'key' ? 'an Anthropic API key' : 'a monthly cap')).join(' and ');
    return `The Jeweler is not set up yet: it needs ${needs}.`;
  }
  if (s.capReached) return `This month's cap is used up. The Jeweler answers again on ${nextMonth()}.`;
  return null;
}

export async function jewelerView(gemId: string | null): Promise<JewelerView> {
  const [ctx, status] = await Promise.all([jewelerContext(gemId), (async () => jewelerStatus((await db()).db))()]);
  return {
    gem: ctx.gem ? { id: ctx.gem.id, name: ctx.gem.player } : null,
    slip: ctx.slip ? { name: ctx.slip.name } : null,
    ready: status.ready,
    note: statusNote(status),
    suggestions: suggestionsFor(ctx.gem, ctx.slip),
  };
}
