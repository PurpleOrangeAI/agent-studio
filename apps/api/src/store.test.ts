import { seededIds } from '@agent-studio/demo';

import { ApiStore } from './store.js';

describe('ApiStore seed overlay', () => {
  it('restores current seeded control-plane telemetry on top of persisted snapshots without dropping imported systems', () => {
    const seededStore = new ApiStore();
    const baseSnapshot = seededStore.buildSnapshot();
    const seededSystemId = `system_${seededIds.workflowId}`;

    const importedRuntime = {
      runtimeId: 'runtime_imported_regression',
      kind: 'custom',
      adapterId: 'custom-ingest',
      label: 'Imported regression runtime',
    };
    const importedSystem = {
      systemId: 'system_imported_regression',
      workspaceId: 'workspace_imported',
      name: 'Imported regression system',
      runtimeIds: [importedRuntime.runtimeId],
      primaryRuntimeId: importedRuntime.runtimeId,
      status: 'active',
    };

    const degradedSnapshot = {
      ...baseSnapshot,
      runtimes: [...baseSnapshot.runtimes, importedRuntime],
      systems: [...baseSnapshot.systems, importedSystem],
      executions: baseSnapshot.executions.filter(
        (execution) => execution.systemId !== seededSystemId || execution.runId === seededIds.improvedRunId,
      ),
      spans: baseSnapshot.spans.filter((span) => span.executionId === `execution_${seededIds.workflowId}_${seededIds.improvedRunId.replace(/^run_/, '')}`),
      artifacts: baseSnapshot.artifacts.filter(
        (artifact) =>
          artifact.executionId == null ||
          artifact.executionId === `execution_${seededIds.workflowId}_${seededIds.improvedRunId.replace(/^run_/, '')}`,
      ),
      metrics: baseSnapshot.metrics.filter(
        (metric) =>
          metric.scopeType !== 'execution' ||
          metric.scopeId === `execution_${seededIds.workflowId}_${seededIds.improvedRunId.replace(/^run_/, '')}`,
      ),
      evaluations: baseSnapshot.evaluations.filter((evaluation) => evaluation.targetScopeId !== seededSystemId),
      releaseDecisions: baseSnapshot.releaseDecisions.filter((release) => release.systemId !== seededSystemId),
    };

    const restoredStore = new ApiStore(undefined, { snapshot: degradedSnapshot });
    const executions = restoredStore.listExecutionsBySystem(seededSystemId);
    const executionRunIds = executions.map((execution) => execution.runId);
    const replayExecution = executions.find((execution) => execution.runId === seededIds.degradedRunId);

    expect(executionRunIds).toEqual(
      expect.arrayContaining([seededIds.baselineRunId, seededIds.degradedRunId, seededIds.improvedRunId]),
    );
    expect(replayExecution).toBeTruthy();
    expect(restoredStore.listSpansByExecution(replayExecution!.executionId).length).toBeGreaterThan(0);
    expect(restoredStore.listReleaseDecisionsBySystem(seededSystemId).length).toBeGreaterThan(0);
    expect(restoredStore.listEvaluationsBySystem(seededSystemId).length).toBeGreaterThan(0);
    expect(restoredStore.getSystem(importedSystem.systemId)).toEqual(expect.objectContaining({ systemId: importedSystem.systemId }));
  });
});
