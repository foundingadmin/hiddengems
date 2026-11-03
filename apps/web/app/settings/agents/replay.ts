// What the replay shows after step i (-1 is before the first step): tokens so far by node, each node's state
// line, the edges already walked, and the run's totals. Ported from the prototype's fPaint.
import type { Flow } from './flows';

export const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function totals(flow: Flow) {
  const tot: Record<string, number> = {};
  for (const s of flow.steps) for (const [a, v] of Object.entries(s.k)) tot[a] = (tot[a] ?? 0) + v;
  return tot;
}

export function stateAt(flow: Flow, i: number) {
  const tokens: Record<string, number> = {}, states: Record<string, string> = {}, past = new Set<string>();
  flow.steps.forEach((s, j) => {
    if (j > i) return;
    for (const [a, v] of Object.entries(s.k)) tokens[a] = (tokens[a] ?? 0) + v;
    Object.assign(states, s.st);
    if (s.edge) past.add(s.edge);
  });
  const cur = i >= 0 ? flow.steps[i] : undefined;
  const busy = (id: string) => !!cur && !cur.skip && (cur.who === id || cur.k[id] !== undefined);
  return { cur, tokens, states, past, busy };
}

/** Nodes that spend tokens, in map order: the stacked bar's segments and the meters' scale. */
export const spenders = (flow: Flow) => Object.keys(flow.nodes).filter((id) => flow.nodes[id]!.model);

/** Everything but the people and staging: the agents table's rows. */
export const roster = (flow: Flow) => Object.keys(flow.nodes).filter((id) => flow.nodes[id]!.kind !== 'person' && id !== 'staging');

export function links(flow: Flow, id: string) {
  const name = (n: string) => flow.nodes[n]!.name;
  const uniq = (xs: string[]) => [...new Set(xs)].join(', ');
  return {
    from: uniq(flow.edges.filter((e) => e.to === id || (e.both && e.from === id)).map((e) => name(e.both && e.from === id ? e.to : e.from))),
    to: uniq(flow.edges.filter((e) => e.from === id || (e.both && e.to === id)).map((e) => name(e.both && e.to === id ? e.from : e.to))),
  };
}

export const runsOn = (flow: Flow, id: string) => {
  const n = flow.nodes[id]!;
  return n.session ? 'Open session' : n.model === 'Lead' ? 'Lead model' : n.model ?? n.runsOn ?? 'Script';
};
