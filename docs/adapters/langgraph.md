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

It then emits Agent Studio payloads through the JS SDK.

## Limits

Be honest about the current shape:

- LangGraph does not expose a first-class Agent Studio workflow object, so the workflow is synthesized from deployed graph and assistant data.
- LangGraph does not expose a first-class replay object, so the replay is synthesized from thread history and checkpoint state.
- If graph schema or assistant graph data is missing, the adapter falls back to the history and still emits warnings.
- The source system stays the source of truth; Agent Studio is the control room and ingest layer.

## Minimal mental model

Use LangGraph when you want to:

- connect an existing LangGraph deployment
- inspect it in Agent Studio
- compare runs and replay history
- feed the result into the release loop

## Example

See the package example under:

- `packages/adapters/langgraph/examples/basic.ts`
