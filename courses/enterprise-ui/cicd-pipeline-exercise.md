---
title: 'Exercise 7: CI/CD Pipeline'
description: >-
  Build a GitHub Actions workflow that runs the full quality gate on every push,
  uses Turborepo for caching, and adds Lighthouse CI performance budgets to
  catch regressions before they ship.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

You have a working monorepo with type checking, linting, tests, and build orchestration via Turborepo. But none of this runs automatically when code is pushed. You're going to build a GitHub Actions workflow that runs the full quality gate on every push and pull request, uses Turborepo for caching, and adds Lighthouse CI performance budgets to catch regressions before they ship.

## Why It Matters

A CI pipeline is where architecture decisions become enforceable. The boundary rules you configured in Exercise 6 only matter if they run on every pull request. The TypeScript incremental builds from Exercise 5 only save time if CI caches the `.tsbuildinfo` files. The Turborepo caching from Exercise 4 only pays off if CI shares a remote cache across runs. Without CI, your architecture is a suggestion. With CI, it's a gate.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 6 left off. If you need to catch up:

```bash
git checkout 06-cicd-start
pnpm install
```

Open `.github/workflows/ci.yml` — it contains a placeholder with the trigger configuration and a TODO comment.

---

## Step 1: Create the Basic Workflow

Build the workflow file from scratch. Open `.github/workflows/ci.yml` and add the foundation:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
```

> [!NOTE]
> **A lockfile records the exact resolved version of every dependency in your project.** When you run `pnpm install`, pnpm resolves version ranges (like `^18.2.0`) to specific versions (like `18.2.0`), downloads them, and records the exact version, integrity hash, and resolution path in `pnpm-lock.yaml`. Subsequent installs read the lockfile and skip resolution entirely, installing exactly the same versions every time. The `--frozen-lockfile` flag goes further: it refuses to install if the lockfile does not match `package.json`, meaning someone added or changed a dependency without running `pnpm install` locally and committing the result. This matters in CI because without a lockfile, `pnpm install` would resolve version ranges against the registry at install time — and a new patch release published between your local test and the CI run could produce different dependency versions, creating the classic "works on my machine" failure.

### What Each Step Does

- **`actions/checkout@v4`** — Clones the repository. `fetch-depth: 2` fetches the current commit and its parent, which is enough for Turborepo's change detection without downloading the entire git history.

- **`pnpm/action-setup@v4`** — Installs pnpm globally on the runner. The `version: 9` matches the version used in development.

- **`actions/setup-node@v4`** — Installs Node.js and caches the pnpm store. The `cache: "pnpm"` option tells the action to cache `~/.pnpm-store` between runs, so subsequent installs only download new or changed packages.

- **`pnpm install --frozen-lockfile`** — Installs dependencies from the lockfile exactly as specified. The `--frozen-lockfile` flag fails the build if the lockfile is out of date — this catches cases where someone added a dependency but forgot to commit the updated lockfile.

> [!NOTE]
> **Why `fetch-depth: 2` and not `0` or `1`:** `fetch-depth: 0` downloads the entire git history, which is slow for large repositories. `fetch-depth: 1` (the default) downloads only the current commit with no parent, which prevents git-based change detection from working. `fetch-depth: 2` is the sweet spot — one parent commit is enough for Turborepo to determine what changed between this push and the previous state.

### Checkpoint

You have a workflow that installs dependencies. It doesn't run any checks yet, but the foundation is correct.

---

## Step 2: Add Turborepo-Powered Quality Checks

Add the typecheck, lint, test, and build steps. Each one delegates to Turborepo so it benefits from caching and dependency-aware execution:

```yaml
- name: Typecheck
  run: pnpm turbo typecheck

- name: Lint
  run: pnpm turbo lint

- name: Test
  run: pnpm turbo test

- name: Build
  run: pnpm turbo build
```

These run sequentially in the `build` job. Each step uses Turborepo's local cache, so if the typecheck already built `@pulse/shared`, the lint step's cache for that package is warm.

> [!IMPORTANT]
> **Why these steps run sequentially, not in parallel:** Each step within a job runs on the same runner, sharing the filesystem. Turborepo handles parallelism _within_ each step — `turbo typecheck` type-checks all independent packages in parallel. Making the four commands sequential means a lint failure stops the pipeline before wasting time on a full build. If you wanted true parallelism, you'd put each step in a separate job — but then they don't share the local Turborepo cache.

---

## Step 3: Configure Remote Caching

Turborepo's local cache lives on the runner's filesystem and is discarded when the runner shuts down. Remote caching stores build artifacts in a shared cache that persists across CI runs.

1. Add environment variables for remote caching. Update the `build` job:

```yaml
build:
  runs-on: ubuntu-latest
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
  steps:
    # ... existing steps
```

> [!NOTE]
> **Setting up remote caching (conceptual):** In a real project, you'd create a Vercel account (Turborepo's default remote cache provider), link your repository with `npx turbo login` and `npx turbo link`, and add the resulting `TURBO_TOKEN` as a repository secret in GitHub. The `TURBO_TEAM` is your Vercel team slug. When Turborepo runs in CI with these environment variables set, it uploads build artifacts to the remote cache after each task and downloads them on subsequent runs. Two CI runs that build the same package with the same inputs will share the cached output — even if they run on different machines.

2. The behavior change is significant. Without remote caching, the first CI run after every push rebuilds everything. With remote caching, a CI run that builds `@pulse/shared` uploads the artifact. The next CI run (on a different pull request that didn't change `@pulse/shared`) downloads the cached artifact instead of rebuilding. In a large monorepo, this can cut CI time by 50-80%.

> [!NOTE]
> **You don't need Vercel for remote caching.** Turborepo supports custom remote cache backends. You can self-host using `turborepo-remote-cache` (an open-source Node server backed by S3, GCS, or local storage) or use other providers. The protocol is documented. For the workshop, the concept matters more than the specific provider.

---

## Step 4: Add Matrix Strategy for Parallel Testing

When test suites grow, running them sequentially becomes a bottleneck. A matrix strategy runs each package's tests in its own parallel job:

```yaml
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      package: [analytics, users, ui, shared]
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 2

    - uses: pnpm/action-setup@v4
      with:
        version: 9

    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'pnpm'

    - run: pnpm install --frozen-lockfile

    - name: Test ${{ matrix.package }}
      run: pnpm turbo test --filter=@pulse/${{ matrix.package }}
```

This creates four parallel jobs — one for each package in the matrix. Each job installs dependencies and runs tests for only its assigned package.

> [!IMPORTANT]
> **Trade-off: parallelism vs. cache sharing.** Matrix jobs run on separate runners, so they don't share the local Turborepo cache. Each job installs dependencies independently. For four small packages, the overhead of four separate `pnpm install` runs might outweigh the parallelism benefit. Matrix strategies become worthwhile when individual test suites take minutes, not seconds. For this workshop, we include it to demonstrate the pattern — in production, measure before committing to it.

> [!NOTE]
> **Lighthouse is Google's open-source automated tool for auditing web page quality.** It loads your page in a controlled Chromium environment, measures real performance metrics (like Largest Contentful Paint and Cumulative Layout Shift), evaluates accessibility compliance against WCAG guidelines, checks for SEO best practices, and reports on progressive web app capabilities. Each category receives a score from 0 to 100. Lighthouse CI (`@lhci/cli`) wraps Lighthouse for use in continuous integration pipelines: it can start your application server, run multiple audit passes to reduce variance, assert that scores meet defined thresholds, and upload results for historical tracking. Running Lighthouse in CI rather than manually means every pull request is automatically checked against your performance budgets — a regression that adds 500KB of JavaScript or causes a layout shift will fail the pipeline before it reaches production.

---

## Step 5: Add Lighthouse CI Performance Budgets

Performance budgets catch regressions before they ship. Add a Lighthouse CI step that builds the dashboard and asserts performance metrics:

```yaml
lighthouse:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 2

    - uses: pnpm/action-setup@v4
      with:
        version: 9

    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'pnpm'

    - run: pnpm install --frozen-lockfile

    - name: Build Dashboard
      run: pnpm turbo build --filter=@pulse/dashboard

    - name: Run Lighthouse CI
      run: |
        npm install -g @lhci/cli
        lhci autorun
```

Create a `lighthouserc.cjs` file at the root of the repository:

> [!NOTE]
> The `.cjs` extension is required because the root `package.json` sets `"type": "module"`, which treats `.js` files as ESM. The `module.exports` syntax is CommonJS, and the `.cjs` extension tells Node.js to use CommonJS regardless of `"type": "module"`.

```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm --filter @pulse/dashboard preview',
      url: ['http://localhost:4173'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['error', { maxNumericValue: 200000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

> [!NOTE]
> **What each assertion means:**
>
> - `categories:performance >= 0.9` — The overall Lighthouse performance score must be at least 90/100.
> - `largest-contentful-paint <= 2500ms` — The main content must be visible within 2.5 seconds. This is Google's "good" threshold for LCP.
> - `cumulative-layout-shift <= 0.1` — Layout shouldn't shift more than 0.1 CLS units. Your Suspense boundary placement from Exercise 3 directly affects this metric.
> - `total-byte-weight <= 200KB` — Total JavaScript shipped must be under 200KB. This catches accidental dependency bloat — like importing all of lodash instead of a single function.

> [!IMPORTANT]
> **Performance budgets make architecture decisions measurable.** The CLS budget is directly related to your Suspense boundary placement from Exercise 3 — too many independent boundaries cause layout shifts. The total byte weight budget catches dependency bloat that the architectural linting from Exercise 6 might miss (a package might be a valid dependency but still too large). These budgets close the feedback loop: architecture decisions have quantifiable performance consequences, and CI enforces the thresholds.

### Checkpoint

The Lighthouse CI configuration is valid. The assertions define concrete performance budgets. The `lighthouse` job depends on the `build` job completing first (via `needs: build`).

---

## Step 6: Review the Complete Workflow

The final `.github/workflows/ci.yml` should have three jobs:

1. **`build`** — Installs dependencies, runs typecheck/lint/test/build with Turborepo
2. **`test`** — Matrix strategy that runs each package's tests in parallel
3. **`lighthouse`** — Builds the dashboard and asserts performance budgets

You can validate the YAML syntax locally:

```bash
npx yaml-lint .github/workflows/ci.yml
```

Or paste it into GitHub's workflow editor (Actions tab in the repository) to check for syntax errors.

### Checkpoint

The CI workflow YAML is valid. It covers type checking, linting, testing, building, and performance budgets. Turborepo handles caching within each job. Remote caching is configured for cross-run artifact sharing.

---

## Stretch Goals

- **PR comment with Lighthouse scores:** Add a step that posts the Lighthouse report as a comment on the pull request using `marocchino/sticky-pull-request-comment@v2`. This gives reviewers performance data inline with the code review.
- **Affected-only testing:** Replace the matrix strategy with `turbo test --filter=...[HEAD^1]` to only test packages affected by the current push. This is Turborepo's change detection — it compares the current commit against the parent and only runs tasks for packages with changed files.
- **Deployment step:** Add a conditional deployment step that only runs on pushes to `main` (not pull requests). Deploy the built dashboard to Vercel, Netlify, or a static hosting provider.

---

## Solution

If you need to catch up, the completed state for this exercise is available on the `07-testing-start` branch:

```bash
git checkout 07-testing-start
pnpm install
```

---

## What's Next

You have a CI pipeline that enforces your architecture on every push. But you don't have tests yet. In the next exercise, you'll write Playwright E2E tests that exercise the composed application, mock APIs with MSW, and record HAR fixtures for deterministic test replay.
