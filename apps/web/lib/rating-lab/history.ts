// Changes to the gem rating and the model, newest first. Each entry is backed by a repo fact: an owner
// decision recorded in docs/prd.md or docs/architecture.md, or the commit that changed packages/core.
// Add an entry in the same pull request as any change to packages/core/src/gems.ts or model.ts.

const REPO = 'https://github.com/foundingadmin/hiddengems';

export interface HistoryEntry {
  /** Calendar date the change was made or approved, as the source records it. */
  date: string;
  /** Owner decisions read as "You"; code changes as "Model". */
  actor: 'decision' | 'code';
  /** The changed thing, set in strong text, then the rest of the sentence. */
  subject: string;
  text: string;
  /** Where the change is recorded. */
  source: { label: string; href: string; mono?: boolean };
}

const commit = (sha: string) => ({ label: sha, href: `${REPO}/commit/${sha}`, mono: true });
const doc = (label: string, path: string) => ({ label, href: `${REPO}/blob/main/${path}` });

export const HISTORY: readonly HistoryEntry[] = [
  {
    date: '2026-11-03', actor: 'code', subject: 'Old pipeline',
    text: 'retired; the app now reads every prop, and the pipeline picks history moved to docs/archive.',
    source: commit('fc7eddd'),
  },
  {
    date: '2026-11-03', actor: 'decision', subject: "Fool's Gold",
    text: 'narrowed to props that beat the fair price but not the posted price; beating neither is no gem. The rating keeps carat, while the Edge column shows the gap to the priced chance.',
    source: doc('Architecture', 'docs/architecture.md'),
  },
  {
    date: '2026-11-03', actor: 'code', subject: 'New gems',
    text: 'row added: a gem joins when its rating reaches 90 or rises 15 since it was found or read.',
    source: commit('8ef17cb'),
  },
  {
    date: '2026-11-03', actor: 'code', subject: 'Hidden Gems v3.0',
    text: 'ported from hgs.py into core; fair chance became the implied chance times one minus the cut, matching the old pipeline to 1e-9 on Week 8.',
    source: commit('1d1c5df'),
  },
  {
    date: '2026-11-02', actor: 'code', subject: 'Rating rules',
    text: "moved into core: the posted price gate, Fool's Gold, unrated without 2026 stats, the Recommended order, the assumed cut and clarity out of 100.",
    source: commit('fa85ef0'),
  },
  {
    date: '2026-11-02', actor: 'decision', subject: 'Rating formula',
    text: 'approved: edge times clarity for the number, hit chance times clarity for the board order. Revisit after Week 9 grades.',
    source: doc('PRD 8', 'docs/prd.md'),
  },
  {
    date: '2026-11-02', actor: 'decision', subject: 'One rating',
    text: 'replaced the four gem tiers (rough, cut, polished, flawless), with purple deepening as the number rises.',
    source: { label: 'PR 4', href: `${REPO}/pull/4` },
  },
  {
    date: '2026-11-02', actor: 'decision', subject: 'Implied team points',
    text: 'added to v3.0 at exponent 1.0 after the Weeks 4 to 8 backtest scored 0.1360 against 0.1371 without it.',
    source: doc('PRD 11.8', 'docs/prd.md'),
  },
];
