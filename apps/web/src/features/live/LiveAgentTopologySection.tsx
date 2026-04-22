import { useEffect, useRef, useState } from 'react';

import type { DirectiveMode, Replay, Run, Workflow, WorkflowStep } from '@agent-studio/contracts';

import { formatCredits, formatDuration, titleCaseStatus } from '../../app/format';

interface LiveAgentTopologySectionProps {
  workflow: Workflow;
  run: Run;
  replay: Replay;
}

type RoleNodeStatus = 'active' | 'failed' | 'standby';

type RoleNode = {
  role: string;
  label: string;
  status: RoleNodeStatus;
  directiveMode?: DirectiveMode;
  phases: string[];
  summary: string;
  durationMs?: number;
  credits?: number;
  stepCount: number;
  x: number;
  y: number;
};

type NodePosition = {
  x: number;
  y: number;
};

type DragState = {
  role: string;
  pointerId: number;
};

const POSITION_STORAGE_PREFIX = 'agent-studio-topology-layout:';

const POSITION_PRESETS: Record<number, Array<[number, number]>> = {
  1: [[50, 18]],
  2: [[24, 34], [76, 34]],
  3: [[50, 18], [24, 62], [76, 62]],
  4: [
    [20, 28],
    [74, 28],
    [74, 68],
    [20, 68],
  ],
  5: [
    [50, 16],
    [18, 34],
    [76, 34],
    [68, 72],
    [26, 72],
  ],
  6: [
    [50, 15],
    [18, 28],
    [76, 28],
    [76, 66],
    [50, 79],
    [18, 66],
  ],
};

function formatRoleLabel(role: string) {
  return role
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildRoleNodes(workflow: Workflow, replay: Replay): RoleNode[] {
  const workflowStepsByRole = new Map<string, WorkflowStep[]>();

  for (const step of workflow.steps) {
    const steps = workflowStepsByRole.get(step.assignedRole) ?? [];
    steps.push(step);
    workflowStepsByRole.set(step.assignedRole, steps);
  }

  const roles = Array.from(workflowStepsByRole.entries());

  return roles.map(([role, steps], index) => {
    const executedSteps = replay.stepExecutions.filter((step) => step.assignedRole === role);
    const directiveMode =
      replay.studioState?.roleDirectives?.[role]?.mode ?? executedSteps.find((step) => step.directiveMode)?.directiveMode;

    const failedStep = executedSteps.find((step) => step.status === 'failed');
    const activeStep = executedSteps.find((step) => step.status === 'running') ?? executedSteps[executedSteps.length - 1];

    const status: RoleNodeStatus = failedStep
      ? 'failed'
      : executedSteps.some((step) => step.status === 'running' || step.status === 'succeeded')
        ? 'active'
        : 'standby';

    const totalCredits = executedSteps.reduce((sum, step) => sum + (step.actualCredits ?? 0), 0);
    const totalDuration = executedSteps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0);
    const phases = Array.from(new Set(steps.map((step) => step.kind)));
    const preset = POSITION_PRESETS[roles.length]?.[index];
    const angle = (-Math.PI / 2) + ((Math.PI * 2) / Math.max(roles.length, 1)) * index;
    const radius = roles.length <= 4 ? 31 : 39;
    const fallbackLeft = 50 + Math.cos(angle) * radius;
    const fallbackTop = 50 + Math.sin(angle) * radius;

    return {
      role,
      label: formatRoleLabel(role),
      status,
      directiveMode,
      phases,
      summary:
        failedStep?.error ??
        failedStep?.summary ??
        activeStep?.summary ??
        steps[0]?.objective ??
        'No activity summary available.',
      durationMs: totalDuration || undefined,
      credits: totalCredits || undefined,
      stepCount: steps.length,
      x: preset?.[0] ?? fallbackLeft,
      y: preset?.[1] ?? fallbackTop,
    };
  });
}

function formatDirectiveMode(mode?: DirectiveMode) {
  if (!mode) {
    return 'Steady';
  }

  if (mode === 'promote') {
    return 'Promoted';
  }

  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function getStoredPositions(workflowId: string): Record<string, NodePosition> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${POSITION_STORAGE_PREFIX}${workflowId}`);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as Record<string, NodePosition>;
  } catch {
    return null;
  }
}

function storePositions(workflowId: string, positions: Record<string, NodePosition>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${workflowId}`, JSON.stringify(positions));
  } catch {
    // Ignore storage failures in demo mode.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LiveAgentTopologySection({ workflow, run, replay }: LiveAgentTopologySectionProps) {
  const roleNodes = buildRoleNodes(workflow, replay);
  const roleSignature = roleNodes.map((node) => node.role).join('|');
  const activeCount = roleNodes.filter((node) => node.status === 'active').length;
  const failedCount = roleNodes.filter((node) => node.status === 'failed').length;
  const phaseCount = new Set(workflow.steps.map((step) => step.kind)).size;
  const similarRun = replay.operationalContext?.similarRuns[0];
  const healthyAnchor = replay.operationalContext?.lastHealthyComparison;
  const recommendation = replay.operationalContext?.recommendationEvidence[0];
  const directiveCount = Object.keys(replay.studioState?.roleDirectives ?? {}).length;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [draggingRole, setDraggingRole] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});

  useEffect(() => {
    const stored = getStoredPositions(workflow.workflowId);
    const nextPositions = Object.fromEntries(
      roleNodes.map((node) => [
        node.role,
        stored?.[node.role]
          ? {
              x: clamp(stored[node.role].x, 10, 90),
              y: clamp(stored[node.role].y, 12, 88),
            }
          : {
              x: node.x,
              y: node.y,
            },
      ]),
    );

    setNodePositions(nextPositions);
  }, [workflow.workflowId, roleSignature]);

  useEffect(() => {
    if (!Object.keys(nodePositions).length) {
      return;
    }

    storePositions(workflow.workflowId, nodePositions);
  }, [nodePositions, workflow.workflowId]);

  useEffect(() => {
    if (!draggingRole) {
      return;
    }

    function updateFromPointer(pointerId: number, clientX: number, clientY: number) {
      if (!canvasRef.current || dragStateRef.current?.pointerId !== pointerId) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const paddingX = Math.max(8, Math.min(14, (96 / rect.width) * 100));
      const paddingY = Math.max(10, Math.min(16, (96 / rect.height) * 100));

      const x = clamp(((clientX - rect.left) / rect.width) * 100, paddingX, 100 - paddingX);
      const y = clamp(((clientY - rect.top) / rect.height) * 100, paddingY, 100 - paddingY);

      setNodePositions((current) => ({
        ...current,
        [dragStateRef.current!.role]: {
          x,
          y,
        },
      }));
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragStateRef.current || event.pointerId !== dragStateRef.current.pointerId) {
        return;
      }

      event.preventDefault();
      updateFromPointer(event.pointerId, event.clientX, event.clientY);
    }

    function handlePointerEnd(event: PointerEvent) {
      if (!dragStateRef.current || event.pointerId !== dragStateRef.current.pointerId) {
        return;
      }

      updateFromPointer(event.pointerId, event.clientX, event.clientY);
      dragStateRef.current = null;
      setDraggingRole(null);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [draggingRole]);

  function resetLayout() {
    const nextPositions = Object.fromEntries(
      roleNodes.map((node) => [
        node.role,
        {
          x: node.x,
          y: node.y,
        },
      ]),
    );

    setNodePositions(nextPositions);
  }

  return (
    <section className="surface surface--topology">
      <div className="section-header">
        <div>
          <p className="eyebrow">Live agent topology</p>
          <h3>Working agents and command flow</h3>
        </div>
        <div className="live-topology__toolbar">
          <button type="button" className="ghost-button" onClick={resetLayout}>
            Reset layout
          </button>
          <span className={`status-pill status-pill--${failedCount > 0 ? 'failed' : run.status}`}>
            {failedCount > 0 ? 'Pressure visible' : titleCaseStatus(run.status)}
          </span>
        </div>
      </div>
      <p className="feature-summary">
        This is the piece the standalone demo was missing: the live command core in the middle, the active specialist
        lanes around it, and the strongest system signals next to the map.
      </p>
      <p className="live-topology__hint">
        {draggingRole
          ? `Arranging ${roleNodes.find((node) => node.role === draggingRole)?.label ?? 'agent'}`
          : 'Drag any agent card to rearrange the operating layout. Your layout stays in the browser for this workflow.'}
      </p>

      <div className="live-topology">
        <div ref={canvasRef} className="live-topology__canvas">
          <div className="live-topology__orbit live-topology__orbit--outer" />
          <div className="live-topology__orbit live-topology__orbit--inner" />
          <div className="live-topology__glow" />
          <div className="live-topology__core">
            <p className="eyebrow">Control core</p>
            <strong>{workflow.name}</strong>
            <p>{workflow.description ?? 'Multi-agent workflow with a guarded operator loop.'}</p>
            <div className="live-topology__core-meta">
              <span className="meta-chip">{workflow.policy?.optimizationGoal?.replace('_', ' ') ?? 'balanced'}</span>
              <span className="meta-chip">{workflow.policy?.reviewPolicy ?? 'standard'} review</span>
              <span className="meta-chip">{formatCredits(run.actualCredits)}</span>
            </div>
          </div>

          {roleNodes.map((node, index) => {
            const position = nodePositions[node.role] ?? { x: node.x, y: node.y };
            const isDragging = draggingRole === node.role;

            return (
              <article
                key={node.role}
                className={`live-node live-node--${node.status} ${isDragging ? 'live-node--dragging' : ''}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  ['--float-delay' as string]: `${index * 0.45}s`,
                  ['--float-duration' as string]: `${6.2 + (index % 3) * 0.8}s`,
                }}
                onPointerDown={(event) => {
                  dragStateRef.current = {
                    role: node.role,
                    pointerId: event.pointerId,
                  };
                  setDraggingRole(node.role);
                }}
              >
                <div className="live-node__header">
                  <div>
                    <p className="live-node__label">{node.label}</p>
                    <p className="live-node__meta">{node.stepCount} mapped steps</p>
                  </div>
                  <span className={`live-node__status live-node__status--${node.status}`} />
                </div>
                <p className="live-node__summary">{node.summary}</p>
                <div className="live-node__tags">
                  <span className="meta-chip">{formatDirectiveMode(node.directiveMode)}</span>
                  {node.phases.slice(0, 2).map((phase) => (
                    <span key={`${node.role}-${phase}`} className="meta-chip">
                      {phase}
                    </span>
                  ))}
                </div>
                <div className="live-node__metrics">
                  <span>{formatCredits(node.credits)}</span>
                  <span>{formatDuration(node.durationMs)}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="live-topology__rail">
          <article className="signal-card signal-card--cyan">
            <p className="eyebrow">Pressure read</p>
            <strong>{recommendation?.title ?? 'Healthy operator loop'}</strong>
            <p>{recommendation?.body ?? 'The live run is stable enough to use as the healthy anchor for future replay work.'}</p>
          </article>

          <article className="signal-card signal-card--violet">
            <p className="eyebrow">Closest prior signal</p>
            <strong>{similarRun?.label ?? 'No related run yet'}</strong>
            <p>
              {similarRun
                ? `${(similarRun.similarityScore * 100).toFixed(0)}% match across ${similarRun.matchedSignals.slice(0, 2).join(', ')}.`
                : 'Once more runs land, similar-run recall will appear here.'}
            </p>
          </article>

          <article className="signal-card signal-card--gold">
            <p className="eyebrow">Healthy anchor</p>
            <strong>{healthyAnchor?.label ?? 'Current run is the anchor'}</strong>
            <p>{healthyAnchor?.summary ?? 'This run is the strongest baseline currently available in the demo.'}</p>
          </article>
        </div>
      </div>

      <div className="live-topology__footer">
        <div className="mini-surface live-topology__stat">
          <p className="eyebrow">Active roles</p>
          <strong>{activeCount}</strong>
        </div>
        <div className="mini-surface live-topology__stat">
          <p className="eyebrow">Pressure lanes</p>
          <strong>{failedCount}</strong>
        </div>
        <div className="mini-surface live-topology__stat">
          <p className="eyebrow">Workflow phases</p>
          <strong>{phaseCount}</strong>
        </div>
        <div className="mini-surface live-topology__stat">
          <p className="eyebrow">Directive load</p>
          <strong>{directiveCount}</strong>
        </div>
      </div>
    </section>
  );
}
