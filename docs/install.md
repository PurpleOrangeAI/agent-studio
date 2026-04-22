# Install

Agent Studio is a pnpm workspace.

## Requirements

- Node.js with Corepack available
- `pnpm` via Corepack

## Clone and install

```bash
git clone https://github.com/purpleorangeai/agent-studio.git
cd agent-studio
corepack pnpm install
```

## Root commands

These are the root scripts the repo currently exposes:

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
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

## Persistence

Agent Studio supports:

- ephemeral memory mode
- self-hosted file persistence
- hosted Vercel Blob persistence

For self-hosted file persistence:

```bash
export AGENT_STUDIO_STORE_FILE="$PWD/.agent-studio/store.json"
corepack pnpm --filter @agent-studio/api dev
```

For hosted blob persistence on Vercel:

- link a private Blob store to the project so `BLOB_READ_WRITE_TOKEN` is present
- optionally set `AGENT_STUDIO_BLOB_PATH`
- the API will automatically switch to blob mode when the token exists

## Repo layout

- `apps/web` is the public demo shell
- `apps/api` is the local API and ingest surface
- `packages/contracts` is the shared contract
- `packages/sdk-js` is the JS SDK
- `packages/sdk-python` is planned and still a placeholder
- `packages/demo` is the seeded demo dataset
- `packages/adapters/langgraph` is the first shipped adapter
- `packages/adapters/openhands` is a planned adapter guide only

## Notes

- The public demo is seeded and read-only.
- The API serves the demo from `http://localhost:4000` by default.
- The web app reads seeded demo state from the API at `/api/demo/state`.
