// The core sample (docs/prd.md F2.4): his share of the opportunity that drives the market. For anytime TD that
// is red zone chances: carries and targets inside the 10, as a share of his team's, plus his snap share. The
// season sits beside his last 3 games, so a role that is growing or shrinking shows.
import type { UsageGame } from './model';

export type Opportunity = 'rzCarries' | 'rzTargets';

/** The opportunity that drives anytime TD for a position, leading type first. A QB scores on his own carries only. */
export function opportunitiesFor(position: string | null): Opportunity[] {
  switch (position) {
    case 'RB': case 'FB': return ['rzCarries', 'rzTargets'];
    case 'QB': return ['rzCarries'];
    default: return ['rzTargets', 'rzCarries'];
  }
}

export interface ShareCount {
  /** His count over the window. */
  own: number;
  /** His team's count over the same games, his included. */
  team: number;
  /** own / team, null when the team had none. */
  share: number | null;
}

export interface SampleWindow {
  games: number;
  rzCarries: ShareCount;
  rzTargets: ShareCount;
  /** Mean offensive snap share over games with snap counts, null without any. */
  snaps: number | null;
}

export interface CoreSample {
  /** The rows to show, leading type first. A secondary type he never had this season is left out. */
  types: Opportunity[];
  season: SampleWindow;
  recent: SampleWindow;
}

/** Games in the recent window. */
export const CORE_SAMPLE_RECENT = 3;

function window(own: readonly UsageGame[], team: readonly UsageGame[]): SampleWindow {
  const ids = new Set(own.map((g) => `${g.gameId}:${g.team}`));
  const mates = team.filter((g) => ids.has(`${g.gameId}:${g.team}`));
  const count = (k: Opportunity): ShareCount => {
    const o = own.reduce((n, g) => n + g[k], 0);
    const t = Math.max(o, mates.reduce((n, g) => n + g[k], 0));
    return { own: o, team: t, share: t > 0 ? o / t : null };
  };
  const snaps = own.map((g) => g.snapPct).filter((s): s is number => s !== null);
  return {
    games: own.length, rzCarries: count('rzCarries'), rzTargets: count('rzTargets'),
    snaps: snaps.length ? snaps.reduce((a, b) => a + b, 0) / snaps.length : null,
  };
}

/**
 * own: his games this season before the one being priced. team: every player's usage in those games, his own
 * included (only rows for the team he played for in each game count). Null when he has no games.
 */
export function coreSample(own: readonly UsageGame[], team: readonly UsageGame[], position: string | null, recent = CORE_SAMPLE_RECENT): CoreSample | null {
  if (!own.length) return null;
  const games = [...own].sort((a, b) => a.week - b.week);
  const season = window(games, team);
  const [lead, ...rest] = opportunitiesFor(position);
  return {
    types: [lead!, ...rest.filter((k) => season[k].own > 0)],
    season,
    recent: window(games.slice(-recent), team),
  };
}
