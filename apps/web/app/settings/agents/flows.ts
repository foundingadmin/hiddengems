// The principal's "Agent workflow" prototype as data: three versions of the sprint flow, each with its map
// (nodes on a column and row grid, edges), a step-by-step replay with tokens (k, in thousands) and the state
// each node shows after the step (st), then the findings against the optimized flow and the gaps it opens.
// Static on purpose: nothing here is fetched.

export type VersionKey = 'opt' | 'tight' | 'written';
export type EdgeKind = 'forward' | 'return' | 'escalate';
export type EdgeShape = 'up' | 'down' | 'under' | 'over';

export interface FlowNode {
  col: number;
  /** -1 sits above the main row, 0 is the main row, 1 below it. */
  row: number;
  name: string;
  role: string;
  /** person: where the flow starts and ends. script: a script or a role inside another agent, never a spawn. */
  kind?: 'person' | 'script';
  model?: 'Lead' | 'Sonnet';
  /** A role the open session plays, not a spawned agent. */
  session?: boolean;
  isNew?: boolean;
  /** Tag and "Runs on" text for script nodes, which have no model. */
  tag?: string;
  runsOn?: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: EdgeKind;
  shape?: EdgeShape;
  depth?: number;
  /** Arrows at both ends: a two-way check. */
  both?: boolean;
}

export interface FlowStep {
  who: string;
  edge: string | null;
  /** Tokens spent in this step, in thousands, by node id. */
  k: Record<string, number>;
  text: string;
  /** The state line each node shows from this step on. */
  st: Record<string, string>;
  note?: string;
  /** A branch the scenario does not take; it stays in the list so the order reads the same. */
  skip?: boolean;
}

export interface Flow {
  title: string;
  sub: string;
  /** Spawned agents, when that differs from the nodes with a model. */
  agents?: number;
  nodes: Record<string, FlowNode>;
  edges: FlowEdge[];
  steps: FlowStep[];
  changes?: { title: string; body: string }[];
  scale?: string;
  notIn: string;
}

export type FindingStatus = 'solved' | 'partly' | 'open';
export interface Finding { id: string; title: string; body: string; status: FindingStatus; how: string }

export const VERSIONS: VersionKey[] = ['opt', 'tight', 'written'];

export const FLOWS: Record<VersionKey, Flow> = {
  opt: {
    title: 'Optimized',
    sub: 'Two staging comments, then go: one built, one parked',
    agents: 3,
    nodes: {
      p0: { col: 0, row: 0, name: 'principal', kind: 'person', role: 'Leaves comments on the staging preview, then types go in the open Claude session.' },
      triage: { col: 1, row: 0, name: 'triage', model: 'Lead', session: true, role: 'Session role. Reads every open thread, files sprint.json with lane, file group and size, dispatches builders.' },
      park: { col: 1, row: 1, name: 'park', model: 'Lead', session: true, role: 'Session role. Adds a roadmap line and replies on each parked thread. No spawn.' },
      builder: { col: 2, row: 0, name: 'builder', model: 'Lead', role: 'One per file group, in parallel. Size S runs on Sonnet. Scripts check the mechanical rules before it stops.' },
      merge: { col: 3, row: 0, name: 'merge', model: 'Lead', session: true, role: 'Session role. Merges every branch into one sprint branch and runs CI once. Scripts do the work.' },
      fixer: { col: 3, row: 1, name: 'CI fixer', model: 'Sonnet', role: 'Spawned only when CI fails. Fixes from the traces, never sends work back.' },
      verifier: { col: 4, row: -1, name: 'verifier', model: 'Lead', isNew: true, role: 'One review of the whole sprint branch, from the builders’ screenshots. One punchlist, grouped by owner.' },
      staging: { col: 5, row: 0, name: 'staging', role: 'Moves once per sprint, so it deploys once.' },
      p1: { col: 6, row: 0, name: 'principal', kind: 'person', role: 'Sees every built thread resolved on staging, and parked ones answered.' },
    },
    edges: [
      { id: 'c', from: 'p0', to: 'triage', label: 'Comments, then go', kind: 'forward' },
      { id: 'pk', from: 'triage', to: 'park', label: 'Parked', kind: 'forward' },
      { id: 'rp', from: 'park', to: 'p1', label: 'Reply on parked thread', kind: 'escalate', shape: 'under', depth: 70 },
      { id: 'rl', from: 'park', to: 'merge', label: 'Roadmap line', kind: 'forward' },
      { id: 't', from: 'triage', to: 'builder', label: 'Spawn', kind: 'forward' },
      { id: 'h', from: 'builder', to: 'merge', label: 'Branch + trace', kind: 'forward' },
      { id: 'fx', from: 'merge', to: 'fixer', label: 'Only if CI fails', kind: 'return' },
      { id: 'v', from: 'merge', to: 'verifier', label: 'Sprint branch', kind: 'forward', shape: 'up' },
      { id: 'pl', from: 'verifier', to: 'builder', label: 'Punchlist items, by owner', kind: 'return', shape: 'over', depth: 70 },
      { id: 'm', from: 'merge', to: 'staging', label: 'Fast-forward', kind: 'forward' },
      { id: 'r', from: 'staging', to: 'p1', label: 'Resolved', kind: 'forward' },
    ],
    steps: [
      { who: 'p0', edge: 'c', k: {}, text: 'You leave two comments on the staging preview, then type go in your open Claude session.', st: { p0: '2 comments + go' } },
      { who: 'triage', edge: null, k: { triage: 22 }, text: 'The session reads every open thread and files sprint.json: comment 1 routed (lane, file group, size M), comment 2 parked with its reason. It reacts on each thread.', st: { triage: '1 routed · 1 parked' } },
      { who: 'park', edge: 'pk', k: { park: 3 }, text: 'Still in the session, which already read the thread: park writes the roadmap line. No spawn, no cold start.', st: { park: 'Roadmap line written' } },
      { who: 'park', edge: 'rp', k: { park: 1 }, text: 'Park replies on the parked thread with why it waits and where it went on the roadmap.', st: { park: 'Thread answered' } },
      { who: 'builder', edge: 't', k: { triage: 2 }, text: 'Triage spawns one builder per file group, all at once. Size picks the model: S on Sonnet, M and L on the lead model.', st: { triage: '1 builder out' } },
      { who: 'builder', edge: null, k: { builder: 88 }, text: 'Builder branches from staging, builds (Facet parts in the same branch), runs pnpm check with the word and color linters, and screenshots its routes.', st: { builder: 'Built, checks green' } },
      { who: 'builder', edge: 'h', k: { builder: 2 }, text: 'Builder pushes, writes a short trace into sprint.json, and goes idle. It is not closed, so it can be resumed later.', st: { builder: 'Idle, resumable' } },
      { who: 'merge', edge: 'rl', k: { merge: 3 }, text: 'Once every builder is done, the session merges all branches and the roadmap line into one sprint branch and runs CI once.', st: { merge: 'Sprint branch, CI green' } },
      { who: 'merge', edge: 'fx', k: {}, text: 'If CI fails, the session spawns one CI fixer with the traces. It fixes and pushes; nothing goes back to builders.', st: {}, note: 'CI is green.', skip: true },
      { who: 'verifier', edge: 'v', k: { verifier: 70 }, text: 'One verifier reviews the whole sprint branch once, from the builders’ screenshots and the diff, running the app only on doubt. It writes one punchlist grouped by owner.', st: { verifier: 'Punchlist: 2 items' }, note: 'One review per sprint, not per branch. It also catches clashes between branches.' },
      { who: 'builder', edge: 'pl', k: { builder: 16, verifier: 1 }, text: 'The session resumes each owning builder with its items. It keeps its context, so it pays only for the fix.', st: { verifier: 'Done, stops', builder: 'Fixing 2 items' } },
      { who: 'builder', edge: 'h', k: { builder: 2, merge: 2 }, text: 'Builder pushes a new commit and stops. The session re-merges the sprint branch; CI stays green.', st: { builder: 'Done, stops', merge: 'Re-merged, CI green' }, note: 'Accepted risk: fixes are not re-reviewed. CI and your staging review are the backstop.' },
      { who: 'merge', edge: 'm', k: { merge: 2 }, text: 'The session fast-forwards staging to the sprint branch: one deploy for the whole sprint. It resolves each built thread and closes sprint.json.', st: { merge: 'Done', staging: 'Sprint deployed' } },
      { who: 'p1', edge: 'r', k: {}, text: 'Every agent has stopped. The session tells you the sprint is live.', st: { p1: 'Notified', triage: 'Done', park: 'Done' } },
      { who: 'p1', edge: null, k: {}, text: 'You refresh staging and review.', st: { p1: 'Reviewing staging' } },
    ],
    changes: [
      { title: 'One verifier per sprint, not per branch', body: 'It reviews the merged sprint branch once, sees clashes between branches, and pays one cold start. At 8 comments in 5 file groups this replaces 5 reviews with 1.' },
      { title: 'Punchlist goes back by resuming the builder', body: 'The owner keeps its context and pays only for the fix, instead of a fresh agent relearning the branch.' },
      { title: 'Merging is a session role, not an agent', body: 'Merging and CI are scripts. A CI fixer is spawned only when CI actually fails, so a green sprint has no staging builder at all.' },
      { title: 'One file, sprint.json', body: 'Expected list, status and traces in one place. The queue file and the comparison step go away: the session already knows when every builder is done.' },
      { title: 'Parking stays in the session', body: 'The session already read the parked thread. A roadmap line and a reply cost about 4k there, against about 21k for a spawned agent.' },
      { title: 'Size picks the builder’s model', body: 'Triage marks each task S, M or L. Small copy and spacing fixes run on Sonnet.' },
      { title: 'Scripts check the mechanical rules', body: 'Em dashes, colons in headings, raw colors and generated files fail pnpm check in the builder, so the verifier only judges.' },
      { title: 'Staging moves once per sprint', body: 'One fast-forward means one deploy and one review for you. A branch that is not ready can be dropped from the sprint branch without blocking the rest.' },
    ],
    scale: 'At 8 comments in 5 file groups: about 0.75M here, against about 1.2M for Tightened.',
    notIn: 'Spawned agents: builders, one verifier, and a CI fixer only when CI fails. Everything else is your open session plus scripts.',
  },
  tight: {
    title: 'Tightened',
    sub: 'Two staging comments, then go: one built, one parked',
    nodes: {
      p0: { col: 0, row: 0, name: 'principal', kind: 'person', role: 'Leaves comments on the staging preview, then types go in the open Claude session.' },
      triage: { col: 1, row: 0, name: 'triage session', model: 'Lead', isNew: true, role: 'Your open Claude session. On go, reads every open thread, files sprint.json, spawns every agent after it.' },
      dispatch: { col: 2, row: 0, name: 'dispatch', kind: 'script', tag: 'Role, no spawn', runsOn: 'Role in triage', role: 'A role inside the triage session, not a spawn. One builder per file group, all at once.' },
      park: { col: 2, row: 1, name: 'park agent', model: 'Sonnet', isNew: true, role: 'Turns parked entries into ROADMAP.md lines on a branch and replies on their threads.' },
      builder: { col: 3, row: 0, name: 'builder', model: 'Lead', role: 'Screen, data or Facet work. Missing Facet parts go in the same branch.' },
      verifier: { col: 4, row: -1, name: 'verifier', model: 'Lead', isNew: true, role: 'One content and design check. Reviews once, returns one punchlist.' },
      files: { col: 5, row: 0, name: 'sprint files', kind: 'script', isNew: true, tag: 'Script, no model', runsOn: 'Script', role: 'sprint.json (expected) and queue.json (ready). Read by the triage session; no model.' },
      sb: { col: 6, row: 0, name: 'staging builder', model: 'Sonnet', isNew: true, role: 'Spawned when a batch is ready. One merge, one CI run, fixes CI from the traces.' },
      staging: { col: 7, row: 0, name: 'staging', role: 'The staging preview with every merged update deployed.' },
      p1: { col: 8, row: 0, name: 'principal', kind: 'person', role: 'Sees every thread resolved on staging, and the parked one answered.' },
    },
    edges: [
      { id: 'c', from: 'p0', to: 'triage', label: 'Comments, then go', kind: 'forward' },
      { id: 'sj', from: 'triage', to: 'dispatch', label: 'Routed', kind: 'forward' },
      { id: 'pk', from: 'triage', to: 'park', label: 'Parked', kind: 'forward' },
      { id: 'x', from: 'triage', to: 'files', label: 'sprint.json', kind: 'forward', shape: 'over', depth: 330 },
      { id: 't', from: 'dispatch', to: 'builder', label: 'Spawn', kind: 'forward' },
      { id: 'v', from: 'builder', to: 'verifier', label: 'Branch', kind: 'forward', shape: 'up' },
      { id: 'pl', from: 'verifier', to: 'builder', label: 'Punchlist', kind: 'return', shape: 'down' },
      { id: 'h', from: 'builder', to: 'files', label: 'Branch + trace', kind: 'forward' },
      { id: 'rb', from: 'park', to: 'files', label: 'Roadmap branch', kind: 'forward' },
      { id: 'rp', from: 'park', to: 'p1', label: 'Reply on parked thread', kind: 'escalate', shape: 'under', depth: 70 },
      { id: 'w', from: 'files', to: 'sb', label: 'Batch', kind: 'forward' },
      { id: 'd', from: 'sb', to: 'files', label: 'Merged', kind: 'return', shape: 'under', depth: 50 },
      { id: 'm', from: 'sb', to: 'staging', label: 'Merge', kind: 'forward' },
      { id: 'r', from: 'staging', to: 'p1', label: 'Resolved', kind: 'forward' },
    ],
    steps: [
      { who: 'p0', edge: 'c', k: {}, text: 'You leave two comments on the staging preview, then type go in your open Claude session.', st: { p0: '2 comments + go' } },
      { who: 'triage', edge: null, k: { triage: 40 }, text: 'Triage reads every open thread and files sprint.json: comment 1 routed (lane, size, file group), comment 2 parked with its reason. It reacts on each thread so you see it was picked up.', st: { triage: 'Filed 1 routed · 1 parked' } },
      { who: 'triage', edge: 'x', k: { triage: 1 }, text: 'sprint.json is the expected list for the sprint.', st: { files: 'Expected 2 · queued 0' } },
      { who: 'dispatch', edge: 't', k: { triage: 3, builder: 0 }, text: 'Dispatch, a role inside the triage session, spawns one builder per file group, all at once. No extra agent, no extra cold start.', st: { dispatch: '1 builder spawned' } },
      { who: 'park', edge: 'pk', k: { park: 14 }, text: 'In parallel, triage spawns the park agent with the parked entries.', st: { park: 'Writing' } },
      { who: 'park', edge: 'rp', k: { park: 4 }, text: 'Park agent replies on the parked thread with why it waits and where it went on the roadmap.', st: { park: 'Thread answered' } },
      { who: 'park', edge: 'rb', k: { park: 3 }, text: 'Park agent writes the ROADMAP.md line on its own branch, adds it to queue.json, and stops.', st: { park: 'Done, stops', files: 'Expected 2 · queued 1' } },
      { who: 'builder', edge: 'v', k: { builder: 95 }, text: 'Builder branches from staging, builds, and pushes. Any Facet part it needs is built in the same branch. No PR.', st: { builder: 'Branch pushed, in review' } },
      { who: 'verifier', edge: null, k: { verifier: 85 }, text: 'Verifier checks content and design once and writes one punchlist. CI scripts cover the mechanical rules.', st: { verifier: 'Punchlist written' }, note: 'Accepted risk: a punchlist fix is not re-reviewed. CI and your review on staging are the backstop.' },
      { who: 'verifier', edge: 'pl', k: { verifier: 2 }, text: 'Verifier hands the punchlist to the builder and stops.', st: { verifier: 'Done, stops' } },
      { who: 'builder', edge: null, k: { builder: 22 }, text: 'Builder applies every punchlist item and pushes a new commit on the same branch. No force push.', st: { builder: 'Punchlist done' } },
      { who: 'builder', edge: 'h', k: { builder: 2 }, text: 'Builder writes a short trace, adds its branch to queue.json, and stops.', st: { builder: 'Done, stops', files: 'Expected 2 · queued 2' } },
      { who: 'sb', edge: 'w', k: { triage: 2, sb: 14 }, text: 'The builder finishing wakes the triage session, which spawns the staging builder with the ready batch. Nothing polls; the session costs nothing while it waits.', st: { sb: 'Holding 2 branches' } },
      { who: 'sb', edge: 'm', k: { sb: 26 }, text: 'Staging builder merges both branches into staging with one CI run. On a CI error it fixes it itself from the traces and never sends work back.', st: { sb: 'Merged, CI green', staging: '2 merged, deployed' }, note: 'A CI fix adds about 15k to 30k.' },
      { who: 'sb', edge: 'd', k: { sb: 1 }, text: 'Staging builder records the merge in queue.json and stops.', st: { sb: 'Done, stops', files: 'Merged 2 = expected 2' } },
      { who: 'triage', edge: 'r', k: { triage: 2 }, text: 'Triage sees merged matches expected, resolves the built comment’s thread, and stops. The sprint is done.', st: { triage: 'Done, stops', p1: 'Threads updated' } },
      { who: 'p1', edge: null, k: {}, text: 'You refresh staging: the fix is live, its thread resolved, and the parked comment has its answer.', st: { p1: 'Reviewing staging' } },
    ],
    notIn: 'Needs one open Claude session that you type go in. No webhooks, relays or new secrets.',
  },
  written: {
    title: 'As written',
    sub: 'One toolbar comment on the staging preview',
    nodes: {
      p0: { col: 0, row: 0, name: 'principal', kind: 'person', role: 'Leaves one toolbar comment on the staging preview.' },
      triage: { col: 1, row: 0, name: 'triage', model: 'Sonnet', role: 'Sees each comment, sends it to the right builder, keeps the list of tasks it handed out.' },
      builder: { col: 2, row: 0, name: 'builder', model: 'Lead', role: 'Screen, data or Facet builder, whichever the comment needs. Own branch, no PR, keeps a trace.' },
      verifier: { col: 3, row: -1, name: 'verifier', model: 'Lead', isNew: true, role: 'One combined content and design check. Reviews once, returns one punchlist.' },
      desk: { col: 4, row: 0, name: 'staging front desk', model: 'Sonnet', isNew: true, role: 'Logs every branch and trace stub, keeps the backlog in merge order, hands out one branch at a time.' },
      sb: { col: 5, row: 0, name: 'staging builder', model: 'Sonnet', isNew: true, role: 'Merges one branch at a time into staging and fixes CI itself from the trace. Never sends work back.' },
      staging: { col: 6, row: 0, name: 'staging', role: 'The staging preview with every merged update deployed.' },
      p1: { col: 7, row: 0, name: 'principal', kind: 'person', role: 'Reviews every addressed comment, live on staging.' },
    },
    edges: [
      { id: 'c', from: 'p0', to: 'triage', label: 'Comment on staging', kind: 'forward' },
      { id: 't', from: 'triage', to: 'builder', label: 'Task', kind: 'forward' },
      { id: 'v', from: 'builder', to: 'verifier', label: 'Branch', kind: 'forward', shape: 'up' },
      { id: 'pl', from: 'verifier', to: 'builder', label: 'Punchlist', kind: 'return', shape: 'down' },
      { id: 'h', from: 'builder', to: 'desk', label: 'Branch + trace stub', kind: 'forward' },
      { id: 'n', from: 'desk', to: 'sb', label: 'Next branch', kind: 'forward' },
      { id: 'a', from: 'sb', to: 'desk', label: 'Ready for next', kind: 'return', shape: 'under', depth: 60 },
      { id: 'l', from: 'desk', to: 'triage', label: 'Handed list = triaged list?', kind: 'return', shape: 'under', depth: 130, both: true },
      { id: 'm', from: 'sb', to: 'staging', label: 'Merge', kind: 'forward' },
      { id: 'r', from: 'staging', to: 'p1', label: 'All live', kind: 'forward' },
    ],
    steps: [
      { who: 'triage', edge: 'c', k: { triage: 24 }, text: 'Triage sees the comment.', st: { triage: 'Triaged 1' } },
      { who: 'triage', edge: 't', k: { triage: 3 }, text: 'Sends it to the correct builder.', st: { triage: 'Handed to builders: 1' } },
      { who: 'builder', edge: 'v', k: { builder: 95 }, text: 'Builder creates its own branch, builds, pushes the branch (no PR) and submits it to the one combined verifier for content and design.', st: { builder: 'Branch pushed, in review' } },
      { who: 'verifier', edge: null, k: { verifier: 85 }, text: 'Verifier checks the build once and writes one punchlist of updates needed.', st: { verifier: 'Punchlist written' } },
      { who: 'verifier', edge: 'pl', k: { verifier: 2 }, text: 'Verifier hands the punchlist back to the builder that submitted the branch.', st: { verifier: 'Done, stops' } },
      { who: 'builder', edge: null, k: { builder: 20 }, text: 'Builder works in every punchlist item (if any).', st: { builder: 'Punchlist done' } },
      { who: 'builder', edge: null, k: { builder: 2 }, text: 'Builder pushes the update to the same branch, overwriting it.', st: { builder: 'Branch updated' } },
      { who: 'builder', edge: null, k: { builder: 2 }, text: 'Builder saves a very short trace in its log folder.', st: { builder: 'Trace saved' } },
      { who: 'desk', edge: 'h', k: { desk: 12 }, text: 'Builder hands the branch and trace stub to the staging front desk, which logs every incoming branch and its stub.', st: { builder: 'Done, stops', desk: 'Backlog 1 · handed 0' } },
      { who: 'desk', edge: 'n', k: { desk: 2, sb: 14 }, text: 'Front desk puts the backlog in a logical merge order (it does not merge) and hands the first branch to the staging builder. No second branch until the staging builder asks.', st: { desk: 'Backlog 0 · handed 1', sb: 'Holding 1 branch' } },
      { who: 'desk', edge: null, k: { desk: 1 }, text: 'While it waits, front desk keeps ordering incoming branches and only marks handed-off branches as handed off in its trace.', st: { desk: 'Ordering incoming · handed 1' } },
      { who: 'sb', edge: 'm', k: { sb: 24 }, text: 'Staging builder merges the branch into staging. If CI errors, it fixes them itself using the builder’s trace to orient fast, then merges. It never sends a build back.', st: { sb: 'Merged, CI green', staging: '1 update deployed' }, note: 'A CI fix adds about 15k to 30k.' },
      { who: 'sb', edge: 'a', k: { sb: 1 }, text: 'Done with its one branch, staging builder asks the front desk for the next.', st: { sb: 'Asked for next' } },
      { who: 'desk', edge: 'l', k: { desk: 2, triage: 2 }, text: 'Front desk has no branch to give, so it asks triage whether its handed-off list matches the list of tasks triage sent to builders.', st: { desk: 'Handed 1 · triaged 1', triage: 'Lists match' } },
      { who: 'desk', edge: null, k: {}, text: 'If the lists do not match, a build is still out: staging builder stands by until the front desk receives it, then front desk asks if it is ready. If it is busy, it notes the ask and says when it is ready.', st: {}, note: 'The lists match.', skip: true },
      { who: 'desk', edge: null, k: { desk: 1 }, text: 'Front desk has no branches and the lists match: the sprint is done and every update is merged into staging.', st: { desk: 'Sprint done', sb: 'Done, stops' } },
      { who: 'p1', edge: 'r', k: {}, text: 'All agents stop. The principal is told to review every addressed comment, now live on staging.', st: { desk: 'Done, stops', triage: 'Done, stops', p1: 'Notified' } },
      { who: 'p1', edge: null, k: {}, text: 'The principal refreshes staging to see every deployed update.', st: { p1: 'Reviewing staging' } },
    ],
    notIn: 'Your 18 steps as written. Not in this flow: the lead session, separate content and design verifiers, pr-verifier, the PR checklist, release PRs and the learn step.',
  },
};

export const FINDINGS: Finding[] = [
  { id: 'F1', title: 'The learn step costs more than any single build', body: 'After ratification three agents each open a branch, and each branch goes back through content-verifier and staging-keeper; ds/curate also gets a third full design review of parts already reviewed twice.', status: 'solved', how: 'Removed. No curator, hygiene or retro branches; a sprint ends when staging moves. Trade-off: nothing records lessons yet (see gaps).' },
  { id: 'F2', title: 'Design is reviewed by screenshots twice, on the lead model', body: 'Builders already run the app and capture 3 widths x 2 themes. design-verifier then starts the app again and recaptures the same matrix on its first review, on the lead model, for every branch.', status: 'solved', how: 'One verifier per sprint reads the builders’ screenshots and runs the app only on doubt. No second capture, no delta re-checks.' },
  { id: 'F3', title: 'Two gates check the same four things', body: 'pr-verifier (merge state, CI, house rules, verdicts) and staging-keeper’s checklist (merge state, CI, house-rule grep, verdicts) overlap almost fully. The shared-file trigger (app.css, Facet CSS) sent 3 of 4 standard branches to pr-verifier.', status: 'partly', how: 'pr-verifier and staging-keeper are gone; merge and CI are scripts in the session. Holds only once pnpm check carries the house-rule checks.' },
  { id: 'F4', title: 'content-verifier runs 11 checks from 9 cold starts', body: 'Every branch and every delta is a separate Sonnet spawn that rereads the brief, lessons and content.md. Most findings are mechanical: em dashes, colons in headings, sentence case, domain words.', status: 'partly', how: 'Content is part of the one sprint review, and builders run the linters first. The word linter for em dashes, heading colons and sentence case still has to be written.' },
  { id: 'F5', title: 'Cold starts read more than the task needs', body: 'Every spawn reads all 27 lessons (24 adopted, about 2.5k tokens). screen-builder reads preview/screens.html (about 19k); design-verifier rereads DESIGN.md and the 6.3k guidelines each spawn.', status: 'open', how: 'The flow does not change what agents read. Builders and the verifier still load all 27 lessons, DESIGN.md and screens.html on every spawn.' },
  { id: 'F6', title: 'Comments that need data and UI fall between lanes', body: 'C6 needs a table and a chip. data-builder writes no markup, and the triager has no split rule, so the chip became T4: a new screen-builder spawn, a new full design review and another merge.', status: 'partly', how: 'Triage groups by file group, so one builder can own a data change and its chip. The rule that data-builder writes no markup has to go for this to work.' },
  { id: 'F7', title: 'Escalations and late DS requests serialize the run', body: 'C4 waited on the principal inside T1, and T2 could not start until T1 merged. Then T2 found a missing switch slot and opened a second ds/ round after T1 had merged.', status: 'solved', how: 'Parked comments never block the sprint, Facet parts are built in the same branch, and builders run in parallel. New wait: the sprint merges when the slowest builder finishes.' },
  { id: 'F8', title: 'Tiers and verifiers are decided by judgement', body: 'C7 touches gems-actions.ts, a server action: data-safety-verifier lists server actions in scope, the tier table does not. model-verifier’s trigger ("the ingest that feeds it") left C6 to the lead.', status: 'solved', how: 'The changed paths decide: ops/sprint/scope.mjs maps them to the words, design, data safety and model sections, and the one verifier reviews exactly those. db:guard and the Week 8 reference test still run in pnpm check.' },
  { id: 'F9', title: 'Production comments are not defined', body: 'The corpus assumes the principal reviews the staging preview. Production threads get resolved when fixes merge into staging, so the principal sees "resolved" before the fix is live.', status: 'partly', how: 'Comments come from staging, and threads resolve once the fix is live there. Production comments and the release to main are still undefined.' },
  { id: 'F10', title: 'Who pushes and opens PRs is unclear', body: 'facet-builder commits "only when told"; screen-builder opens a PR "only when told"; the lead must do no agent’s job. Someone has to push the ds/ branch and open every PR, and today that falls to the lead.', status: 'solved', how: 'Builders push their own branches and there are no PRs. The session merges.' },
];

export const GAPS: { title: string; body: string }[] = [
  { title: 'Release to main', body: 'The flow stops at staging. Who opens the release to main, and when, is not defined.' },
  { title: 'No learning loop', body: 'With the learn step gone, nothing records what went wrong. One line per sprint in sprint.json, read by the next triage, would cover it.' },
  { title: 'A failing branch in the sprint branch', body: 'One bad branch can hold up the whole sprint. The session needs a rule to drop it, reopen its thread, and ship the rest.' },
  { title: 'Session context over a long sprint', body: 'The open session holds every report. Around 8 comments that is fine; much larger sprints should start a fresh session.' },
];
