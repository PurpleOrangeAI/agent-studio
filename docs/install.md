# Install

Agent Studio is a pnpm workspace.

## Requirements

- Node.js with Corepack available
- `pnpm` via Corepack

## Clone and install

```bash
git clone <repo-url>
cd agent-studio
corepack pnpm install
```

## Root commands

These are the root scripts the repo currently exposes:

```bash
corepack pnpm build
corepack pnpm test
```

## Local demo commands

Run the API in one terminal:

```bash
corepack pnpm --filter @agent-studio/api dev
```

Run the web app in another terminal:

```bash
VITE_API_URL=http://localhost:4000 corepack pnpm --filter @agent-studio/web dev
```

## Repo layout

- `apps/web` is the public demo shell
- `apps/api` is the local API and ingest surface
- `packages/contracts` is the shared contract
- `packages/sdk-js` is the JS SDK
- `packages/sdk-python` is the Python path
- `packages/demo` is the seeded demo dataset
- `packages/adapters/langgraph` is the first shipped adapter
- `packages/adapters/openhands` is a planned adapter guide only

## Notes

- The public demo is seeded and read-only.
- The API serves the demo from `http://localhost:4000` by default.
- The web app reads seeded demo state from the API at `/api/demo/state`.
