# Agent Studio Architecture Reset

Date: April 22, 2026

## Goal

Turn Agent Studio from a strong single-workflow demo into a practical control plane for user-supplied agent systems.

This document is the concrete architecture plan for doing that.

## Non-Negotiable Product Requirements

The system must support:

- user-supplied agents
- multiple runtimes
- many agents in one system
- real topology
- replay with retries and branches
- per-agent and per-run performance measurement
- manual interventions
- evidence-backed improvement
- safe rollout and rollback

If the architecture does not support those, it is not the right architecture.

## Architecture Principle

Keep the current `Workflow` / `Run` / `Replay` experience as a product view.

Do not keep it as the ingestion truth.

The ingestion truth needs to be lower-level and runtime-neutral.

## Core Domain Model

### Registration

`Workspace`

- owner scope
- access boundary

`RuntimeRegistration`

- `runtimeId`
- `kind`
- `adapterId`
- `adapterVersion`
- `label`
- `capabilities`
- `sourceRef`

`SystemDefinition`

- `systemId`
- `workspaceId`
- `name`
- `description`
- `runtimeIds[]`
- `policyRefs[]`

`AgentDefinition`

- `agentId`
- `systemId`
- `runtimeId`
- `label`
- `kind`
- `role`
- `version`
- `capabilities`
- `toolRefs[]`
- `memoryRefs[]`

`TopologySnapshot`

- `snapshotId`
- `systemId`
- `capturedAt`
- `nodes[]`
- `edges[]`
- `layoutHints`

### Telemetry

`Execution`

- `executionId`
- `systemId`
- `runtimeId`
- `traceId`
- `sessionId?`
- `status`
- `startedAt`
- `finishedAt`
- `sourceRef`

`Span`

- `spanId`
- `traceId`
- `executionId`
- `parentSpanId?`
- `agentId?`
- `nodeId?`
- `kind`
- `status`
- `startedAt`
- `finishedAt`
- `usage`
- `attrs`
- `links[]`

`Artifact`

- `artifactId`
- `executionId?`
- `spanId?`
- `agentId?`
- `kind`
- `contentRef`
- `summary`
- `derivedFrom[]`

`MetricSample`

- `metric`
- `unit`
- `value`
- `ts`
- `scopeType`
- `scopeId`
- `dimensions`

### Control

`Intervention`

- `interventionId`
- `targetScope`
- `actor`
- `action`
- `reason`
- `requestedAt`
- `appliedAt?`
- `outcome`
- `relatedTraceId?`
- `relatedSpanId?`

`Evaluation`

- `evaluationId`
- `targetScope`
- `baselineRefs[]`
- `candidateRefs[]`
- `metricDeltas[]`
- `configPatch`
- `verdict`

`ReleaseDecision`

- `releaseId`
- `systemId`
- `candidateRef`
- `baselineRef`
- `decision`
- `evidenceRefs[]`
- `rollbackPlan`
- `appliedAt?`

## Derived Product Views

These should be materialized views or query-layer projections:

- `SystemOverview`
- `LiveTopologyView`
- `ReplayView`
- `OperationalContextView`
- `OptimizeView`
- `AgentCatalogView`

This lets us keep a polished operator experience without corrupting the base contract.

## Backend Shape

### Layer 1: Registry API

Responsibilities:

- register runtimes
- register systems
- register agents
- write topology snapshots
- expose searchable catalog APIs

### Layer 2: Ingest API

Responsibilities:

- append executions
- append spans
- append artifacts
- append metric samples
- idempotent ingestion
- batched ingestion
- backfill ingestion

### Layer 3: Query API

Responsibilities:

- live system state
- replay reconstruction
- operational context
- agent health
- candidate compare
- release history

### Layer 4: Control API

Responsibilities:

- scoped directives
- interventions
- scenario testing
- promotion / rollback
- audit trail

## Storage Recommendation

### Phase 1

- Postgres
- JSONB
- pgvector
- object storage

Why:

- fastest path to a serious product
- enough for registry + query + operational memory
- keeps complexity sane

### Phase 2

Add ClickHouse if event volume demands it.

Use it for:

- large span volumes
- time-series metrics
- heavy aggregations

Do not start there unless event volume proves the need.

## Adapter Strategy

### First-class adapters

Ship first:

- LangGraph
- OpenHands
- CrewAI
- Microsoft Agent Framework

### Generic ingest path

Support:

- JS SDK
- Python SDK
- REST bulk ingest
- optional OTEL bridge later

### Adapter contract rule

Adapters should translate runtime-specific events into the core contract.

Adapters should not invent product analytics.

Evidence generation belongs in the query and memory layer, not inside adapters.

## Topology Strategy

### What we have to stop doing

- deriving topology only from workflow steps
- treating roles as stable identity
- using fixed node counts as layout assumptions

### What we need

- explicit nodes and edges
- node identity and version
- runtime boundary awareness
- groupable clusters
- transient agent instances
- active/inactive states
- edge pressure and failure overlays

### UX implications

Default map behavior should be:

- machine-arranged
- filterable
- collapsible
- searchable

Optional map behavior can still include:

- drag
- free-arrange
- local saved layouts

But those are secondary.

## Replay Strategy

Replay should be built from spans and artifacts, not just step summaries.

### The replay UI must support

- branch visibility
- retry visibility
- concurrent spans
- child-agent activity
- exact evidence trail
- baseline compare
- intervention suggestions

### Minimal replay data requirements

- `traceId`
- parent/child relationships
- per-span timing
- per-span status
- per-span agent attribution
- artifacts linked to spans

## Metrics Strategy

### The system needs to measure

- latency
- spend
- tokens
- tool failure rate
- retry rate
- queueing or wait time when available
- handoff count
- intervention rate
- release win rate

### Scope levels

- per agent
- per runtime
- per execution
- per system
- per scenario

## Operational Memory Strategy

### Core principle

Operational memory first.

Not generic RAG first.

### Required retrieval jobs

- similar incident retrieval
- healthy baseline retrieval
- repeated bottleneck retrieval
- intervention outcome retrieval
- release outcome retrieval

### Suggested storage path

Start with:

- Postgres + pgvector

Add later if needed:

- temporal graph layer such as Graphiti

### What not to do

- do not force the whole product through a chat box
- do not make memory synonymous with embeddings only

## Third-Party Tool Strategy

Use tools to enrich or act, not to define the product.

### Useful tool classes

- tracing providers
- issue systems
- GitHub
- Slack
- docs and runbooks
- MCP tool servers

### Tool roles

- attach evidence
- trigger actions
- enrich incident context
- support interventions

## Frontend Product Structure

### Recommended top-level product areas

1. Systems
- registry and health

2. Live
- current state and topology

3. Replay
- run explanation and drift

4. Improve
- scenarios, interventions, compare

5. Releases
- promotion, rollback, audit

6. Agents
- stable agent catalog

### Important product rule

Do not force everything into the current three-room shell if it weakens usability.

Keep the operator loop:

- Live
- Replay
- Improve

But support it with:

- Systems
- Agents
- Releases

## Phased Roadmap

### Phase 0: Reset

- freeze decorative UI churn
- redesign contracts
- define registry + telemetry model

### Phase 1: Control-plane core

- add runtime registration
- add agent registry
- add topology snapshots
- add execution and span ingest

### Phase 2: Practical surfaces

- systems list
- agent catalog
- large-scale topology view
- replay from spans

### Phase 3: Performance and context

- per-agent health
- incident clustering
- healthy baseline compare
- intervention history

### Phase 4: Improvement loop

- scenario testing
- candidate scoring
- release decision brief
- rollback suggestion

### Phase 5: Guarded auto-improvement

- suggested interventions
- apply-to-candidate
- canary rollout
- opt-in auto-loop for narrow scopes

## Next Build Recommendation

Before any major new visual pass, do these in order:

1. redesign the shared contract
2. implement runtime and agent registry entities
3. introduce execution/span ingest
4. rebuild replay on top of spans
5. redesign the topology view around large-system practicality

That is the shortest path to making Agent Studio a real product instead of an increasingly polished demo.
