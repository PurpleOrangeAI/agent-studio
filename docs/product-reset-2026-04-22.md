# Agent Studio Product Reset

Date: April 22, 2026

## Decision

Yes, there is a real product here.

No, the current standalone app is not that product yet.

The viable product is not:

- a prettier Violema clone
- a decorative topology map
- another agent builder
- a generic RAG chat wrapper

The viable product is:

- an open control plane for bring-your-own agent systems
- runtime-agnostic
- replay-first
- evidence-backed
- intervention-aware
- safe to improve over time

If we build that, there is real demand.
If we keep building a seeded workflow demo with nicer visuals, there is not.

## The Real Reason This App Should Exist

Teams are already building agents with:

- LangGraph
- OpenHands
- CrewAI
- Microsoft Agent Framework
- Mastra
- custom internal runtimes

What they still do not have cleanly is one place to answer:

- What agents do I actually have?
- What is running right now?
- Which agent or handoff is hurting quality, latency, or spend?
- What changed between the healthy run and the bad run?
- What intervention should I try?
- Did that intervention actually improve the system?
- Is it safe to roll out wider?

That is the reason Agent Studio should exist.

The product has to help operators manage real systems, not admire them.

## Current Market Reality

As of April 22, 2026, the market is real and crowded.

### Facts

OpenAI is explicitly pushing:

- agent design foundations
- evals
- trace grading
- guardrails

Relevant sources:

- [A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [Trace grading](https://developers.openai.com/api/docs/guides/trace-grading)
- [Agent evals](https://developers.openai.com/api/docs/guides/agent-evals)

LangSmith is shipping:

- trace debugging
- dataset experiments
- cloned threads
- Studio-based iteration

Source:

- [LangSmith observability Studio](https://docs.langchain.com/langsmith/observability-studio)

Braintrust is strong on:

- evaluations
- experiments
- regression discipline

Source:

- [Braintrust evaluations](https://www.braintrust.dev/docs/evaluate/run-evaluations)

CrewAI is shipping its own built-in:

- tracing
- task execution timelines
- tool usage visibility
- LLM call observability

Source:

- [CrewAI tracing](https://docs.crewai.com/en/observability/tracing)

OpenHands now has:

- a real SDK
- runtime abstraction
- built-in OTEL-based tracing
- tool and conversation instrumentation

Sources:

- [OpenHands SDK](https://docs.openhands.dev/sdk/index)
- [OpenHands observability](https://docs.openhands.dev/sdk/guides/observability)

Microsoft Agent Framework is clearly targeting:

- orchestration
- deployment
- multi-agent workflows

Source:

- [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)

Phoenix, Mastra, and Portkey are also occupying important adjacencies:

- Phoenix: traces, evals, prompt iteration, experiments
- Mastra: observability and evals
- Portkey: gateway, reliability, guardrails, cost/logging

Sources:

- [Phoenix](https://arize.com/docs/phoenix)
- [Mastra observability](https://mastra.ai/observability)
- [Portkey agents overview](https://portkey.ai/docs/integrations/agents)
- [Portkey guardrails](https://portkey.ai/docs/product/guardrails)

### Inference

This category is not empty.

So we cannot win by saying:

- “we also have agents”
- “we also have traces”
- “we also have a graph”

We can still win by doing something that is still weak across the market:

- unify observe -> replay -> intervene -> compare -> release
- across multiple runtimes
- with a real model of agents, topology, and performance

## Why The Current Standalone Demo Is Not Enough

The current repo is still shaped like:

- one seeded workflow
- one curated live run
- one curated bad replay
- one curated optimize candidate

That makes it a good story demo.
It does not make it a practical control plane.

### The most important current breaks

1. Identity is weak.

Today the system mostly knows roles and steps, not real agents.

It does not model:

- agent identity
- agent version
- agent instance
- runtime origin
- topology edges
- cluster membership

2. Replay is too flat.

It collapses history into a clean storyline instead of preserving:

- retries
- loops
- concurrency
- child agents
- branch structure
- cross-runtime spans

3. Metrics are too shallow.

It mostly knows:

- credits
- duration
- tokens
- tool calls

That is not enough for a serious operator.

4. The map is still partly decorative.

It looks much better now, but it still assumes a small curated cast.
That does not scale to:

- 15 agents
- 40 agents
- 200 agents

5. Memory is still a view, not an engine.

We have operational context as a helpful product idea.
We do not yet have a durable operational memory system that can explain:

- seen-before incidents
- topology drift
- policy drift
- repeated bottlenecks
- what intervention worked before

## What The Product Must Become

Agent Studio should become a control plane for real multi-agent systems.

That means four practical jobs:

1. Register the system
The user should be able to connect or declare their actual agents and runtimes.

2. Observe the system
The system should show current topology, runs, incidents, agent pressure, spend, and latency in a way that still works when the graph is large.

3. Explain the system
The system should make bad runs legible:

- what happened
- where it went wrong
- what changed since healthy

4. Improve the system
The system should support:

- manual interventions
- scenario testing
- candidate comparison
- guarded rollout
- rollback

## Core Product Thesis

Recommended category:

- The open control plane for multi-agent systems.

Recommended promise:

- connect your current agents
- see what they are doing
- diagnose what changed
- test a better operating setup
- roll it out safely

Recommended anti-promise:

- not another framework
- not another visual builder
- not another generic observability tool
- not magical autonomous self-improvement

## Product Model Reset

We should stop thinking in the standalone repo as:

- one workflow with named roles

We should start thinking as:

- workspace
- runtime
- system
- agent
- topology
- execution
- trace/span
- artifact
- intervention
- evaluation
- release

### The four user-facing objects

The top-level user objects should be:

- System
- Run
- Replay
- Release

Everything else should support those four.

## Frontend Reset

### The graphic environment should be useful, not ornamental

The map should stay visually magnetic.
But it must operate like an instrument panel, not a poster.

### Required views

1. System overview

Purpose:

- tell the operator whether the system is healthy
- surface incidents, cost pressure, and hot agents

2. Topology view

Purpose:

- show the live system graph
- scale beyond a handful of nodes

Requirements:

- zoom and pan
- search
- collapse by cluster
- group by runtime
- group by role
- group by sub-system
- heat overlays for:
  - latency
  - failures
  - retries
  - spend
  - intervention targets
- selectable edges and nodes
- time-window filter
- activity playback

3. Replay view

Purpose:

- reconstruct what happened
- identify the decision point

Requirements:

- phase or span timeline
- paired baseline comparison
- branch and retry visibility
- agent-to-agent handoff trail
- exact artifacts and evidence trail

4. Improve view

Purpose:

- compare interventions and candidates
- support release decisions

Requirements:

- scenario-based testing
- spend / assurance / throughput scoring
- expected blast radius
- candidate vs baseline compare
- promotion and rollback path

5. Agent catalog

Purpose:

- give the user a stable registry of current agents

Requirements:

- agent identity
- runtime
- version
- capabilities
- recent health
- recent runs
- attached tools and memory
- owning system(s)

### One practical warning

Free-dragging nodes is a nice secondary interaction.
It cannot be the core topology UX for serious systems.

For large systems, the default needs to be:

- clustered
- searchable
- filterable
- machine-arranged

Free arrange can remain as a local exploration mode.

## Backend Reset

The current control-room contract should become a derived product view, not the source of truth.

### Core backend layers

1. Registration layer

Stores:

- runtimes
- adapters
- systems
- agents
- topology snapshots

2. Telemetry layer

Stores:

- executions
- spans
- artifacts
- metrics
- events

3. Control layer

Stores:

- directives
- interventions
- experiments
- evaluations
- releases
- rollbacks

4. Operational memory layer

Stores and retrieves:

- similar incidents
- healthy baselines
- topology drift
- intervention outcomes
- release outcomes
- evidence provenance

### Recommended core entities

- `RuntimeRegistration`
- `SystemDefinition`
- `AgentDefinition`
- `AgentInstance`
- `TopologySnapshot`
- `Execution`
- `Span`
- `Artifact`
- `MetricSample`
- `Intervention`
- `Evaluation`
- `ReleaseDecision`

### Storage recommendation

Phase 1:

- Postgres for registry, control state, and derived views
- JSONB for flexible adapter payloads
- object storage for large artifacts
- pgvector for similarity and incident retrieval

Phase 2 if event volume justifies it:

- ClickHouse for high-volume spans and metric samples

This gives us a practical start without overbuilding early.

## Memory, RAG, And Third-Party Tools

## Memory

The product should center on operational memory, not generic RAG chat.

The memory system should answer:

- Have we seen this before?
- What changed?
- What intervention worked last time?
- Which agents are repeatedly involved?
- Which topology shape tends to fail?

### Recommended progression

MVP:

- run similarity
- healthy-baseline retrieval
- intervention history
- release outcome retrieval

Later:

- temporal graph layer for causal and relationship-rich context

### Practical technology recommendation

For now:

- Postgres + pgvector

Later, if we need richer temporal relationship retrieval:

- Graphiti as an optional temporal graph layer

Relevant sources:

- [Graphiti](https://github.com/getzep/graphiti)
- [Mem0 overview](https://docs.mem0.ai/platform/features/platform-overview)

### Important product call

Mem0-style memory can be useful for:

- agent memory
- user memory
- session memory

But it should not define the control plane.

Operational memory is the core.

## RAG

Generic doc RAG is not the center of this product.

Useful RAG roles:

- incident evidence retrieval
- policy or runbook lookup
- artifact recall
- tool usage context

Bad role:

- replacing the control plane with a chat box

## Third-party tools

Third-party tools matter, but as helpers, not identity.

Good integration classes:

- MCP servers
- GitHub
- Slack
- incident systems
- docs and wiki systems
- tracing providers
- vector stores

They should help:

- enrich context
- trigger actions
- attach evidence

They should not redefine what the product is.

## Is There Demand?

My answer is yes, with one condition:

the product must solve a pain that current runtime-native tools do not solve cleanly.

### Where demand is likely strongest

- AI platform teams
- teams running coding agents
- internal ops and workflow automation teams
- agencies or service teams running repeatable multi-agent systems
- teams with more than one runtime in the stack

### Where demand is weak

- people who do not already have agent systems
- teams that only want a chatbot
- teams that only want prompt analytics

### Demand test we should use

We should treat the next build phase as a demand test, not just a product sprint.

Success looks like:

- at least 3 real runtime integrations
- at least 5 design partners with existing agent systems
- repeated use of replay and intervention workflows
- at least one user changing a system because Agent Studio surfaced the problem clearly

Failure looks like:

- users only admiring the map
- no one using replay to decide changes
- no one trusting release recommendations

## Self-Evolving Aspect

Yes, we should keep this.

But it must be earned.

The right progression is:

1. Manual diagnosis
2. Suggested interventions
3. Assisted apply-to-candidate
4. Guarded rollout
5. Opt-in auto-improvement for narrow scopes

Never skip straight to:

- “the system just evolves itself”

That is hype-first and trust-destroying.

### Guardrails for auto-improvement

- opt-in only
- scope-limited
- confidence threshold
- explainable evidence
- canary or shadow path first
- automatic rollback path
- full audit trail

## What We Should Port From Violema

Do not port the whole surface.

Port the strongest control-room ideas:

- the operator loop
- the operator brief
- operational context as an action engine
- scenario-based optimize flow
- scoped role or phase interventions
- paired replay with a clear fix path
- promotion audit and rollback suggestion

Do not simply port:

- every governance panel
- every branch-family surface
- every experimental lab concept

This product needs clarity more than completeness.

## Recommendation

Build Agent Studio.

But reset it around this definition:

- a practical, runtime-agnostic control plane for bring-your-own multi-agent systems

Do not continue the current path as if visual polish alone will get us there.

The next build phase should begin with:

1. control-plane contract redesign
2. agent and runtime registry
3. trace and metric ingestion model
4. topology model that scales
5. replay and intervention loop

Only then should we do the next serious UI implementation pass.
