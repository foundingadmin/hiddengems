// Agent workflow (Settings): the principal's prototype of the sprint flow, as an interactive replay, and the
// findings it answers. Static: the data is flows.ts, nothing is fetched. ?view and ?version restore the view.
import type { Metadata } from 'next';
import { AgentWorkflow, type View } from './agent-workflow';
import { VERSIONS, type VersionKey } from './flows';

export const metadata: Metadata = { title: 'Agent workflow' };

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function AgentWorkflowPage({ searchParams }: { searchParams: Params }) {
  const q = await searchParams;
  const view: View = q.view === 'findings' ? 'findings' : 'flow';
  const version = (VERSIONS as string[]).includes(String(q.version)) ? (q.version as VersionKey) : 'opt';
  return <AgentWorkflow initialView={view} initialVersion={version} />;
}
