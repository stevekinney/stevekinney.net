# Open Graph Image Metadata Fix Notes

## Stack Findings

- Framework: SvelteKit application in a Bun/Turbo monorepo.
- Application package: `applications/website` (`@stevekinney/website`).
- Root build script: `bun run build` runs `turbo run build --filter=@stevekinney/website`.
- Website dev server: `bun run dev` at the repository root, which delegates to `applications/website` and starts Vite on port `4444`.
- Website unit test runner: Vitest via `applications/website` script `bun run test:unit`.
- Integration test runner: Playwright via `applications/website` script `bun run test:integration`.
- Existing Open Graph integration coverage lives in `applications/website/tests/open-graph.spec.ts`.
- Shared SEO metadata component: `packages/components/seo.svelte`.

## Initial Source Observations

- `packages/components/seo.svelte` emits `og:image`, `og:title`, `og:description`, and `twitter:card`.
- Writing pages render `SEO` from `applications/website/src/routes/writing/[slug]/+page.svelte`.
- Course landing pages render `SEO` from `applications/website/src/routes/courses/[course]/+page.svelte`.
- Course lesson pages render `SEO` from `applications/website/src/routes/courses/[course]/[lesson]/+page.svelte`.
- The SEO component generates per-route image URLs as `${baseUrl}${pathname}/open-graph.jpg?v=${hash}` when no custom image parameters are used.

## Captured Metadata Fixtures

- Saved production `<head>` fixtures under `tests/fixtures/`:
  - `tests/fixtures/og-working.html` from `https://stevekinney.com/writing/agent-loops`.
  - `tests/fixtures/og-failing-ai-gateway.html` from `https://stevekinney.com/writing/ai-gateway-durable-workflows`.
  - `tests/fixtures/og-failing-self-testing.html` from `https://stevekinney.com/courses/self-testing-ai-agents`.
- All three production fixtures currently include the required Open Graph and Twitter tags:
  - `og:title`
  - `og:description`
  - `og:image`
  - `twitter:card`
- The reported production discrepancy did not reproduce on May 5, 2026:
  - `agent-loops` fixture has `og:image` set to `https://stevekinney.com/writing/agent-loops/open-graph.jpg?v=ea720da8`.
  - `ai-gateway-durable-workflows` fixture has `og:image` set to `https://stevekinney.com/writing/ai-gateway-durable-workflows/open-graph.jpg?v=765a8603`.
  - `self-testing-ai-agents` fixture has `og:image` set to `https://stevekinney.com/courses/self-testing-ai-agents/open-graph.jpg?v=42f79e64`.

## External Image Probe

- `https://stevekinney.com/writing/agent-loops/open-graph.jpg?v=ea720da8`
  - HTTP status: `200`
  - `Content-Type`: `image/jpeg`
- `https://stevekinney.com/writing/ai-gateway-durable-workflows/open-graph.jpg?v=765a8603`
  - HTTP status: `200`
  - `Content-Type`: `image/jpeg`
- `https://stevekinney.com/courses/self-testing-ai-agents/open-graph.jpg?v=42f79e64`
  - HTTP status: `200`
  - `Content-Type`: `image/jpeg`

## Regression Test Failure Before Source Fix

- Added `tests/og-metadata.test.ts`.
- The first TDD run used `bunx vitest run tests/og-metadata.test.ts`.
- The test builds the site with `PUBLIC_SITE_URL`, `VERCEL`, and `VERCEL_PROJECT_PRODUCTION_URL` unset, starts a local preview server, parses the production fixtures, parses the built page HTML, and fetches the generated image path from the local preview server.
- Before the source fix, the local production build failed the `https://` image invariant:
  - `agent-loops`: `http://localhost:4444/writing/agent-loops/open-graph.jpg?v=ea720da8`
  - `ai-gateway-durable-workflows`: `http://localhost:4444/writing/ai-gateway-durable-workflows/open-graph.jpg?v=765a8603`
  - `self-testing-ai-agents`: `http://localhost:4444/courses/self-testing-ai-agents/open-graph.jpg?v=42f79e64`

## Fix

- Changed `packages/components/seo.svelte` so Open Graph and Twitter image URLs fall back to the canonical site URL from `$lib/metadata` instead of `page.url.origin` when `PUBLIC_SITE_URL` is unset.
- This keeps generated social image URLs absolute and `https://` in production build output even when the deployment environment does not provide a public URL variable.

## Address PR Skill Applicability

- The required `address-pr` skill was loaded first.
- The current worktree is detached at `55c464ae`.
- `gh pr view --json number,state,url,title,headRefName,baseRefName` could not resolve a pull request because there is no current branch.
- There is no pull request target for the PR-only review-thread and CI stabilization loop, so this task proceeds as a local repository fix and commit without creating a branch.
