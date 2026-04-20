# Agent Studio

The open control room for multi-agent systems.

This repo currently gives you a seeded local control-room demo plus a LangGraph ingest path. Agent Studio is runtime-agnostic, replay-first, evidence-backed, and built around a safe release loop. It is not another agent builder and it is not a generic RAG chat tool.

## What ships here

- `apps/web` for the public demo shell with `Live`, `Replay`, and `Optimize`
- `apps/api` for the local API and ingest surface
- `packages/contracts` for the shared runtime contract
- `packages/sdk-js` for JS instrumentation
- `packages/sdk-python` for the planned Python path
- `packages/demo` for the seeded demo dataset
- `packages/adapters/langgraph` for the first shipped adapter
- `packages/adapters/openhands` is planned, not shipped yet

## Read This First

- [Install](./docs/install.md)
- [Quickstart](./docs/quickstart.md)
- [Demo](./docs/demo.md)
- [LangGraph adapter](./docs/adapters/langgraph.md)
- [OpenHands adapter](./docs/adapters/openhands.md)

## Public launch

This repo is the standalone open-source surface for Agent Studio. The public demo reads seeded data from the API, and the API defaults to `http://localhost:4000`.
