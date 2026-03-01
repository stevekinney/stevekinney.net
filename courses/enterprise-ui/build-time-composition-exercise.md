---
title: 'Exercise 2: Build-Time Composition'
description: >-
  Take the same analytics module from Exercise 1 and consume it as a regular
  workspace package in a monorepo — no remote entry, no shared dependency
  negotiation, just an npm import.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

You've seen Module Federation's runtime composition in Exercise 1 — two dev servers, remote entry manifests, shared dependency negotiation, cross-boundary state management. Now take the same analytics module and consume it as a regular workspace package. No remote entry, no shared dependency negotiation — just an npm import in a monorepo.

## Why It Matters

Build-time composition is the default choice for teams that don't need independent deployments. You get compile-time type checking across package boundaries, instant hot reload, and zero runtime overhead. Most teams should start here and only move to runtime composition when they have a concrete operational reason (like independent deploy cadences across teams).

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
pnpm dev
```

> [!NOTE]
> This exercise starts from the `main` branch. If you're beginning the workshop fresh, you're already in the right place. If you need to reset, run `git checkout main`.

Open [http://localhost:5173](http://localhost:5173).

---

## Step 1: Explore the Workspace Structure

Start by understanding how the monorepo is organized.

### What to Look At

1. Open `pnpm-workspace.yaml` — it declares four workspace groups:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'mocks'
  - 'codemods'
```

2. Open `packages/analytics/package.json` — find the entry point:

```json
"main": "./src/index.ts",
"types": "./src/index.ts"
```

> [!NOTE]
> **Source imports, not built artifacts.** The `main` field points directly at TypeScript source. Vite resolves workspace packages via pnpm's symlinks and processes them with its own TypeScript transform — no separate build step needed. This is the standard monorepo DX pattern: packages are consumed as source during development. You only need `dist/` output for publishing to a registry or for production builds.

3. Open `packages/analytics/src/index.ts` — note the explicit public API:

```typescript
export { AnalyticsDashboard } from './analytics-dashboard';
```

Only `AnalyticsDashboard` is exported. Internal components like `StatsBar`, `Chart`, and `BigTable` are not part of the public API.

4. Open `apps/dashboard/src/routes/analytics.tsx` — the route imports from the package:

```typescript
import { AnalyticsDashboard } from '@pulse/analytics';
```

This is a regular import — resolved at build time through the workspace, not fetched at runtime from a remote server.

### Checkpoint

You should see the dashboard running at `http://localhost:5173` with:

- A sidebar showing **"Pulse"** as the app name and **"Grace Hopper"** with **"admin"** below it
- The analytics view with stat cards (12,847 / 3,291 / $284,100 / 3.2%)
- A bar chart with time range toggles (7d / 30d / 90d)
- A "Recent Activity" table below the chart
- A green **"Viewing as: Grace Hopper"** badge in the header

---

## Step 2: Compare with Runtime Composition

Think about the differences between this setup and the federation approach from Exercise 1:

| Concern                       | Runtime (Federation)            | Build-Time (Workspace)   |
| ----------------------------- | ------------------------------- | ------------------------ |
| Dev servers                   | 2 (host + remote)               | 1                        |
| Type checking                 | Separate per remote             | Across all packages      |
| Hot reload                    | Within boundary only            | Across boundaries        |
| Deploy independence           | Yes                             | No (monolith deploy)     |
| Shared dependency negotiation | Runtime (`singleton`, `eager`)  | None needed              |
| Cross-boundary state          | Nanostores (framework-agnostic) | React Context (standard) |
| Entry point complexity        | Async bootstrap + manifest      | Regular `import`         |

> [!NOTE]
> **The `workspace:*` protocol is pnpm's way of declaring local dependencies.** When you see `"@pulse/analytics": "workspace:*"` in a `package.json`, it tells pnpm to resolve that dependency to the matching package inside the monorepo workspace rather than fetching it from the npm registry. The `*` means "accept whatever version the local package declares." pnpm creates a symlink from `node_modules/@pulse/analytics` to the actual `packages/analytics/` directory, which is why Vite can resolve imports to TypeScript source files without a build step. When you publish packages to a registry, pnpm automatically replaces `workspace:*` with the real version number at publish time — so this protocol is purely a development-time convenience that disappears in production artifacts.

### What to Try

1. Open `apps/dashboard/src/shell/auth-provider.tsx` — the auth provider uses standard React Context. Compare this to Exercise 1 where you needed nanostores to cross the federation boundary.

2. Open `packages/analytics/src/analytics-dashboard.tsx` — it imports `useAuth` from `@pulse/shared` directly. No nanostores, no store subscription — just `useContext` under the hood.

> [!NOTE]
> **Why React Context works here:** In build-time composition, all packages are bundled into a single React application. There is exactly one React instance, one component tree, and one context registry. When the `AuthProvider` in `apps/dashboard` provides a value, the `useAuth()` hook in `packages/analytics` reads from the same context — because they share the same module instance of `@pulse/shared`. This is the fundamental difference from federation, where separate builds create separate module instances.

---

## Step 3: Test Cross-Package Hot Reload

One of the biggest DX wins of build-time composition is seamless hot reload across package boundaries.

1. Open `packages/analytics/src/chart.tsx`
2. Change the bar fill class from `fill-gray-800` to `fill-blue-600`
3. Save the file — the browser updates instantly without a full page reload

In the federation setup, changes to the remote required rebuilding the remote and refreshing the host. Here, Vite watches all workspace packages and processes changes through its own transform pipeline.

4. Revert the change back to `fill-gray-800`

> [!NOTE]
> **Hot Module Replacement (HMR) swaps changed modules in the running application without a full page reload.** When you save a file, Vite detects the change, recompiles only that module, and sends the update to the browser over a WebSocket connection. The browser replaces the old module in memory and re-renders the affected components while preserving application state — form inputs, scroll position, React component state, and navigation all survive the update. This is fundamentally different from a full page reload, which tears down the entire application, re-fetches all resources, re-parses all JavaScript, and restarts from the initial state. In a monorepo with build-time composition, HMR works across package boundaries because Vite treats all workspace packages as part of a single module graph — a change in `packages/analytics/src/chart.tsx` triggers an HMR update in `apps/dashboard` without any rebuild step.

### Checkpoint

Changes to any file in `packages/analytics/` are reflected in the browser instantly via hot module replacement. No rebuild, no refresh.

---

## Step 4: Examine the Public API Boundary

The analytics package only exports `AnalyticsDashboard` from its `index.ts`. But nothing currently prevents other packages from reaching into its internals.

1. Open `apps/dashboard/src/routes/analytics.tsx`
2. Try adding a direct import of an internal component:

```typescript
import { StatsBar } from '@pulse/analytics/src/stats-bar';
```

3. TypeScript resolves this just fine — the import works. But it bypasses the package's public API. This is a common source of coupling in monorepos.

> [!IMPORTANT]
> **This import should not be allowed.** In Exercise 6, you'll configure `eslint-plugin-boundaries` to flag this as a lint error. For now, just note that the architectural boundary exists in convention (only `index.ts` exports are public) but is not enforced by tooling.

4. Remove the import you just added

### Checkpoint

You've confirmed that internal imports work but shouldn't — the public API is defined by `index.ts` exports, but nothing enforces it yet.

---

## Step 5: Navigate the Application

The dashboard has routing — unlike the federation setup which only had a single analytics view.

1. Click **"Settings"** in the sidebar navigation
2. The settings page loads showing org information (Pulse Inc., pro plan)
3. Click **"Analytics"** to go back — the analytics data is still loaded

> [!NOTE]
> The routes are lazy-loaded using `React.lazy()` and `Suspense`. When you navigate to Settings for the first time, React dynamically imports the route module. The `LoadingSkeleton` component shows during the import. On subsequent navigations, the module is cached.

### Checkpoint

Navigation between Analytics and Settings works. The sidebar highlights the active route. Both pages load data from MSW mock handlers.

---

## Stretch Goals

- **Add a new component to `packages/analytics`:** Create a `summary-header.tsx` component, export it from `index.ts`, and use it in the dashboard. See how TypeScript integration works across the boundary.
- **Explore the mock API:** Open `mocks/src/handlers.ts` and change the delay on `/api/analytics/summary` from `200` to `3000`. Observe how the loading state behaves when the API is slow.
- **Trace the dependency graph:** Starting from `apps/dashboard/package.json`, trace which packages depend on which. Draw the graph. This is the graph that Turborepo will optimize in Exercise 4.

---

## Solution

If you need to catch up, the completed state for this exercise is available on the `02-streaming-start` branch:

```bash
git checkout 02-streaming-start
pnpm install
```

---

## What's Next

You've experienced build-time composition: one dev server, compile-time types across boundaries, instant hot reload. The analytics dashboard fetches three APIs at different speeds, but right now they all resolve together as a single loading state. In the next exercise, you'll add streaming SSR and Suspense boundaries to progressively render each section as its data arrives.
