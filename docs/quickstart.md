# Quickstart

This is the fastest way to see Agent Studio locally without watching a video.

## 1. Install dependencies

```bash
corepack pnpm install
```

## 2. Start the API

The API serves the seeded demo and defaults to `http://localhost:4000`.

```bash
corepack pnpm --filter @agent-studio/api dev
```

## 3. Start the web app

Point the web app at the local API, then open the demo shell.

```bash
VITE_API_URL=http://localhost:4000 corepack pnpm --filter @agent-studio/web dev
```

Open the web app at the Vite URL printed in the terminal, usually `http://localhost:5173`.

## What you should see

- A seeded workflow loaded from the API
- A system-first overview with fleet and agent management surfaces
- The `Connect`, `Live`, `Replay`, and `Optimize` rooms
- An onboarding panel that explains the control loop and room requirements

## Fastest bring-your-own path

If you want to connect your own system instead of only browsing the seeded demo:

1. Open `Connect`
2. Register the runtime and system
3. Import the agent roster and topology
4. Import executions, spans, and metrics
5. Import evaluations or release decisions

Room requirements:

- `Live` becomes practical once agents and topology exist
- `Replay` becomes practical once executions and spans exist
- `Optimize` becomes practical once evaluations or releases exist

## If you only want to verify the repo

```bash
corepack pnpm build
corepack pnpm test
```
