# Tasks

## P0 - Reliability and baseline automation

- [x] Add `scripts/audit-courses-frontmatter.ts` so `.husky/pre-commit` no longer references a missing script; validate required metadata and fail on errors.
- [x] Update `.husky/pre-commit` to use `bunx lint-staged` and guard against empty file lists.
- [x] Create `.github/workflows/ci.yml` to run `bun install`, `bun run lint`, `bun run check`, and `bun run test:unit` on PRs.
- [x] Add a CI job for `bun run test:integration` with Playwright browser caching and artifacts on failure.
- [x] Add CI caching for Bun dependencies, Playwright browsers, and `.svelte-kit` outputs.
- [x] Add CI concurrency settings to cancel redundant runs on the same branch.
- [x] Pin runtime versions by adding `.node-version` and `package.json` `engines` (optionally `.tool-versions`).

## P1 - Speed and developer ergonomics

- [x] Add a `clean` script to remove `build`, `.svelte-kit`, `test-results`, and `.vite` caches.
- [x] Enable lint caching (`prettier --cache`, `eslint --cache`) and update scripts accordingly.
- [x] Add a `test:integration:dev` script that reuses an existing preview server and skips `bun run build`.
- [x] Split integration test flow to build once, then reuse the output for Playwright (faster CI/local runs).
- [x] Add `PLAYWRIGHT_BASE_URL`/`PLAYWRIGHT_PORT` support in `playwright.config.ts` to avoid hard-coded ports.
- [ ] Add a `content:validate` script to check frontmatter completeness, slug uniqueness, internal links, and missing assets.
- [ ] Add path-based CI gating to skip heavy jobs when only docs/content change.

## P2 - Scale and visibility

- [ ] Introduce Git LFS (or external asset storage) for large binary assets and document usage.
- [ ] Add a `build:stats` script to generate bundle size reports and track growth over time.
- [ ] Add CI artifact upload for Playwright traces/screenshots to speed up debugging.
- [ ] Add `CONTRIBUTING.md` with local fast vs full build/test guidance.
- [ ] Precompute and cache content indexes so SSG doesn't glob large trees on every build.
- [ ] Add an image pipeline cache so `processImages` doesn't recompute on every run.
