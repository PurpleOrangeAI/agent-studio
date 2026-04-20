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
- The `Live`, `Replay`, and `Optimize` rooms
- A public demo shell that is read-only by default
- An onboarding panel that explains the control loop

## If you only want to verify the repo

```bash
corepack pnpm build
corepack pnpm test
```
