---
title: 'Exercise 9: Strangler Fig & Codemods'
description: >-
  Set up a routing-level strangler fig so legacy and modern apps coexist,
  migrate one route, and write a jscodeshift codemod that automates import
  transformations for the rest of the codebase.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

A legacy application has appeared in the monorepo at `apps/legacy/`. It has old-style components, flat file structure, and no package separation. You're going to set up a routing-level strangler fig so both apps coexist, migrate one route from legacy to modern, and write a jscodeshift codemod that automates the import transformations needed to move the rest of the codebase.

## Why It Matters

Nobody gets to start from scratch. In the real world, you inherit legacy code and migrate incrementally. The strangler fig pattern gives you a safe coexistence strategy: new routes go to the modern app, old routes stay in the legacy app, and you migrate one route at a time until the legacy app is empty. Codemods automate the mechanical parts of migration — renaming imports, updating API calls, transforming patterns — so developers spend their time on decisions, not find-and-replace. The combination of strangler fig + codemods is how large teams migrate without freezing feature development.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 8 left off. If you need to catch up:

```bash
git checkout 08-migration-start
pnpm install
```

---

## Step 1: Explore the Legacy Application

Start by understanding what you're migrating from.

1. Open `apps/legacy/src/legacy-app.tsx`. Note the patterns that mark this as legacy code:

```typescript
// Old-style React — no packages, no separation of concerns
import { LegacyAnalytics } from "./legacy-analytics";

export function LegacyApp() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <h1 style={{ color: "#333" }}>Pulse (Legacy)</h1>
      <nav style={{ marginBottom: "20px" }}>
        <a href="/legacy/analytics">Analytics</a>
        {" | "}
        <a href="/legacy/settings">Settings</a>
      </nav>
      <LegacyAnalytics />
    </div>
  );
}
```

> [!NOTE]
> **What makes this "legacy":** It's not about the age of the code — it's about the patterns. Inline styles instead of a design system. Local file imports instead of package imports. No TypeScript types from `@pulse/shared`. No separation between feature packages. Everything lives in a flat directory. This is the monolith before architecture.

2. Open `apps/legacy/src/legacy-analytics.tsx`. This component does what `@pulse/analytics` does, but without package separation:

```typescript
import { LegacyChart } from './legacy-chart';

export function LegacyAnalytics() {
  // ... fetches data inline, renders stats and chart
  // Uses local components instead of @pulse/ui
  // No Suspense, no streaming, no loading skeletons
}
```

3. Compare with `packages/analytics/src/analytics-dashboard.tsx`. Same product feature, completely different architecture. The modern version uses `@pulse/ui` components, `@pulse/shared` types, Suspense boundaries, and colocated data fetching. The legacy version has everything inlined.

### Checkpoint

You understand the structural differences between the legacy and modern apps. The legacy app has no package boundaries, no shared types, and no design system integration.

---

## Step 2: Set Up the Routing Strangler Fig

The strangler fig pattern works by placing a routing layer in front of both apps. New paths go to the modern app, legacy paths go to the legacy app. Over time, you move paths from legacy to modern until the legacy app has no routes left.

> [!NOTE]
> **The strangler fig pattern is named after the strangler fig tree, which grows by wrapping itself around a host tree.** In nature, a strangler fig seed germinates in the canopy of an existing tree, sends roots down to the ground, and gradually envelops the host trunk with its own root structure. Over years, the fig's roots thicken and fuse until they form a self-supporting lattice, and the original host tree — no longer needed — decays away. Martin Fowler borrowed this metaphor for software migration: instead of rewriting a legacy system from scratch (a notoriously risky approach), you build the new system around the old one, routing traffic to the new system one endpoint or feature at a time. The old system continues to serve any routes that have not been migrated yet, and it shrinks incrementally until it handles no traffic at all and can be safely removed. The pattern is valuable precisely because it eliminates the "big bang" cutover — at every point during the migration, you have a working system, and each individual migration step is small enough to review, test, and revert independently.

1. Open `apps/dashboard/vite.config.ts` and add a proxy configuration that forwards legacy routes to the legacy app's dev server:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/legacy': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
});
```

2. Add the base path to the legacy app's dev server. Open `apps/legacy/vite.config.ts` and add `base: "/legacy/"`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  base: '/legacy/', // Add this line
});
```

> [!NOTE]
> The `port: 5174` is already set in the starting configuration. The only change needed here is adding `base: "/legacy/"` so that the legacy app's assets are served under the `/legacy/` path prefix, which is required for the proxy to route them correctly.

3. Start both dev servers. Add a script to the root `package.json` or run them manually:

```bash
pnpm --filter @pulse/dashboard dev &
pnpm --filter @pulse/legacy dev &
```

4. Test the routing:
   - Open [http://localhost:5173](http://localhost:5173) — the modern dashboard loads
   - Open [http://localhost:5173/legacy/](http://localhost:5173/legacy/) — the legacy app loads, proxied through the modern app's server

> [!IMPORTANT]
> **The proxy is the strangler.** The modern app's dev server is the single entry point. It owns the routing decision: requests to `/legacy/*` are forwarded to the legacy server, everything else is handled by the modern app. To migrate a route, you stop forwarding it to legacy and add it to the modern app's router instead. The user never knows which app served the page — the URL structure stays the same. In production, this proxy would be a reverse proxy (Nginx, CloudFront, or your CDN's edge routing) rather than Vite's dev proxy.

### Checkpoint

Both apps are accessible through a single entry point at `localhost:5173`. Modern routes render from the dashboard app. Legacy routes are proxied to the legacy app on port 5174.

---

## Step 3: Migrate One Route

Take the legacy analytics view and replace it with the modern `@pulse/analytics` package.

1. The legacy analytics route is at `/legacy/analytics`. You want to move it so that `/analytics` (or `/`) serves the modern version. This is already the case — the modern dashboard's router handles `/` with the analytics route. The strangler fig means users who bookmarked `/legacy/analytics` should eventually be redirected to `/`.

2. Add a redirect in the legacy app for the migrated route. Open `apps/legacy/src/legacy-app.tsx` and replace the analytics component with a redirect notice:

```typescript
export function LegacyApp() {
  const path = window.location.pathname;

  if (path === "/legacy/analytics") {
    // This route has been migrated to the modern app
    window.location.href = "/";
    return <p>Redirecting to modern analytics...</p>;
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <h1 style={{ color: "#333" }}>Pulse (Legacy)</h1>
      <p>Settings and other legacy routes still live here.</p>
    </div>
  );
}
```

3. Verify the migration:
   - Navigate to [http://localhost:5173/legacy/analytics](http://localhost:5173/legacy/analytics) — it should redirect to `/` (the modern analytics dashboard)
   - Navigate to [http://localhost:5173/legacy/settings](http://localhost:5173/legacy/settings) — the legacy settings page still loads normally
   - Navigate to [http://localhost:5173/](http://localhost:5173/) — the modern analytics dashboard renders with all the architecture from Exercises 2-8

> [!NOTE]
> **Migration is a one-route-at-a-time process.** In a real project, you'd migrate the simplest or highest-traffic route first — to validate the pattern and build confidence. Each migration is a separate pull request: update the proxy/routing, verify the modern version works, add the redirect from legacy. The legacy app shrinks with each PR. When every route has been migrated, you delete `apps/legacy/` entirely. The key discipline is: never migrate two routes in the same PR. Each migration should be independently revertable.

### Checkpoint

The analytics route is fully migrated. Legacy analytics redirects to the modern app. Other legacy routes still work through the proxy.

---

## Step 4: Write a jscodeshift Codemod

The legacy app has import patterns that need to be transformed for the modern architecture. You're going to write a codemod that automates this.

1. Open `codemods/src/migrate-legacy-import.ts`. It contains a stub:

```typescript
import type { API, FileInfo } from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Your transform here

  return root.toSource();
}
```

2. Implement the transform. The codemod should find imports like:

```typescript
import { LegacyChart } from './legacy-chart';
```

And transform them to:

```typescript
import { Chart } from '@pulse/analytics';
```

Here's the implementation:

```typescript
import type { API, FileInfo } from 'jscodeshift';

const IMPORT_MAP: Record<string, { source: string; name: string }> = {
  LegacyChart: { source: '@pulse/analytics', name: 'Chart' },
  LegacyStatsBar: { source: '@pulse/analytics', name: 'StatsBar' },
  LegacyDataTable: { source: '@pulse/ui', name: 'DataTable' },
  LegacyButton: { source: '@pulse/ui', name: 'Button' },
};

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Find all import declarations from legacy local files
  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      const source = path.node.source.value;
      return typeof source === 'string' && source.startsWith('./legacy-');
    })
    .forEach((path) => {
      const specifiers = path.node.specifiers;
      if (!specifiers) return;

      // Group new imports by their target package
      const newImports = new Map<string, string[]>();

      specifiers.forEach((specifier) => {
        if (specifier.type !== 'ImportSpecifier') return;

        const oldName = specifier.imported.name;
        const mapping = IMPORT_MAP[oldName];

        if (mapping) {
          const existing = newImports.get(mapping.source) || [];
          existing.push(mapping.name);
          newImports.set(mapping.source, existing);
        }
      });

      // Replace the old import with new package imports
      const replacements = Array.from(newImports.entries()).map(([source, names]) =>
        j.importDeclaration(
          names.map((name) => j.importSpecifier(j.identifier(name), j.identifier(name))),
          j.literal(source),
        ),
      );

      if (replacements.length > 0) {
        j(path).replaceWith(replacements);
      }
    });

  // Replace usage of old component names with new names
  Object.entries(IMPORT_MAP).forEach(([oldName, { name: newName }]) => {
    root.find(j.JSXIdentifier, { name: oldName }).forEach((path) => {
      path.node.name = newName;
    });

    root
      .find(j.Identifier, { name: oldName })
      .filter(
        (path) =>
          path.parent.node.type !== 'ImportSpecifier' &&
          path.parent.node.type !== 'ImportDefaultSpecifier',
      )
      .forEach((path) => {
        path.node.name = newName;
      });
  });

  return root.toSource();
}
```

> [!NOTE]
> **How jscodeshift works:** jscodeshift parses JavaScript/TypeScript into an Abstract Syntax Tree (AST), lets you search and transform nodes in that tree, then prints the modified tree back to source code. Unlike regex-based find-and-replace, AST transforms understand the structure of the code — they can distinguish between a `LegacyChart` in an import statement and a `LegacyChart` in a JSX element. The `j.find()` method searches for AST nodes matching a pattern, and `j.replaceWith()` swaps them for new nodes. The transform function receives one file at a time and returns the modified source.

> [!NOTE]
> **An Abstract Syntax Tree (AST) is a tree-shaped data structure that represents the grammatical structure of source code.** When a parser reads `import { Chart } from "@pulse/analytics"`, it does not see a flat string of characters — it produces a tree where the top node is an `ImportDeclaration`, with child nodes for each imported specifier (`Chart`) and the source string (`"@pulse/analytics"`). Every construct in the language — variable declarations, function calls, JSX elements, binary expressions — becomes a node in this tree, with its sub-expressions as children. Tools like jscodeshift, ESLint, Babel, and Prettier all operate on ASTs rather than raw text because tree operations are structurally aware: you can find "all import declarations whose source starts with `./legacy-`" without worrying about whitespace, comments, or formatting variations that would trip up a regular expression. The "abstract" in AST means the tree omits syntactic details that do not affect meaning (like parentheses used only for grouping or semicolons) and focuses on the logical structure of the program.

---

## Step 5: Test the Codemod

1. Run the codemod against the legacy app's source files:

```bash
npx jscodeshift \
  --parser tsx \
  --transform codemods/src/migrate-legacy-import.ts \
  apps/legacy/src/
```

2. Check the diff to see what changed:

```bash
git diff apps/legacy/src/
```

You should see imports transformed from local legacy paths to modern package paths, and component names updated from `LegacyChart` to `Chart`, `LegacyButton` to `Button`, etc.

3. Verify the transforms are correct. Open the modified files and check:
   - Old: `import { LegacyChart } from "./legacy-chart"`
   - New: `import { Chart } from "@pulse/analytics"`
   - Old: `<LegacyChart data={data} />`
   - New: `<Chart data={data} />`

> [!IMPORTANT]
> **Always review codemod output.** Codemods are powerful but not infallible. Edge cases — aliased imports, re-exports, dynamic imports, template literal interpolation — can produce incorrect transforms. Run the codemod, review the diff, run the type checker and tests, then commit. Treat the codemod as a time-saver, not an autopilot.

4. Run the type checker on the modified files to catch any issues:

```bash
pnpm turbo typecheck
```

> [!NOTE]
> **Typecheck will fail here — and that's expected.** The codemod transforms `import { LegacyChart } from "./legacy-chart"` to `import { Chart } from "@pulse/analytics"`, but the legacy app doesn't have `@pulse/analytics` as a dependency. In a real migration, you would add the modern packages to the legacy app's `package.json` before running the type checker. For this exercise, the type error confirms the codemod is producing the correct output — just revert the files with `git checkout apps/legacy/src/` and move on to writing tests.

### Checkpoint

The codemod transforms legacy imports to modern package imports. The diff shows clean, expected changes.

---

## Step 6: Write Codemod Tests

Open `codemods/src/__tests__/migrate-legacy-import.test.ts` and add test cases:

```typescript
import { describe, it, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transform from '../migrate-legacy-import';

function applyTransform(input: string): string {
  const result = transform(
    { source: input, path: 'test.tsx' },
    { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
  );
  return result;
}

describe('migrate-legacy-import', () => {
  it('transforms a single legacy import', () => {
    const input = `import { LegacyChart } from "./legacy-chart";`;
    const output = applyTransform(input);
    expect(output).toContain(`import { Chart } from "@pulse/analytics"`);
    expect(output).not.toContain('LegacyChart');
    expect(output).not.toContain('./legacy-chart');
  });

  it('transforms multiple imports from different legacy files', () => {
    const input = [
      `import { LegacyChart } from "./legacy-chart";`,
      `import { LegacyButton } from "./legacy-button";`,
    ].join('\n');
    const output = applyTransform(input);
    expect(output).toContain(`import { Chart } from "@pulse/analytics"`);
    expect(output).toContain(`import { Button } from "@pulse/ui"`);
  });

  it('leaves non-legacy imports unchanged', () => {
    const input = `import { useState } from "react";`;
    const output = applyTransform(input);
    expect(output).toBe(input);
  });

  it('transforms JSX element names', () => {
    const input = [
      `import { LegacyChart } from "./legacy-chart";`,
      `const App = () => <LegacyChart data={data} />;`,
    ].join('\n');
    const output = applyTransform(input);
    expect(output).toContain('<Chart');
    expect(output).not.toContain('<LegacyChart');
  });
});
```

Run the tests:

```bash
pnpm --filter codemods test
```

> [!NOTE]
> **Testing codemods is testing string-to-string transforms.** You provide an input source string, run the transform, and assert properties of the output string. The test doesn't need a real file system or a running application. This makes codemod tests fast and easy to write — add a test case for every edge case you encounter. When a codemod produces incorrect output on a real file, copy that file's problematic section into a test case, fix the transform, and verify the test passes.

### Checkpoint

Codemod tests pass. Each test verifies a specific transformation scenario. Edge cases are covered.

---

## Stretch Goals

- **Handle aliased imports:** Extend the codemod to handle `import { LegacyChart as MyChart } from "./legacy-chart"` and preserve the alias: `import { Chart as MyChart } from "@pulse/analytics"`.
- **Dry-run mode:** Run the codemod with `--dry` to see which files would be modified without actually changing them. Use this in CI to verify that no unmigrated legacy imports remain.
- **Add a second codemod:** Write a codemod that transforms inline styles (`style={{ color: "#333" }}`) to Tailwind CSS classes (`className="text-gray-700"`). This is a harder transform because it requires a mapping from CSS properties to Tailwind classes.

---

## Solution

If you want to see the fully completed workshop, the solution is available:

```bash
git checkout solution
pnpm install
```

---

## What's Next

You've completed the full workshop arc. Over these exercises, you've built a monorepo architecture from the ground up: build-time composition, streaming SSR, Turborepo orchestration, TypeScript project references, architectural linting, CI/CD with performance budgets, E2E testing with Playwright, and incremental migration with the strangler fig pattern. Each exercise added a layer of infrastructure that makes the architecture more maintainable, more enforceable, and more scalable. The next step is to apply these patterns to your own codebase — start with the layer that would have the highest impact and work outward from there.
