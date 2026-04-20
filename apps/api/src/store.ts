import type { OperationalContext, Replay, Run, StudioState, Workflow } from '@agent-studio/contracts';
import { operationalContextSchema, replaySchema, runSchema, studioStateSchema, workflowSchema } from '@agent-studio/contracts';
import { seededOperationalContexts, seededReplays } from '@agent-studio/demo';

import {
  cloneOperationalContext,
  cloneReplay,
  cloneRun,
  cloneStudioState,
  cloneWorkflow,
  createSeededDemoState,
  type DemoStateResponse,
} from './demo-state.js';

export class ApiStore {
  private readonly workflows = new Map<string, Workflow>();
  private readonly runs = new Map<string, Run>();
  private readonly replays = new Map<string, Replay>();
  private readonly operationalContexts = new Map<string, OperationalContext>();
  private readonly studioStates = new Map<string, StudioState>();

  constructor(seed = createSeededDemoState()) {
    seed.workflows.forEach((workflow) => this.workflows.set(workflow.workflowId, cloneWorkflow(workflow)));

    Object.values(seed.workflowStates).forEach((state) => {
      this.studioStates.set(state.workflow.workflowId, cloneStudioState(state.live.replay.studioState ?? {}));
      state.runsByNewest.forEach((run) => this.runs.set(run.runId, cloneRun(run)));
    });

    seededReplays.forEach((replay) => {
      replaySchema.parse(replay);
      this.replays.set(replay.run.runId, cloneReplay(replay));
    });

    Object.values(seededOperationalContexts).forEach((context) => {
      operationalContextSchema.parse(context);
      this.operationalContexts.set(context.runId, cloneOperationalContext(context));
    });
  }

  listWorkflows(): Workflow[] {
    return [...this.workflows.values()]
      .map((workflow) => cloneWorkflow(workflow))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    const workflow = this.workflows.get(workflowId);

    return workflow ? cloneWorkflow(workflow) : undefined;
  }

  upsertWorkflow(workflow: Workflow): Workflow {
    const parsed = workflowSchema.parse(workflow);
    this.workflows.set(parsed.workflowId, cloneWorkflow(parsed));

    if (!this.studioStates.has(parsed.workflowId)) {
      this.studioStates.set(parsed.workflowId, studioStateSchema.parse({}));
    }

    return cloneWorkflow(parsed);
  }

  listRunsByWorkflow(workflowId: string): Run[] {
    return [...this.runs.values()]
      .filter((run) => run.workflowId === workflowId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((run) => cloneRun(run));
  }

  getRun(runId: string): Run | undefined {
    const run = this.runs.get(runId);

    return run ? cloneRun(run) : undefined;
  }

  upsertRun(run: Run): Run {
    const parsed = runSchema.parse(run);
    this.runs.set(parsed.runId, cloneRun(parsed));

    return cloneRun(parsed);
  }

  getReplay(runId: string): Replay | undefined {
    const replay = this.replays.get(runId);

    return replay ? cloneReplay(replay) : undefined;
  }

  upsertReplay(replay: Replay): Replay {
    const parsed = replaySchema.parse(replay);
    this.workflows.set(parsed.workflow.workflowId, cloneWorkflow(parsed.workflow));
    this.runs.set(parsed.run.runId, cloneRun(parsed.run));
    this.replays.set(parsed.run.runId, cloneReplay(parsed));

    if (parsed.operationalContext?.runId) {
      this.operationalContexts.set(parsed.operationalContext.runId, cloneOperationalContext(parsed.operationalContext));
    }

    if (parsed.studioState) {
      this.studioStates.set(parsed.workflow.workflowId, cloneStudioState(parsed.studioState));
    }

    return cloneReplay(parsed);
  }

  getOperationalContext(runId: string): OperationalContext | undefined {
    const operationalContext = this.operationalContexts.get(runId);

    return operationalContext ? cloneOperationalContext(operationalContext) : undefined;
  }

  upsertOperationalContext(operationalContext: OperationalContext): OperationalContext {
    const parsed = operationalContextSchema.parse(operationalContext);
    const key = parsed.runId ?? `${parsed.workflowId}:${parsed.generatedAt}`;
    this.operationalContexts.set(key, cloneOperationalContext(parsed));

    return cloneOperationalContext(parsed);
  }

  getStudioState(workflowId: string): StudioState | undefined {
    const studioState = this.studioStates.get(workflowId);

    return studioState ? cloneStudioState(studioState) : undefined;
  }

  private buildDemoWorkflowState(workflow: Workflow): DemoStateResponse['workflowStates'][string] | null {
    const runsByNewest = this.listRunsByWorkflow(workflow.workflowId);
    const liveRun = runsByNewest.find((run) => run.status === 'succeeded') ?? runsByNewest[0];
    const replayRun = runsByNewest.find((run) => run.status === 'failed') ?? runsByNewest[1] ?? runsByNewest[0];
    const baselineRun = runsByNewest.find((run) => run.runId !== liveRun?.runId && run.status === 'succeeded') ?? liveRun;
    const candidateRun = liveRun ?? runsByNewest[0];
    const liveReplay = liveRun ? this.getReplay(liveRun.runId) : undefined;
    const replayReplay = replayRun ? this.getReplay(replayRun.runId) : undefined;
    const candidateReplay = candidateRun ? this.getReplay(candidateRun.runId) : undefined;

    if (!liveRun || !replayRun || !baselineRun || !candidateRun || !liveReplay || !replayReplay || !candidateReplay) {
      return null;
    }

    const studioState = this.getStudioState(workflow.workflowId);
    const candidatePlan =
      studioState?.savedPlans?.find((plan) => plan.sourceExperimentId === candidateRun.experimentId) ??
      studioState?.savedPlans?.[0] ??
      null;
    const promotionHistory =
      studioState?.promotionHistory?.filter((event) => {
        if (candidatePlan?.id && event.planId === candidatePlan.id) {
          return true;
        }

        if (candidateRun.experimentId && event.sourceExperimentId === candidateRun.experimentId) {
          return true;
        }

        return false;
      }) ?? [];
    const promotionSummary =
      promotionHistory[promotionHistory.length - 1]?.summary ?? 'Promotion history not available for this candidate.';

    return {
      workflow,
      runsByNewest,
      live: {
        run: liveRun,
        replay: liveReplay,
      },
      replay: {
        run: replayRun,
        replay: replayReplay,
        baselineRun,
      },
      optimize: {
        baselineRun,
        candidateRun,
        candidateReplay,
        candidatePlan,
        promotionHistory,
        promotionSummary,
      },
    };
  }

  buildDemoState(): DemoStateResponse {
    const workflowEntries = this.listWorkflows().flatMap((workflow) => {
      const workflowState = this.buildDemoWorkflowState(workflow);

      return workflowState ? ([[workflow.workflowId, workflowState]] as const) : [];
    });
    const workflowStates = Object.fromEntries(workflowEntries);
    const workflows = workflowEntries.map(([, workflowState]) => workflowState.workflow);
    const defaultWorkflowId = workflows[0]?.workflowId ?? createSeededDemoState().defaultWorkflowId;

    return {
      runtimeOptions: [
        {
          id: 'demo',
          label: 'Seeded demo runtime',
          detail: 'Read-only public walkthrough with realistic workflow history.',
        },
      ],
      defaultWorkflowId,
      workflows,
      workflowStates,
    };
  }
}
