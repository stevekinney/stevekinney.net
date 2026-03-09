---
title: 'build-temporal-workflow: Faster Temporal Workflow Bundling with esbuild'
description: >-
  A drop-in replacement for @temporalio/worker's bundleWorkflowCode that swaps
  Webpack for esbuild—delivering 9–11x faster builds and 94% less memory usage.
date: 2026-03-09T12:00:00.000Z
modified: 2026-03-09T12:00:00.000Z
published: true
tags:
  - temporal
  - typescript
  - tooling
---

If you've built a [Temporal](https://temporal.io) worker in TypeScript, you've had some passing exposure to `bundleWorkflowCode` doing its thing. A while back, I wrote about [best practices for Temporal workflows](./cursor-rules-temporal-typescript.md). One thing I didn't get into was the build tooling, because at the time I was just living with it. But after enough accumulated waiting, I finally sat down and asked: what is Webpack actually _doing_ here? The fact that it includes Webpack as a dependency at all led me to believe that I could probably build a faster version. So, with that, let's take a look at what `bundleWorkflowCode` actually does and then how we can make a better, more performant version.

## What `bundleWorkflowCode` actually does

Temporal's workflow sandbox runs your code inside a V8 isolate. The isolate can't resolve modules at runtime—it needs everything in a single file, up front. So `bundleWorkflowCode` does two things: it resolves your workflow code's dependency graph, and it concatenates everything into a single CommonJS file that can run inside that sandbox.

That's the whole job. There's no code splitting, because the isolate loads one file. There's no asset pipeline, because workflows don't have CSS or images. There's no HMR, because the sandbox doesn't support hot module replacement. And there's no minification—in fact, you _must not_ minify, because Temporal uses `keepNames` to preserve function names for workflow type inference and determinism.

The enforced constraints look like this:

- `bundle: true` — required for workflow isolation
- `format: 'cjs'` — Temporal's sandbox requires CommonJS
- `minify: false` — preserves workflow function names
- `splitting: false` — not supported in the workflow sandbox
- `keepNames: true` — required for workflow type inference

That's a bundler running with most of its features turned off.

## Why Webpack is the wrong tool for this

Webpack is a capable tool. I've used it for years and it handles complex web application builds well. But its generality is a liability here.

When you call `bundleWorkflowCode` with the stock Temporal SDK, here's what actually happens under the hood. Webpack parses its own configuration schema. It initializes its plugin system—the full `tapable` event pipeline with its hooks for compilation, module factories, resolvers, and optimizers. It builds a module graph through its own resolution algorithm, which is separate from Node's. It runs multiple optimization passes, including scope hoisting analysis, chunk graph construction, and code generation—all for a bundle that deliberately opts out of every optimization Webpack offers.

The overhead isn't a bug. It's a consequence of architecture. Webpack was designed to handle arbitrary loader pipelines, code splitting strategies, and plugin compositions. When you hand it a job that needs none of those things, it still initializes all that machinery. The startup cost alone—parsing config, instantiating the compiler, setting up the plugin system—accounts for a meaningful chunk of the total build time.

This matters in three places:

- **Test suites:** If your tests create Workers (and they should—integration tests catch real bugs), each test pays the bundling cost. A suite with 20 Worker-creating tests accumulates seconds of pure bundling overhead.
- **Development iteration:** Every code change triggers a rebuild. Webpack's watch mode works, but it carries the same per-build overhead because it still runs through its full compilation pipeline on each change.
- **CI pipelines:** Faster bundling means faster deployments, but the memory savings might matter even more. When you're running multiple jobs on shared runners, 54 MB of heap per bundle adds up.

## How `build-temporal-workflow` works

I published [`build-temporal-workflow`](https://www.npmjs.com/package/build-temporal-workflow) to npm. It replaces Webpack with [esbuild](https://esbuild.github.io/) (or `Bun.build`, if you're running under Bun) and produces output that is structurally identical to what Webpack generates.

The swap is one import line:

```ts
// Before
import { bundleWorkflowCode } from '@temporalio/worker';

// After
import { bundleWorkflowCode } from 'build-temporal-workflow';
```

Everything else stays the same. Your `Worker.create` call, your options object, your task queue setup—none of it changes.

```ts
import { Worker } from '@temporalio/worker';
import { bundleWorkflowCode } from 'build-temporal-workflow';

const bundle = await bundleWorkflowCode({
  workflowsPath: require.resolve('./workflows'),
});

const worker = await Worker.create({
  workflowBundle: bundle,
  taskQueue: 'my-task-queue',
});
```

But what's happening behind that `bundleWorkflowCode` call is substantially different.

### Synthetic entrypoint generation

The bundler generates a synthetic entrypoint module that wires up Temporal's sandbox requirements. This module does three things: it requires `@temporalio/workflow/lib/worker-interface.js` to install the sandbox globals, it calls `overrideGlobals()` to replace non-deterministic APIs like `Date.now()` and `Math.random()` with Temporal's deterministic versions, and it exports `importWorkflows()` and `importInterceptors()` functions that the Worker uses to load your code.

The entrypoint is content-hashed for cache invalidation—if the generated content hasn't changed, the bundler knows it can skip the rebuild entirely.

### Forbidden module detection

Temporal's sandbox doesn't have access to Node.js APIs. If your workflow code—or any of its transitive dependencies—imports `fs`, `http`, `net`, or any other Node builtin, the bundle will fail at runtime inside the isolate. The original `bundleWorkflowCode` catches this, but it only tells you _which_ module is forbidden. It doesn't tell you _how_ it got there.

This library's esbuild plugin uses a multi-phase resolution strategy to handle this with more precision. It pre-computes a regex at module load time matching all Node.js builtins—both bare names (`fs`) and prefixed forms (`node:fs`) with subpaths. When a forbidden import is encountered, the plugin records the full dependency chain: which file imported which file imported which file that finally tried to pull in `fs`.

The plugin is also smart enough to detect type-only imports. If your code does `import type { Stats } from 'fs'`, that's fine—it's erased at compile time and never makes it into the bundle. The plugin uses pattern matching to detect `import type { ... }`, `import type * as Name`, and inline `import { type Foo }` syntax, caching the results so it doesn't re-parse files on subsequent builds.

For modules that _are_ forbidden, the plugin generates Proxy-based stubs that throw descriptive errors at runtime rather than failing silently. For ignored modules (things you've explicitly told the bundler to exclude), the stubs explain that the module was ignored but attempted to execute.

### The determinism policy

The bundler loads its determinism policy from the installed `@temporalio/worker` package when available, falling back to bundled defaults for SDK 1.14.x compatibility. This means it stays in sync with whatever version of the Temporal SDK you're using. The policy defines which modules are allowed in the sandbox (`assert`, `url`, `util` get through as stubs that the Temporal runtime provides), and which are forbidden (everything else).

Policy lookups use set-based matching with module normalization—stripping `node:` prefixes, handling subpath matching so that `fs` catches `fs/promises`, and caching results in a WeakMap for performance.

## Why esbuild is fundamentally better here

esbuild was designed from the ground up for speed. It's written in Go, uses a single-pass architecture, and has zero configuration overhead. Where Webpack initializes a plugin system, parses a config schema, builds a module graph through its own resolver, and runs multiple optimization passes, esbuild does the resolution and code generation in one shot.

But the deeper point isn't just "Go is faster than JavaScript." It's that esbuild's architecture is a better _match_ for what this job requires.

Webpack's multi-pass design exists because web application bundling _needs_ multiple passes. You need a module graph to compute code splitting. You need an optimization pass to do scope hoisting. You need a code generation pass to emit chunks. These passes justify their cost when they're doing useful work.

For Temporal workflow bundling, none of that work is useful. There's one entrypoint, one output file, no splitting, no minification, and no optimization. esbuild's single-pass architecture means it does exactly the work that's needed—resolve the dependency graph, concatenate into CJS, write the output—and nothing else. The overhead that Webpack pays for its generality is pure waste in this context.

The memory story is similar. Webpack's module graph, chunk graph, and multi-pass state all live in memory simultaneously. esbuild's streaming architecture processes modules without holding the full intermediate representation in memory at once. For a constrained CI environment running on a shared runner, the difference between 54 MB and 3.5 MB of peak heap isn't academic.

## The numbers

Measured on an Apple M1 Max, Node v24.3.0, Bun 1.3.2. All times are mean with 95% confidence intervals across 10 runs, 3 warmup runs, outlier filtering via IQR method, and significance testing with Welch's t-test.

Build time across fixture sizes:

| Fixture              | `@temporalio/worker` |       esbuild (Node) |      Bun.build (Bun) |
| -------------------- | -------------------: | -------------------: | -------------------: |
| Small (~5 modules)   |         543ms ± 41ms |  59ms ± 7ms (**9x**) | 29ms ± 5ms (**19x**) |
| Medium (~20 modules) |         499ms ± 12ms | 49ms ± 8ms (**10x**) | 25ms ± 5ms (**20x**) |
| Large (~50+ modules) |         537ms ± 31ms |  57ms ± 8ms (**9x**) | 30ms ± 4ms (**18x**) |
| Heavy dependencies   |        630ms ± 105ms | 55ms ± 5ms (**11x**) | 32ms ± 2ms (**20x**) |

Peak heap memory:

| Fixture              | `@temporalio/worker` | esbuild (Node) |      Savings |
| -------------------- | -------------------: | -------------: | -----------: |
| Small (~5 modules)   |             52.25 MB |        3.03 MB | **94% less** |
| Medium (~20 modules) |             51.71 MB |        3.08 MB | **94% less** |
| Large (~50+ modules) |             54.02 MB |        3.49 MB | **94% less** |
| Heavy dependencies   |             52.04 MB |        2.82 MB | **95% less** |

One thing worth noting: Webpack's build time barely changes between the small and large fixtures. It's spending most of its time on initialization and compilation pipeline overhead, not on processing modules. esbuild's time _also_ barely changes, but it starts from a much lower baseline because it doesn't have that overhead to begin with.

## Beyond the speed

If all this did was make esbuild do the same job faster, it would still be worth using. But I kept running into adjacent problems that were worth solving while I was in there.

### Better error messages

When a forbidden module sneaks into your workflow bundle—say, someone imported a utility that transitively pulls in `fs`—the stock error message just tells you `fs` is forbidden. This library shows the full dependency chain:

```
Error: Forbidden module 'fs' found in workflow bundle

Dependency chain:
  workflows.ts
    → utils/file-helper.ts
      → node_modules/some-lib/index.js
        → fs (forbidden)

Hint: Move file operations to Activities, which run outside the workflow sandbox.
```

That dependency chain has saved me more debugging time than the speed improvement, honestly. Instead of grepping through your dependency tree to figure out _which_ library pulled in a Node builtin, you can see the path immediately.

### Watch mode

Automatically rebuild when source files change, either from the CLI or programmatically:

```ts
import { watchWorkflowCode } from 'build-temporal-workflow';

const handle = await watchWorkflowCode({ workflowsPath: './src/workflows' }, (bundle, error) => {
  if (error) console.error('Build failed:', error);
  else console.log('Rebuilt!', bundle.code.length, 'bytes');
});
```

esbuild's incremental rebuild means that subsequent builds after a file change are nearly instant—it only reprocesses the modules that actually changed, rather than running the full compilation pipeline again. The watch coordinator supports multiple queues simultaneously with debouncing, so if you're running several task queues you can watch all of them with a single coordinated process.

### Bundle caching

Cache bundles in memory so your test suite pays the build cost once:

```ts
import { getCachedBundle } from 'build-temporal-workflow';

// First call builds the bundle (~50ms)
const bundle = await getCachedBundle({
  workflowsPath: require.resolve('./workflows'),
});

// Subsequent calls return the cached bundle (~0ms)
const same = await getCachedBundle({
  workflowsPath: require.resolve('./workflows'),
});
```

The in-memory cache invalidates automatically when workflow files change. There's also a persistent disk cache that stores bundles in `node_modules/.cache/temporal-bundler` using content-hashed keys—not just the entrypoint path, but a deep hash of all source files in the dependency tree. It handles TTL-based and size-based eviction so it doesn't grow unbounded.

For a test suite with 20 Worker-creating tests, the combination of esbuild's speed and the in-memory cache means the total bundling cost drops from ~10 seconds (20 × 500ms with Webpack) to ~50ms (one build, then cached). That's a _200x_ improvement in aggregate bundling time.

### Replay safety analysis

Temporal workflows must be deterministic—they can be replayed from history at any time, and the replay must produce the same result as the original execution. This means your workflow code can't use `Date.now()`, `Math.random()`, `setTimeout`, `fetch`, or any other API whose output depends on when or where it runs.

The `analyzeReplaySafety` function scans your workflow code for these patterns before you deploy:

```ts
import { analyzeReplaySafety } from 'build-temporal-workflow';

const result = await analyzeReplaySafety({
  workflowsPath: './src/workflows',
});

for (const violation of result.violations) {
  console.warn(`${violation.file}:${violation.line} - ${violation.pattern}`);
  console.warn(`  Fix: ${violation.suggestion}`);
}
```

Each violation includes the pattern it matched, why it breaks determinism, and the Temporal-safe alternative—`workflow.currentTime()` instead of `Date.now()`, `workflow.random()` instead of `Math.random()`, `workflow.sleep()` instead of `setTimeout`, and so on. You can add custom patterns if you have your own rules.

### Multi-queue bundling

If you run multiple task queues, you probably have separate workflow files for each one. Rather than bundling them independently, you can coordinate:

```ts
import { bundleMultipleWorkflows } from 'build-temporal-workflow';

const bundles = await bundleMultipleWorkflows({
  queues: [
    { name: 'orders', workflowsPath: './src/workflows/orders' },
    { name: 'notifications', workflowsPath: './src/workflows/notifications' },
    { name: 'analytics', workflowsPath: './src/workflows/analytics' },
  ],
});
```

This shares the esbuild context across builds, so shared dependencies are only resolved once. The coordinated watch mode rebuilds only the queues affected by a given file change.

### Build tool integrations

If you're using Vite or Bun as your application bundler, there are plugins that let you import workflow bundles directly:

```ts
// vite.config.ts
import { temporalWorkflow } from 'build-temporal-workflow/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [temporalWorkflow()],
});
```

Then in your application code:

```ts
import bundle from './workflows?workflow';

const worker = await Worker.create({
  workflowBundle: bundle,
  taskQueue: 'my-queue',
});
```

The Vite plugin caches bundles during dev and invalidates them when source files change. Import attributes work too: `import bundle from './workflows' with { type: 'workflow' }`.

### CLI

There's a CLI for building, analyzing, and validating bundles without writing code:

```bash
# Bundle workflows
bundle-temporal-workflow build ./src/workflows.ts -o ./dist/bundle.js

# Watch mode
bundle-temporal-workflow build ./src/workflows.ts -o ./dist/bundle.js --watch

# Analyze bundle composition and dependencies
bundle-temporal-workflow analyze ./src/workflows.ts

# Check against a size budget
bundle-temporal-workflow check ./src/workflows.ts --budget 500KB --strict

# Verify reproducible builds
bundle-temporal-workflow verify ./src/workflows.ts

# Check environment and SDK compatibility
bundle-temporal-workflow doctor
```

The `doctor` command is useful for debugging setup issues—it validates your environment, checks SDK version compatibility, and reports any misconfigurations.

## Getting it

```bash
npm install build-temporal-workflow
```

The source is on [GitHub](https://github.com/stevekinney/build-temporal-workflow). It's at `0.4.0` right now—the API is stable and I've been using it in production, but I want to get a few more people running it before I call it 1.0. If you try it out and hit any rough edges, I'd love to hear about it.
