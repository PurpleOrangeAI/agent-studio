# LangGraph Adapter

Status: shipped.

This is the first implemented adapter path in the repo.

## What it does

The LangGraph adapter reads a deployed LangGraph assistant, thread, state history, and run data, then maps them into Agent Studio's shared contract.

It syncs:

- workflow
- run
- operational context
- replay

## Where it lives

- `packages/adapters/langgraph`
- Example: `packages/adapters/langgraph/examples/basic.ts`

## Setup

### Preconditions

From the repo root, install dependencies first:

```bash
corepack pnpm install
```

Then make sure the adapter package checks and builds cleanly:

```bash
corepack pnpm --filter @agent-studio/adapter-langgraph build
corepack pnpm --filter @agent-studio/adapter-langgraph check:examples
```

### Environment

Required:

- `LANGGRAPH_API_URL`
- `LANGGRAPH_THREAD_ID`
- `AGENT_STUDIO_API_URL`
- `LANGGRAPH_ASSISTANT_ID` or `LANGGRAPH_GRAPH_ID`

Optional:

- `LANGGRAPH_API_KEY`
- `LANGGRAPH_RUN_ID`
- `AGENT_STUDIO_API_TOKEN`

### Run the example

The example is the package's basic import path. Run it from the adapter directory with the workspace installed:

```bash
cd packages/adapters/langgraph
LANGGRAPH_API_URL=https://your-langgraph.example \
LANGGRAPH_THREAD_ID=thread_123 \
LANGGRAPH_ASSISTANT_ID=assistant_123 \
AGENT_STUDIO_API_URL=http://localhost:4000 \
corepack pnpm dlx tsx examples/basic.ts
```

If your deployment is graph-first rather than assistant-first, replace `LANGGRAPH_ASSISTANT_ID` with `LANGGRAPH_GRAPH_ID`.

If your LangGraph or Agent Studio endpoints require auth, add:

```bash
LANGGRAPH_API_KEY=...
LANGGRAPH_RUN_ID=...
AGENT_STUDIO_API_TOKEN=...
```

## Input it expects

The adapter is built around a LangGraph deployment and a target thread.

At minimum, you provide:

- `apiUrl`
- `threadId`
- either `assistantId` or `graphId`

Useful optional inputs include:

- `runId`
- `historyLimit`
- `runLimit`
- `headers`

## How it behaves

The adapter uses the LangGraph SDK to read:

- assistant metadata
- graph shape when available
- thread state
- thread history
- runs for the thread

It then emits these Agent Studio payloads through the JS SDK:

- workflow
- run
- operational context
- replay

The example prints the imported workflow id, mapped run status, replay step count, and any limitations returned by the sync.

## Limits

Be honest about the current shape:

- LangGraph does not expose a first-class Agent Studio workflow object, so the workflow is synthesized from deployed graph and assistant data.
- LangGraph does not expose a first-class replay object, so the replay is synthesized from thread history and checkpoint state.
- If graph schema or assistant graph data is missing, the adapter falls back to the history and still emits warnings.
- The source system stays the source of truth; Agent Studio is the control room and ingest layer.
- The example is a one-way import path, not a bidirectional sync.
- The package does not create LangGraph runs or mutate LangGraph state.

## Minimal mental model

Use LangGraph when you want to:

- connect an existing LangGraph deployment
- inspect it in Agent Studio
- compare runs and replay history
- feed the result into the release loop

## Example

See the package example under:

- `packages/adapters/langgraph/examples/basic.ts`
