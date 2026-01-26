---
paths:
  - 'package.json'
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
