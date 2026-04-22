# Public Release Prep

This checklist is the honest boundary of what the current repo can support for the first public release.

## What is ready

- The repo builds, tests, and seeds a public demo loop locally.
- The web shell already supports `VITE_API_URL`, so a deployed preview can point at a real API base URL.
- The docs now explain the product surface without requiring a video.

## Current blocker

- The API is a separate Node HTTP server today, not a Vercel-hosted app in this repo.
- It is not deployable as a standalone folder checkout: the current runtime expects workspace-root build outputs from internal packages such as `packages/contracts`, `packages/demo`, and the SDK/adapter packages.
- A Vercel deployment of `apps/web` is only a real public demo if those monorepo build artifacts already exist and the API is hosted somewhere reachable with `VITE_API_URL` pointing at it.
- Do not publish the release as fully live until that combined build-and-hosting path exists and is verified.

## GitHub release and tag steps

- [ ] Confirm the working tree is clean.
- [ ] Run `corepack pnpm build`, `corepack pnpm lint`, and `corepack pnpm test` on a clean checkout.
- [ ] Pick the first public tag name you will use, then create an annotated tag at the release commit.
- [ ] Push the tag to GitHub once a remote exists.
- [ ] Draft the GitHub release notes from the tag commit and summarize the public demo, the API boundary, and any known caveats.
- [ ] Attach the screenshots and demo clip before marking the release public.

## Screenshot and demo clip checklist

Capture only seeded, public-safe content.

- [ ] Hero / landing view showing `Live`, `Replay`, and `Optimize`.
- [ ] `Live` room with a representative workflow selected.
- [ ] `Replay` room showing the failure/evidence story.
- [ ] `Optimize` room showing the promotion decision.
- [ ] Mobile or narrow-layout shot if the public page is expected to be responsive.
- [ ] One short demo clip that shows the full operator loop without exposing private data.
- [ ] Verify every asset is readable at thumbnail size and does not rely on hidden context.

## Vercel deployment checklist for the web/demo site

These steps apply to `apps/web`, not the API server.

- [ ] Create or link the Vercel project for this repo.
- [ ] Set the root directory to `apps/web`.
- [ ] Use the Vite build output (`dist`) as the deployment target.
- [ ] If the API is still running from this monorepo, make sure the workspace packages have already been built from the repo root before starting the API host.
- [ ] Set `VITE_API_URL` to the reachable public API base URL.
- [ ] Deploy a preview and confirm the page loads the seeded demo state.
- [ ] Verify the deployed page can reach `/api/demo/state` through the configured API URL.
- [ ] Add the custom domain in Vercel project settings only after the preview is confirmed.
- [ ] Treat the latest production deployment as the source for the release domain.

## Clean-machine verification checklist

- [ ] Clone the repo into a fresh directory.
- [ ] Run `corepack enable`.
- [ ] Run `corepack pnpm install --frozen-lockfile`.
- [ ] Run `corepack pnpm build`.
- [ ] Run `corepack pnpm lint`.
- [ ] Run `corepack pnpm test`.
- [ ] Start the API with `corepack pnpm --filter @agent-studio/api dev`.
- [ ] Start the web shell with `VITE_API_URL=http://localhost:4000 corepack pnpm --filter @agent-studio/web dev`.
- [ ] Confirm the public demo loads and the seeded workflow renders.
- [ ] Confirm `http://localhost:4000/health` and `http://localhost:4000/api/demo/state` respond as expected.

## Release notes to call out

- The public demo is seeded and read-only by design.
- The web shell depends on a separately hosted API.
- No live public GitHub release or production Vercel deployment should be claimed until those external steps are actually completed.
