---
paths:
  - 'package.json'
  - 'bunfig.toml'
  - 'bun.lock'
  - 'bun.lockb'
  - '.github/workflows/*.yml'
  - 'playwright.config.ts'
  - 'scripts/validate-content.ts'
  - 'vite.config.ts'
---

# CI and tooling notes

- Commit `bun.lockb` alongside `bun.lock` for Bun 1.1.0 CI. Frozen installs fail if the binary lockfile is missing or out of sync.
- When mapping course lessons in `scripts/validate-content.ts`, use the first path segment as the course slug and the last segment as the lesson slug. Guard against files directly under `content/courses/`.
- When `PLAYWRIGHT_BASE_URL` omits a port, build a resolved URL with the preview port and reuse it for both `webServer.url` and `use.baseURL`.
- Keep Node requirements consistent across `.node-version`, `CONTRIBUTING.md`, and `package.json` `engines.node`.
- If Rollup plugin types conflict with Vite types, cast the plugin to Vite's `Plugin` in `vite.config.ts`.
- Prefer `.js` build-time plugins in `svelte.config.js` (worker threads won’t honor `--import tsx`), and only rely on `NODE_OPTIONS="--import tsx"` for tools that actually need TS loaders (e.g. `svelte-check`, `vitest`).
- Load `@sveltejs/enhanced-img` lazily (or guard it) so builds don’t fail when `sharp` is unavailable in CI.
- On Linux CI, ensure both `@img/sharp-linux-x64` and `@img/sharp-libvips-linux-x64` are present so sharp can load its native libs.
- When `vitest.config.ts` imports `vite.config.ts`, run Vitest with `NODE_OPTIONS="--import tsx"` to avoid `.ts` loader errors.
- Add `bunfig.toml` `[test] root = "src"` so `bun test` doesn’t try to run Playwright specs in `tests/`.
- Playwright screenshot baselines are platform-specific (`*-linux.png` in CI); ensure Linux snapshots exist and push LFS objects (`git lfs push --all origin <branch>`) so CI can fetch them.
