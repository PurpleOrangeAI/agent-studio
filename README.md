# Agent Studio

The open control room for multi-agent systems.

Agent Studio is for teams running real agents and multi-agent systems who need to answer four practical questions:

- What is running right now?
- Which agents or systems are under pressure?
- What exactly failed?
- What should change before the next release?

This repo currently gives you:

- a public control-room demo
- a runtime-agnostic control-plane contract
- a bring-your-own ingest path
- a shipped LangGraph adapter

It is not another agent builder and it is not a generic RAG chat tool.

## Live demo

- Public demo: https://agent-studio-sage.vercel.app

![Agent Studio public demo](./docs/assets/agent-studio-demo.png)

## What ships here

- `apps/web` for the public demo shell with `Live`, `Replay`, and `Optimize`
- `apps/api` for the local API and ingest surface
- `packages/contracts` for the shared runtime contract
- `packages/sdk-js` for JS instrumentation
- `packages/sdk-python` for the Python instrumentation path
- `packages/demo` for the seeded demo dataset
- `packages/adapters/langgraph` for the first shipped adapter
- `packages/adapters/openhands` is planned, not shipped yet

## Why this exists

Most agent tooling is strong at one piece of the loop:

- framework
- tracing
- evals
- memory
- prompt iteration

Agent Studio is aimed at the operating loop across all of that:

- ingest your systems
- inspect fleet pressure
- replay the failing path
- compare the candidate change
- release with evidence

## Current product surface

The current public demo already shows the core shape:

- system-first overview instead of workflow-first storytelling
- cross-system fleet overview and watchlist
- searchable agent roster
- execution and release history
- time-windowed analytics
- persistent hosted control-plane state on the public demo

## Bring your own agents

Agent Studio is built to ingest external systems instead of forcing you into one framework.

- shipped first adapter:
  - LangGraph
- current generic path:
  - control-plane ingest endpoints
- planned next adapter:
  - OpenHands

## Fastest connection path

The shortest safe path inside the product is:

1. Register the runtime and system
2. Import the agent roster and topology
3. Import executions, spans, and metrics
4. Import evaluations or release decisions

That progression matters:

- `Live` needs agents and topology
- `Replay` needs executions and spans
- `Optimize` needs evaluation or release evidence

## Read This First

- [Install](./docs/install.md)
- [Quickstart](./docs/quickstart.md)
- [Demo](./docs/demo.md)
- [LangGraph adapter](./docs/adapters/langgraph.md)
- [OpenHands adapter](./docs/adapters/openhands.md)

## Public launch

This repo is the standalone open-source surface for Agent Studio. The public demo reads seeded data from the API, and the API defaults to `http://localhost:4000`.

## Persistence modes

Agent Studio now supports three storage modes:

- `memory`
  - default fallback
  - good for a seeded demo
  - not durable across cold starts
- `file`
  - self-hosted persistence
  - set `AGENT_STUDIO_STORE_FILE=/absolute/path/to/store.json`
- `blob`
  - hosted persistence for Vercel deployments
  - uses `BLOB_READ_WRITE_TOKEN`
  - optional `AGENT_STUDIO_BLOB_PATH` overrides the default snapshot path `control-plane/store.json`

If `BLOB_READ_WRITE_TOKEN` is present, Agent Studio automatically prefers hosted blob persistence.
