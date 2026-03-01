---
title: 'Exercise 4: Monorepo Setup'
description: >-
  Create a Turborepo configuration to get cached, dependency-aware builds.
  Experience the difference between rebuilding everything and FULL TURBO cache
  hits.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

The workspace has four packages (`analytics`, `users`, `ui`, `shared`) and a dashboard app, but there is no build orchestration. Running `pnpm -r build` rebuilds everything every time, even unchanged packages. You're going to create a `turbo.json` configuration and wire up Turborepo so builds are cached, dependency-aware, and fast.

## Why It Matters

Without a build orchestrator, every CI run and every local build starts from scratch. In a monorepo with 5 packages that takes a few seconds; in a monorepo with 50 packages it takes minutes. Turborepo's content-aware hashing means a build that has already succeeded with the same inputs is never repeated. The second build is free. Changing one leaf package only rebuilds its dependents, not the entire graph. This is the tool that makes monorepos viable at scale.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 3 left off. If you need to catch up:

```bash
git checkout 03-monorepo-start
pnpm install
```

> [!NOTE]
> At this point the workspace has `packages/users` — a feature package for user management. It follows the same pattern as `packages/analytics`: its own `package.json`, `tsconfig.json`, and `src/index.ts` with an explicit public API.

---

## Step 1: Feel the Problem

Run the build without Turborepo to understand what you're fixing.

1. Run the build across all workspace packages:

```bash
pnpm -r build
```

Note the output — every package builds, sequentially. Note how long it takes.

2. Run it again immediately, without changing anything:

```bash
pnpm -r build
```

Same time. Same output. Every package rebuilt even though nothing changed. pnpm's `--recursive` flag has no caching — it just runs the `build` script in every package that has one.

> [!NOTE]
> **Why pnpm alone isn't enough:** pnpm workspaces handle package resolution and dependency linking — they ensure that `@pulse/analytics` can import `@pulse/ui` through the workspace protocol (`workspace:*`). But pnpm has no opinion on task orchestration. It doesn't know that `@pulse/analytics` depends on `@pulse/ui` and therefore `@pulse/ui` must build first. It doesn't cache outputs. It doesn't skip unchanged packages. That's what a build orchestrator like Turborepo adds on top.

### Checkpoint

You've run `pnpm -r build` twice and both runs took roughly the same time. There is no caching, no dependency ordering, no parallelization.

---

## Step 2: Install Turborepo and Create `turbo.json`

Install Turborepo as a dev dependency at the workspace root:

```bash
pnpm add -Dw turbo
```

Create a `turbo.json` file at the root of the repository:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### What Each Field Means

- **`"dependsOn": ["^build"]`** — The `^` prefix means "run this task in my dependencies first." Before `@pulse/analytics` builds, Turborepo ensures `@pulse/ui` and `@pulse/shared` have already built. Without the caret, `dependsOn: ["build"]` would mean "run build in _this_ package first" (a self-dependency, usually not what you want).

- **`"outputs": ["dist/**"]`\*\* — Tells Turborepo which files to cache. After a successful build, it hashes the inputs (source files, dependencies, env vars) and stores the outputs. On the next run with the same inputs, it replays the cached outputs instead of running the build again.

- **`"lint": {}`** — No `dependsOn`, no `outputs`. Linting each package is independent — you don't need to lint dependencies first, and there's nothing to cache beyond the pass/fail result.

- **`"cache": false`** — The `dev` task should never be cached. It's a long-running process (a dev server), not a one-shot command.

- **`"persistent": true`** — Tells Turborepo that `dev` is a long-running process that doesn't exit. Without this, Turborepo would wait for it to finish before running dependent tasks (which would hang forever).

> [!IMPORTANT]
> **The `^` prefix is the most important concept in Turborepo.** It encodes the dependency graph into your task pipeline. When you run `turbo build`, Turborepo reads every package's `package.json` to construct the dependency graph, then uses `^build` to determine execution order. `@pulse/shared` has no dependencies, so it builds first. `@pulse/ui` depends on `@pulse/shared`, so it builds second. `@pulse/analytics` depends on both, so it builds third. The dashboard depends on everything, so it builds last. Turborepo runs packages at the same depth in parallel — `@pulse/ui` and `@pulse/users` can build at the same time because neither depends on the other.

---

## Step 3: Update Root `package.json` Scripts

Open the root `package.json` and update the scripts to use Turborepo:

```json
{
  "scripts": {
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "test": "turbo test",
    "dev": "turbo dev"
  }
}
```

Now `pnpm build` delegates to Turborepo instead of running scripts directly.

> [!NOTE]
> **You can still use pnpm filters alongside Turborepo.** Running `pnpm turbo build --filter=@pulse/analytics` builds only `@pulse/analytics` and its dependencies. Running `pnpm turbo build --filter=@pulse/analytics...` (with the `...` suffix) builds `@pulse/analytics` and everything that depends on it. These filters are how CI pipelines build only what a pull request changed.

---

## Step 4: Run Turborepo for the First Time

1. Run the build through Turborepo:

```bash
pnpm turbo build
```

Watch the output. Turborepo prints each task as it runs, showing the dependency ordering:

```
@pulse/shared:build: cache miss, executing
@pulse/ui:build: cache miss, executing
@pulse/analytics:build: cache miss, executing
@pulse/users:build: cache miss, executing
@pulse/dashboard:build: cache miss, executing
```

Every task says "cache miss" because this is the first run — there is no cache yet.

2. Run it again immediately:

```bash
pnpm turbo build
```

Now the output is different:

```
@pulse/shared:build: cache hit, replaying logs
@pulse/ui:build: cache hit, replaying logs
@pulse/analytics:build: cache hit, replaying logs
@pulse/users:build: cache hit, replaying logs
@pulse/dashboard:build: cache hit, replaying logs

 Tasks:    5 successful, 5 total
Cached:    5 cached, 5 total
  Time:    103ms >>> FULL TURBO
```

Every task shows "cache hit." The total time drops to under a second. `FULL TURBO` means every single task was served from cache.

> [!NOTE]
> **How Turborepo's cache works:** For each task, Turborepo computes a hash from: (1) the source files in the package, (2) the hashes of all dependency packages, (3) the task definition in `turbo.json`, (4) relevant environment variables, and (5) the lockfile entries for external dependencies. If the hash matches a previous run, Turborepo restores the cached `outputs` (the `dist/` directory) and replays the logged stdout/stderr instead of executing the command. The cache is local by default (stored in `node_modules/.cache/turbo`), but can be shared across CI runners with remote caching.

### Checkpoint

`pnpm turbo build` on a clean cache builds everything. The second run shows `FULL TURBO` and completes in under a second.

---

## Step 5: Observe Partial Rebuilds

Now change something and watch Turborepo rebuild only what's necessary.

1. Open `packages/ui/src/button.tsx` and make a small change — add a comment at the top of the file:

```typescript
// Updated button styling
```

2. Save the file and run the build again:

```bash
pnpm turbo build
```

Look at the output carefully:

```
@pulse/shared:build: cache hit, replaying logs
@pulse/legacy:build: cache hit, replaying logs
@pulse/ui:build: cache miss, executing
@pulse/analytics:build: cache miss, executing
@pulse/users:build: cache miss, executing
@pulse/dashboard:build: cache miss, executing
```

`@pulse/shared` and `@pulse/legacy` are cache hits — they didn't change and have no dependency on `@pulse/ui`. But `@pulse/ui` is a cache miss (you changed it), and everything that depends on `@pulse/ui` also rebuilds: `@pulse/analytics`, `@pulse/users`, and `@pulse/dashboard`.

> [!IMPORTANT]
> **Turborepo rebuilds dependents, not just the changed package.** This is because the hash includes dependency hashes. When `@pulse/ui` changes, its hash changes. `@pulse/analytics` depends on `@pulse/ui`, so its input hash includes `@pulse/ui`'s hash — which changed. The cascade continues up the graph. This is correct: a change in `@pulse/ui` could affect the build output of any package that imports it. The only safe optimization is to skip packages that provably cannot be affected — packages with no dependency path to the changed package.

3. Revert your change to `packages/ui/src/button.tsx` (remove the comment) and run `pnpm turbo build` again. It should be `FULL TURBO` — the files are back to the cached state.

### Checkpoint

After changing `packages/ui`, only `@pulse/shared` shows a cache hit. Everything downstream of `@pulse/ui` rebuilds. After reverting, the cache is restored.

---

## Step 6: Examine the Dependency Graph

Turborepo can visualize the task graph it constructs.

1. Generate the graph:

```bash
pnpm turbo build --graph=graph.html
```

This generates an HTML file with a visualization of the dependency graph. Open `graph.html` in your browser. You should see:

- `@pulse/shared` at the bottom (no dependencies)
- `@pulse/ui` one level up (depends on `@pulse/shared`)
- `@pulse/analytics` and `@pulse/users` at the next level (both depend on `@pulse/ui` and `@pulse/shared`)
- `@pulse/dashboard` at the top (depends on everything)

> [!NOTE]
> **The graph is the architecture.** This visualization is not just a debugging tool — it's a map of your system's coupling. If you see a package at the bottom of the graph with edges going to every other package, that's your most critical shared dependency. If you see two packages with no edges between them, they can build and test in parallel. The graph tells you where parallelism is possible, where bottlenecks are, and what the blast radius of a change will be.

2. Try the filter with the graph:

```bash
pnpm turbo build --filter=@pulse/analytics... --graph=graph-analytics.html
```

This generates a graph showing only the subgraph relevant to `@pulse/analytics` and its dependencies.

### Checkpoint

You can visualize the dependency graph and identify which packages are upstream and downstream of any given package.

---

## Stretch Goals

- **Filter builds:** Run `pnpm turbo build --filter=@pulse/analytics...` to build only analytics and its dependencies. Compare the task count to a full build.
- **Dry run:** Run `pnpm turbo build --dry-run=json` to see exactly what Turborepo would execute without running anything. Inspect the JSON output to understand the hash computation.
- **Environment variables:** Add an environment variable to the `build` task's `env` key in `turbo.json` and observe that changing the variable invalidates the cache.

---

## Solution

If you need to catch up, the completed state for this exercise is available on the `04-typescript-start` branch:

```bash
git checkout 04-typescript-start
pnpm install
```

---

## What's Next

You have cached, dependency-aware builds. But TypeScript still checks each package independently — there's no incremental type checking across package boundaries. Changing a type in `@pulse/shared` forces a full recheck of every package. In the next exercise, you'll add `composite: true` and project references so TypeScript can do incremental cross-package type checking.
