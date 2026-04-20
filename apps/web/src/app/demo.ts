import type { PromotionEvent, Replay, Run, SavedPlan, Workflow } from '@agent-studio/contracts';

export interface RuntimeOption {
  id: string;
  label: string;
  detail: string;
}

export interface WorkflowDemoState {
  workflow: Workflow;
  runsByNewest: Run[];
  live: {
    run: Run;
    replay: Replay;
  };
  replay: {
    run: Run;
    replay: Replay;
    baselineRun: Run;
  };
  optimize: {
    baselineRun: Run;
    candidateRun: Run;
    candidateReplay: Replay;
    candidatePlan: SavedPlan | null;
    promotionHistory: PromotionEvent[];
    promotionSummary: string;
  };
}

export interface DemoState {
  runtimeOptions: RuntimeOption[];
  defaultWorkflowId: string;
  workflows: Workflow[];
  workflowStates: Record<string, WorkflowDemoState>;
}

export interface LoadDemoStateOptions {
  apiBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

function buildApiUrl(apiBaseUrl: string, pathname: string) {
  if (!apiBaseUrl) {
    return pathname;
  }

  return new URL(pathname, `${apiBaseUrl.replace(/\/+$/, '')}/`).toString();
}

export async function loadDemoState(options: LoadDemoStateOptions = {}): Promise<DemoState> {
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) {
    throw new Error('Fetch is not available in this environment.');
  }

  const response = await fetcher(buildApiUrl(options.apiBaseUrl ?? import.meta.env.VITE_API_URL ?? '', '/api/demo/state'), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load demo state (${response.status}).`);
  }

  return (await response.json()) as DemoState;
}
