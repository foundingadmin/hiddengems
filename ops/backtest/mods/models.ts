// MOD4, MOD5 and MOD6: three MODs kept apart by what each may read.
//   MOD4  market only. DraftKings against the vig-free consensus of the other books. No player stats.
//   MOD5  football only. A projection from role, usage, matchup and game script. No other books' odds.
//   MOD6  news only. Saturday events that move volume (a teammate Out or Doubtful, a depth chart promotion, a dome).
//         No projections, no other books.
// Edge per the lexicon: MOD chance minus DraftKings implied chance with the vig in. A gem needs edge above zero.
// Each MOD keeps one bet per player and stat (its best edge) and logs whether the line is DraftKings' main or an alt rung.
import { BOOK, type Depth, type Log, type Quote, type Stat, type World, playerKey } from './world';

export type ModId = 'MOD4' | 'MOD5' | 'MOD6';
export interface Card<P> { mod: ModId; frozen: boolean; params: P }

export interface Gem {
  mod: string; week: number; gameId: string; playerId: string; player: string; stat: Stat; line: number; position: 'MAIN' | 'ALT';
  mainLine: number | null; price: number; implied: number; chance: number; edge: number; why: string;
  closePrice: number | null; rawClv: number | null; value: number | null; hit: boolean | null;
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
export const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : NaN; };
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const isOver = (q: Quote) => q.side === 'over' || q.side === 'yes';

/** DraftKings rungs per player and stat: every over or yes price, main market first when a line is on both. */
interface Rung { quote: Quote; position: 'MAIN' | 'ALT' }
interface Ladder { player: string; stat: Stat; mainLine: number | null; rungs: Rung[] }
function ladders(quotes: Quote[]): Ladder[] {
  const by = new Map<string, Ladder>();
  for (const q of quotes) {
    if (q.book !== BOOK || !isOver(q)) continue;
    const k = `${playerKey(q)}|${q.stat}`;
    const l = by.get(k) ?? { player: q.player, stat: q.stat, mainLine: null, rungs: [] };
    if (!q.alt) l.mainLine = q.line;
    const at = l.rungs.find((r) => r.quote.line === q.line);
    if (!at) l.rungs.push({ quote: q, position: q.alt ? 'ALT' : 'MAIN' });
    else if (!q.alt) { at.quote = q; at.position = 'MAIN'; }
    by.set(k, l);
  }
  for (const l of by.values()) {
    l.rungs.sort((a, b) => a.quote.line - b.quote.line);
    if (l.stat === 'anytime_td') { l.mainLine = 0.5; for (const r of l.rungs) r.position = 'MAIN'; }
  }
  return [...by.values()];
}

/** Hold assumed for a one-sided price: anytime TD, a main line with no under posted, or an alt rung. */
export interface Hold { td: number; main: number; alt: number }

/** A book's vig-free chance for an over: two-way when the book shows the under at that line, else the assumed hold. */
function fairChance(book: Quote[], q: Quote, hold: Hold): number {
  const opp = book.find((x) => x.stat === q.stat && x.line === q.line && x.alt === q.alt && playerKey(x) === playerKey(q) && !isOver(x))
    ?? book.find((x) => x.stat === q.stat && x.line === q.line && playerKey(x) === playerKey(q) && !isOver(x));
  if (opp) return (1 / q.price) / (1 / q.price + 1 / opp.price);
  const h = q.stat === 'anytime_td' ? hold.td : q.alt ? hold.alt : hold.main;
  return Math.min(0.99, (1 / q.price) / (1 + h));
}

/** Diagnostics only (never set by the harness): keep candidates at or below zero edge. */
export const DIAGNOSTIC = { keepAll: false };

function finish(mod: string, w: World, gameId: string, l: Ladder, r: Rung, chance: number, why: string): Gem | null {
  const playerId = w.matchPlayer(gameId, l.player);
  if (!playerId) return null;
  const q = r.quote;
  const implied = 1 / q.price;
  const edge = chance - implied;
  if (!(edge > 0) && !DIAGNOSTIC.keepAll) return null;
  const closeQuotes = w.close.get(gameId)?.quotes.filter((c) => c.book === BOOK && c.stat === q.stat && c.line === q.line && isOver(c) && playerKey(c) === playerKey(q)) ?? [];
  const closePrice = (closeQuotes.find((c) => c.alt === q.alt) ?? closeQuotes[0])?.price ?? null;
  const out = w.outcome(gameId, playerId, q.stat, q.line);
  return {
    mod, week: w.week, gameId, playerId, player: l.player, stat: q.stat, line: q.line, position: r.position, mainLine: l.mainLine,
    price: q.price, implied: round(implied), chance: round(chance), edge: round(edge), why,
    closePrice, rawClv: closePrice ? round(q.price / closePrice - 1) : null, value: out?.value ?? null, hit: out?.hit ?? null,
  };
}

/** Keeps each player and stat's best edge. */
function best(gems: (Gem | null)[]): Gem[] {
  const by = new Map<string, Gem>();
  for (const g of gems) {
    if (!g) continue;
    const k = `${g.gameId}|${g.playerId}|${g.stat}`;
    if ((by.get(k)?.edge ?? -1) < g.edge) by.set(k, g);
  }
  return [...by.values()];
}

/** At most n bets per player per game, best edges first. */
function perPlayer(gems: Gem[], n: number): Gem[] {
  const kept = new Map<string, Gem[]>();
  for (const g of [...gems].sort((a, b) => b.edge - a.edge)) {
    const k = `${g.gameId}|${g.playerId}`;
    if ((kept.get(k)?.length ?? 0) < n) kept.set(k, [...(kept.get(k) ?? []), g]);
  }
  return [...kept.values()].flat();
}

// ---------- MOD4, market only ----------

export interface Mod4Params {
  /** Smallest consensus minus DraftKings implied, as a chance. */
  margin: number;
  /** Other books needed at the exact line. */
  minBooks: number;
  minPrice: number;
  maxPrice: number;
  markets: Stat[];
  /** Hold assumed for a one-sided price. */
  hold: Hold;
}

export function mod4(w: World, p: Mod4Params): Gem[] {
  const gems: (Gem | null)[] = [];
  for (const g of w.games) {
    const snap = w.board.get(g.gameId);
    if (!snap) continue;
    const books = new Map<string, Quote[]>();
    for (const q of snap.quotes) if (q.book !== BOOK) books.set(q.book, [...(books.get(q.book) ?? []), q]);
    for (const l of ladders(snap.quotes)) {
      if (!p.markets.includes(l.stat)) continue;
      for (const r of l.rungs) {
        const q = r.quote;
        if (q.price < p.minPrice || q.price > p.maxPrice) continue;
        const fair: number[] = [];
        for (const [, bq] of books) {
          const same = bq.find((x) => x.stat === q.stat && x.line === q.line && isOver(x) && playerKey(x) === playerKey(q));
          if (same) fair.push(fairChance(bq, same, p.hold));
        }
        if (fair.length < p.minBooks) continue;
        const chance = median(fair);
        if (chance - 1 / q.price < p.margin) continue;
        gems.push(finish('MOD4', w, g.gameId, l, r, chance, `${fair.length} books, vig-free ${(chance * 100).toFixed(1)}% vs DraftKings ${(100 / q.price).toFixed(1)}%`));
      }
    }
  }
  return best(gems);
}

// ---------- MOD5, football only ----------

export interface Mod5Params {
  /** Recency: a game this many games back counts half. */
  halfLife: number;
  /** Exponent on the defense factor (yards or volume allowed to the position, against league average). */
  matchupWeight: number;
  /** Exponent on team implied points against the week's average. */
  scriptWeight: number;
  /** Exponent on the recent snap share against the player's weighted share. */
  trendWeight: number;
  minEdge: number;
  minGames: number;
  minPrice: number;
  maxPrice: number;
  markets: Stat[];
  /** Outcome shape for counts and yards. */
  shape: 'normal' | 'lognormal';
  /** Games of the position's per-snap rate (times the player's snap share) blended into his average. 0 is none. */
  shrinkGames: number;
  /** Bets per player per game, best edges first. 0 is no cap. */
  perPlayer: number;
  /** Games of the player's 2025 per game average blended in when he played 4+ games at the same position. */
  priorGames: number;
  /** Position and stat pairs the curve cannot price, as "QB|rush_yds" (kneels and scrambles pile up at zero). */
  skip: string[];
  /** Pass on any player on the injury report (a game status or a limited or missed practice): his role is in doubt. */
  blockInjured: boolean;
  /** Calibration slope on the chance in log-odds (1 is none, below 1 pulls claims toward even). */
  calibration: number;
  /** Pass on players with neither a 2025 season at the position nor 4 games this year: too little to project. */
  needHistory: boolean;
  /** Main lines only: the curve's tails are least trustworthy far out on the alt ladder. */
  mainOnly: boolean;
  /** Pass on a team's passing and receiving stats when its starting quarterback is Out or Doubtful: last month's targets came from someone else's arm. */
  skipQbOut: boolean;
}

const POS = (p: string) => (p === 'FB' ? 'RB' : p);
/** Pass volume barely follows implied points; everything else rises with it. */
const SCRIPT_SIGN: Record<Stat, number> = { anytime_td: 1, receptions: 0.5, reception_yds: 1, rush_yds: 1, pass_yds: 0.5, rush_reception_yds: 1, pass_rush_yds: 0.5, rush_attempts: 1, pass_completions: 0, pass_attempts: 0 };

interface Projector { project: (playerId: string, team: string, opp: string, stat: Stat, implied: number | null, avgImplied: number) => { mean: number; sd: number; games: number; pPos: number } | null }

function projector(logs: Log[], p: Mod5Params, last: World['lastSeason']): Projector {
  const byPlayer = new Map<string, Log[]>();
  for (const l of logs) byPlayer.set(l.playerId, [...(byPlayer.get(l.playerId) ?? []), l]);
  for (const v of byPlayer.values()) v.sort((a, b) => +a.kickoff - +b.kickoff);
  // Defense: per team game, what each position put up against that defense.
  const allowed = new Map<string, number[]>();
  const teamGames = new Map<string, Map<string, Record<Stat, number>>>();
  for (const l of logs) {
    const k = `${l.gameId}|${l.opponent}|${POS(l.position)}`;
    const m = teamGames.get(k) ?? new Map();
    const cur = m.get('sum') ?? Object.fromEntries(Object.keys(l.stats).map((s) => [s, 0]));
    for (const s of Object.keys(l.stats) as Stat[]) cur[s] += l.stats[s];
    m.set('sum', cur);
    teamGames.set(k, m);
  }
  const league = new Map<string, number[]>();
  for (const [k, m] of teamGames) {
    const [, opp, pos] = k.split('|');
    const sum = m.get('sum')!;
    for (const s of Object.keys(sum) as Stat[]) {
      allowed.set(`${opp}|${pos}|${s}`, [...(allowed.get(`${opp}|${pos}|${s}`) ?? []), sum[s]]);
      league.set(`${pos}|${s}`, [...(league.get(`${pos}|${s}`) ?? []), sum[s]]);
    }
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const defense = (opp: string, pos: string, s: Stat) => {
    const lg = mean(league.get(`${pos}|${s}`) ?? []);
    const a = allowed.get(`${opp}|${pos}|${s}`) ?? [];
    if (!lg) return 1;
    return (a.reduce((x, y) => x + y, 0) + 3 * lg) / (a.length + 3) / lg;
  };
  // Spread of outcomes: median coefficient of variation per position and stat, from players with 4+ games.
  const cvs = new Map<string, number[]>();
  for (const [, v] of byPlayer) {
    if (v.length < 4) continue;
    const pos = POS(v.at(-1)!.position);
    for (const s of Object.keys(v[0]!.stats) as Stat[]) {
      const xs = v.map((l) => l.stats[s]).filter((x) => x > 0);
      if (xs.length < 3) continue;
      const m = mean(xs);
      if (m <= 0.5) continue;
      const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
      cvs.set(`${pos}|${s}`, [...(cvs.get(`${pos}|${s}`) ?? []), sd / m]);
    }
  }
  // Per snap output by position, for the shrink toward a player's role.
  const perSnap = new Map<string, { stat: number; snaps: number }>();
  for (const l of logs) {
    if (l.snapPct == null || l.snapPct <= 0) continue;
    for (const s of Object.keys(l.stats) as Stat[]) {
      const k = `${POS(l.position)}|${s}`;
      const cur = perSnap.get(k) ?? { stat: 0, snaps: 0 };
      cur.stat += l.stats[s]; cur.snaps += l.snapPct;
      perSnap.set(k, cur);
    }
  }
  const tdPrior = (pos: string) => mean(league.get(`${pos}|anytime_td`) ?? []) / Math.max(1, pos === 'WR' ? 3 : pos === 'RB' ? 2 : 1.5);

  return {
    project(pid, team, opp, s, implied, avgImplied) {
      const v = (byPlayer.get(pid) ?? []).filter((l) => (l.snapPct ?? 1) > 0.05);
      if (v.length < p.minGames) return null;
      const pos = POS(v.at(-1)!.position);
      const w = v.map((_, i) => 0.5 ** ((v.length - 1 - i) / p.halfLife));
      const W = w.reduce((a, b) => a + b, 0);
      const snaps = v.map((l) => l.snapPct).filter((x): x is number => x != null);
      const wSnap = snaps.length ? v.reduce((a, l, i) => a + w[i]! * (l.snapPct ?? 0), 0) / W : null;
      const rate = perSnap.get(`${pos}|${s}`);
      const prior = rate && rate.snaps && wSnap != null ? (rate.stat / rate.snaps) * wSnap : null;
      const k = prior == null ? 0 : p.shrinkGames;
      const prev = last.get(pid);
      const k25 = prev && prev.games >= 4 && POS(prev.position) === pos ? p.priorGames : 0;
      if (p.needHistory && !k25 && v.length < 4) return null;
      const base = (v.reduce((a, l, i) => a + w[i]! * l.stats[s], 0) + k * (prior ?? 0) + k25 * (prev?.perGame[s] ?? 0)) / (W + k + k25);
      // Uncertainty in the average itself widens the spread: fewer effective games, wider.
      const nEff = W ** 2 / w.reduce((a, x) => a + x * x, 0) + k + k25;
      const lastSnap = v.at(-1)!.snapPct;
      const trend = wSnap && lastSnap != null ? Math.min(1.4, Math.max(0.6, lastSnap / wSnap)) ** p.trendWeight : 1;
      const script = implied && avgImplied ? (implied / avgImplied) ** (p.scriptWeight * SCRIPT_SIGN[s]) : 1;
      const matchup = defense(opp, pos, s) ** p.matchupWeight;
      if (p.skip.includes(`${pos}|${s}`)) return null;
      if (s === 'anytime_td') {
        const prior = tdPrior(pos);
        const rate = (v.reduce((a, l, i) => a + w[i]! * l.stats[s], 0) + 3 * prior + k25 * (prev?.perGame.anytime_td ?? 0)) / (W + 3 + k25);
        return { mean: rate * trend * script * matchup, sd: 0, games: v.length, pPos: 1 };
      }
      const m = base * trend * script * matchup;
      // Chance of any output at all (a receiver blanked, a back with no carries), shrunk toward 85%.
      const pPos = (v.reduce((a, l, i) => a + w[i]! * (l.stats[s] > 0 ? 1 : 0), 0) + 2 * 0.85) / (W + 2);
      const cv = median(cvs.get(`${pos}|${s}`) ?? [0.6]) || 0.6;
      // The curve prices the games with output: mean and spread conditional on more than zero.
      const cm = m / pPos;
      const sd = Math.max(cv * cm, s.includes('yds') ? 8 : 1) * (p.shrinkGames > 0 ? Math.sqrt(1 + 1 / nEff) : 1);
      return { mean: cm, sd, games: v.length, pPos };
    },
  };
}

/** Chance a stat beats the line. Lognormal keeps the right skew of yards and counts (the median sits below the mean). */
function overChance(line: number, mean: number, sd: number, shape: 'normal' | 'lognormal'): number {
  if (mean <= 0) return 0;
  if (shape === 'normal') return 1 - phi((line - mean) / sd);
  const s2 = Math.log(1 + (sd / mean) ** 2);
  return 1 - phi((Math.log(Math.max(line, 0.01)) - (Math.log(mean) - s2 / 2)) / Math.sqrt(s2));
}

export function mod5(w: World, p: Mod5Params): Gem[] {
  const proj = projector(w.logs, p, w.lastSeason);
  const lastTeam = new Map<string, string>();
  for (const l of [...w.logs].sort((a, b) => +a.kickoff - +b.kickoff)) lastTeam.set(l.playerId, l.team);
  const qbOut = new Set(w.depth.filter((d) => d.rank === 1 && d.pos === 'QB' && ['Out', 'Doubtful'].includes(w.injuries.get(d.gsis)?.status ?? '')).map((d) => d.team));
  const passing = new Set<Stat>(['receptions', 'reception_yds', 'pass_yds', 'pass_rush_yds', 'pass_completions', 'pass_attempts']);
  const implieds = [...w.scripts.values()].flatMap((s) => Object.values(s.implied));
  const avgImplied = implieds.reduce((a, b) => a + b, 0) / (implieds.length || 1);
  const gems: (Gem | null)[] = [];
  for (const g of w.games) {
    const snap = w.board.get(g.gameId);
    if (!snap) continue;
    const script = w.scripts.get(g.gameId) ?? null;
    for (const l of ladders(snap.quotes)) {
      if (!p.markets.includes(l.stat)) continue;
      const pid = w.matchPlayer(g.gameId, l.player);
      if (!pid) continue;
      const inj = w.injuries.get(pid);
      if (p.blockInjured && inj && (inj.status || /limited|did not/i.test(inj.practice ?? ''))) continue;
      const team = lastTeam.get(pid);
      if (!team || (team !== g.away && team !== g.home)) continue;
      if (p.skipQbOut && qbOut.has(team) && passing.has(l.stat)) continue;
      const opp = team === g.away ? g.home : g.away;
      const pr = proj.project(pid, team, opp, l.stat, script?.implied[team] ?? null, avgImplied);
      if (!pr) continue;
      for (const r of l.rungs) {
        const q = r.quote;
        if (q.price < p.minPrice || q.price > p.maxPrice) continue;
        if (p.mainOnly && r.position !== 'MAIN') continue;
        const raw = l.stat === 'anytime_td' ? 1 - Math.exp(-pr.mean) : pr.pPos * overChance(q.line, pr.mean, pr.sd, p.shape);
        const chance = sigmoid(p.calibration * logit(Math.min(0.995, Math.max(0.005, raw))));
        if (chance - 1 / q.price < p.minEdge) continue;
        gems.push(finish('MOD5', w, g.gameId, l, r, Math.min(0.97, chance), `projects ${l.stat === 'anytime_td' ? `${pr.mean.toFixed(2)} TDs` : `${(pr.mean * pr.pPos).toFixed(1)} (${Math.round(pr.pPos * 100)}% any)`} over ${pr.games} games`));
      }
    }
  }
  return p.perPlayer ? perPlayer(best(gems), p.perPlayer) : best(gems);
}

// ---------- MOD6, news only ----------

export interface Mod6Params {
  /** Log-odds shift on DraftKings' own vig-free chance, per event. */
  shift: { out: number; doubtful: number; promoted: number; dome: number };
  /** Alt rungs above the main line the MOD may climb. */
  reach: number;
  minPrice: number;
  maxPrice: number;
  /** Stats each inheriting position may be backed on. */
  stats: Record<'QB' | 'RB' | 'WR' | 'TE', Stat[]>;
  hold: Hold;
  /** Bets per inheriting player, best edges first. */
  perPlayer: number;
}

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
const posGroup = (pos: string) => (pos.includes('QB') ? 'QB' : pos.includes('RB') || pos === 'FB' ? 'RB' : pos.includes('WR') ? 'WR' : pos.includes('TE') ? 'TE' : pos);

export interface NewsEvent { team: string; gsis: string; player: string; kind: keyof Mod6Params['shift']; because: string; group: 'QB' | 'RB' | 'WR' | 'TE' }

/** Saturday events for every team: who inherits work, from the injury report and the last depth chart before the board. */
export function newsEvents(w: World): NewsEvent[] {
  const out: NewsEvent[] = [];
  const hurt = (gsis: string) => { const s = w.injuries.get(gsis)?.status; return s === 'Out' || s === 'Doubtful'; };
  const chart = (d: Depth[], team: string, group: string) => d.filter((x) => x.team === team && posGroup(x.pos) === group).sort((a, b) => a.rank - b.rank);
  const teams = new Set(w.games.flatMap((g) => [g.away, g.home]));
  for (const team of teams) {
    for (const group of ['QB', 'RB', 'WR', 'TE'] as const) {
      const now = chart(w.depth, team, group), prev = chart(w.depthPrev, team, group);
      const starters = new Set([...prev, ...now].filter((x) => x.rank === 1).map((x) => x.gsis));
      // A starter Out or Doubtful: the best healthy player at his spot inherits the work.
      for (const gsis of starters) {
        if (!hurt(gsis)) continue;
        const status = w.injuries.get(gsis)!.status!;
        const spot = [...prev, ...now].find((x) => x.gsis === gsis)!;
        const heir = now.filter((x) => x.gsis !== gsis && !hurt(x.gsis) && x.pos === spot.pos).sort((a, b) => a.rank - b.rank)[0]
          ?? now.filter((x) => x.gsis !== gsis && !hurt(x.gsis) && !starters.has(x.gsis)).sort((a, b) => a.rank - b.rank)[0];
        if (heir) out.push({ team, gsis: heir.gsis, player: heir.player, kind: status === 'Out' ? 'out' : 'doubtful', because: `${spot.player} ${status} (injury report), next at ${spot.pos} (depth chart)`, group });
      }
      // A backup promoted: first at his spot now, not first a week earlier.
      for (const x of now.filter((d) => d.rank === 1)) {
        const before = prev.find((d) => d.gsis === x.gsis && d.pos === x.pos);
        if (before && before.rank > 1) out.push({ team, gsis: x.gsis, player: x.player, kind: 'promoted', because: `${x.pos} ${before.rank} to 1 (depth chart)`, group });
      }
    }
  }
  // Dome: an outdoor home team playing under a fixed roof. Passing and receiving only.
  const homeRoof = w.homeRoof;
  for (const g of w.games) {
    if (w.roof.get(g.gameId) !== 'dome') continue;
    for (const team of [g.away, g.home]) {
      if (team === g.home) continue;
      if (homeRoof.get(team) !== 'outdoors') continue;
      for (const d of w.depth.filter((x) => x.team === team && x.rank === 1 && ['QB', 'WR', 'TE'].includes(posGroup(x.pos)))) {
        out.push({ team, gsis: d.gsis, player: d.player, kind: 'dome', because: `outdoor team indoors (roof ${w.roof.get(g.gameId)})`, group: posGroup(d.pos) as NewsEvent['group'] });
      }
    }
  }
  return out;
}

export function mod6(w: World, p: Mod6Params): Gem[] {
  const events = newsEvents(w);
  const byPlayer = new Map<string, NewsEvent[]>();
  for (const e of events) byPlayer.set(e.gsis, [...(byPlayer.get(e.gsis) ?? []), e]);
  const gems: (Gem | null)[] = [];
  for (const g of w.games) {
    const snap = w.board.get(g.gameId);
    if (!snap) continue;
    const dk = snap.quotes.filter((q) => q.book === BOOK);
    for (const l of ladders(snap.quotes)) {
      const pid = w.matchPlayer(g.gameId, l.player);
      const evs = pid ? byPlayer.get(pid) : undefined;
      if (!evs) continue;
      // Volume events back the inheritor's own stats; the dome backs passing and receiving only.
      const allowed = new Set(evs.flatMap((e) => (e.kind === 'dome' ? p.stats[e.group].filter((s) => ['pass_yds', 'receptions', 'reception_yds', 'pass_completions'].includes(s)) : p.stats[e.group])));
      if (!allowed.has(l.stat)) continue;
      const shift = evs.reduce((a, e) => a + p.shift[e.kind], 0);
      if (!(shift > 0)) continue;
      const mainIdx = Math.max(0, l.rungs.findIndex((r) => r.quote.line === l.mainLine));
      for (const [i, r] of l.rungs.entries()) {
        if (i < mainIdx || i > mainIdx + p.reach) continue;
        const q = r.quote;
        if (q.price < p.minPrice || q.price > p.maxPrice) continue;
        const own = fairChance(dk, q, p.hold);
        const chance = sigmoid(logit(own) + shift);
        gems.push(finish('MOD6', w, g.gameId, l, r, chance, evs.map((e) => e.because).join('; ')));
      }
    }
  }
  return perPlayer(best(gems), p.perPlayer);
}

export { SKILL };
