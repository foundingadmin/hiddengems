// The MOD4, MOD5 and MOD6 section of experiments/backtest/README.md, written from the frozen cards, the tailoring runs
// and the sealed results in experiments/mods. report.ts puts it first.
import { existsSync, readFileSync } from 'node:fs';
import { ROOT } from '../paths';

const DIR = `${ROOT}/experiments/mods`;
const pct = (x: number | null, d = 1) => (x === null ? 'n/a' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(d)}%`);
interface S { gems: number; graded: number; hits: number; expected: number; z: number | null; roi: number | null; rawClv: number | null; perWeek: number }
const row = (name: string, s: S, extra = '') => `| ${name} | ${s.gems} | ${s.hits} of ${s.graded} | ${s.expected} | ${s.z ?? 'n/a'} | ${pct(s.roi)} | ${pct(s.rawClv, 2)} |${extra}`;
const READS: Record<string, string> = {
  MOD4: 'Market only. DraftKings against the vig-free median of the other books at the same line. No player stats.',
  MOD5: 'Football only. Projects each stat from recency weighted games, the 2025 season, the defense against the position and team implied points. No other books.',
  MOD6: 'News only. Backs whoever inherits the work when a starter is Out or Doubtful (injury report plus depth chart), on DraftKings\' own vig-free chance shifted for the event. No projections, no other books.',
};

export function modsSection(): string[] {
  if (!existsSync(`${DIR}/sealed/results.json`)) return [];
  const r = JSON.parse(readFileSync(`${DIR}/sealed/results.json`, 'utf8'));
  const spend = existsSync(`${ROOT}/experiments/backtest/history-spend.json`) ? JSON.parse(readFileSync(`${ROOT}/experiments/backtest/history-spend.json`, 'utf8')) : [];
  const L: string[] = [];
  const mods = ['MOD4', 'MOD5', 'MOD6'];
  const pass = (s: S) => (s.graded && s.hits > s.expected && (s.roi ?? -1) > 0 ? 'pass' : 'fail');

  L.push('## MOD4, MOD5 and MOD6', '');
  L.push('Three MODs kept apart by what each may read, tailored on Weeks 2 to 6, frozen, then run once on sealed Weeks 7 and 8 with MOD2 (main today) alongside as the control. Every game counts (Thursday, Sunday, Monday) across ten bet types. Edge is the MOD\'s chance minus DraftKings\' implied chance with the vig in, and a gem needs edge above zero. Each MOD keeps one bet per player and stat, and every gem logs its line position (MAIN or ALT) and the DraftKings main line. Passing means more hits than the book expected and a positive flat $1 ROI.', '');

  L.push('### Sealed Weeks 7 and 8', '');
  L.push('| MOD | Gems | Hits | Book expected | z | Flat ROI | Raw CLV | Verdict |', '|---|---|---|---|---|---|---|---|');
  for (const m of [...mods, 'MOD2']) L.push(`${row(m === 'MOD2' ? 'MOD2 control' : m, r.summary[m])} ${pass(r.summary[m])} |`);
  L.push('');
  L.push(`Raw CLV is the price taken over DraftKings' price at the close, minus one, so above zero means the line moved toward the pick. MOD2 reads only its four markets. Gem overlap (shared game, player and stat, as a share of the smaller MOD) is ${Object.entries(r.overlap).map(([k, v]) => `${k.replace(' ', ' and ')} ${Math.round((v as number) * 100)}%`).join(', ')}.`, '');

  L.push('### By market, sealed', '');
  L.push('| MOD | Market | Gems | Hits | Book expected | z | Flat ROI | Raw CLV |', '|---|---|---|---|---|---|---|---|');
  for (const m of [...mods, 'MOD2']) for (const [st, s] of Object.entries(r.byMarket[m])) L.push(`| ${m} |${row(st, s as S).slice(1)}`);
  L.push('');

  L.push('### The cards', '');
  for (const m of mods) {
    const card = JSON.parse(readFileSync(`${DIR}/${m}-card.json`, 'utf8'));
    const t = card.tailoring.final as S;
    L.push(`**${m}** · ${READS[m]} Frozen after ${card.tailoring.runs} of 15 runs, sha256 \`${r.cards[m].sha256.slice(0, 16)}\`. Weeks 2 to 6 at the freeze had ${t.gems} gems (${t.perWeek} a week), ${t.hits} hits against ${t.expected} expected, ROI ${pct(t.roi)}, raw CLV ${pct(t.rawClv, 2)}. Card \`experiments/mods/${m}-card.json\`, log \`experiments/mods/${m}-log.md\`.`, '');
  }

  L.push('### Tailoring and the seal', '');
  L.push('- Every run wrote its line in the MOD\'s log before it ran, and `ops/backtest/mods/harness.ts` refuses a run without a pending line or past 15. A count-only mode sizes a card by gems a week without reading outcomes or closes, and is not a run.');
  L.push('- Weeks 7 and 8 open only through `--sealed`, which checks each card is frozen and its sha256 matches the hash given, then runs once and refuses a second time. The cards and their hashes were committed before the unseal.');
  L.push('- The guard from the first backtest holds for every input. Box scores are stamped at kickoff, each team\'s injury report at its final report (Wednesday for Thursday games, Friday for Sunday, Saturday for Monday) and depth charts at their snapshot. Spreads and totals come from the Saturday (or Wednesday) board itself, so MOD5\'s game script carries no closing line.');
  L.push('- MOD5 run 8 ran at a 26 point edge floor while its log line says 22. The note sits under it in the log.');
  L.push('- The first backtest\'s MOD2 Sunday results for Weeks 7 and 8 were published before this brief. MOD4, MOD5 and MOD6 never saw those weeks.');
  L.push('- Samples are small (a few dozen sealed gems per MOD). A z between minus 2 and plus 2 is noise, so a pass or fail here is a direction, not a verdict.', '');

  L.push('### The history buy', '');
  const spent = spend.reduce((a: number, x: { spent: number }) => a + x.spent, 0);
  L.push(`- ${spent.toLocaleString('en-US')} credits on the 100K plan (cap 36,000, dry run upper bound 32,907), ${spend.at(-1)?.remaining ? Number(spend.at(-1).remaining).toLocaleString('en-US') : 'unknown'} left this month.`);
  L.push('- Weeks 2 to 8, 105 games (91 Sunday, 7 Thursday, 7 Monday), board and close for each. Sunday games added 15 keys (pass yards, rush plus receiving yards, pass plus rush yards, rush attempts, pass completions and pass attempts, main and alt, plus main receptions, receiving yards and rushing yards). Thursday and Monday games took all 19. Spreads and totals for every game at each board.');
  L.push('- DraftKings posted every key at every board and close except pass plus rush yards main (Week 2 Browns at Buccaneers, Week 7 Rams at Raiders) and its alt ladder (Week 7 Rams at Raiders).');
  L.push('- Stored in `foundingadmin/hiddengems-backups` at `capsules/2026/wkNN/{sat,close}/odds/<gameId>.json.gz` (240 files, 4 MB), each holding the merged event and the original responses. A Thursday game\'s Wednesday board sits under `sat` as its board.', '');
  L.push('### Run it again, 0 credits', '');
  L.push('```');
  L.push('git clone https://github.com/foundingadmin/hiddengems-backups /tmp/backups   # private');
  L.push('packages/ingest/node_modules/.bin/tsx ops/backtest/capsule-io.ts import /tmp/backups');
  L.push('packages/ingest/node_modules/.bin/tsx ops/backtest/mods/harness.ts --mod MOD4 --count');
  L.push('```', '');
  return L;
}
