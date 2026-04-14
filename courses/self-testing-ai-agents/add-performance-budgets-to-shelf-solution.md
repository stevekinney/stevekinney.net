---
title: 'Add Performance Budgets to Shelf: Solution'
description: Walkthrough of the performance budget files you add in the lab and the commands you need to run to verify them.
modified: 2026-04-14
date: 2026-04-10
---

Performance budgets are one of those things that sound bureaucratic until the first time they save you. You ship a refactor, the bundle doubles, nobody notices for two weeks, and now it's "just how big the app is." The point of this lab is to make that scenario impossible by turning size and speed into numbers that a script can enforce.

The Shelf starter doesn't ship this loop. Add the pieces below during the lab, then run the loop to prove it works. Start by installing the stats-build dependency:

```sh
npm install -D rollup-plugin-visualizer
```

## What to add

### `performance-budgets.json`

```json
{
  "build": {
    "maxTotalGzipKilobytes": 110,
    "maxLargestChunkGzipKilobytes": 55
  },
  "runtime": {
    "shelfRouteDomContentLoadedMilliseconds": 800
  }
}
```

This is the single source of truth for every threshold. Both the build script and the Playwright test read from this file. That's deliberate -- if you want to tighten or loosen a budget, you change one number in one place. The build thresholds are in gzipped kilobytes because that's what actually travels over the wire. The runtime threshold is a `domContentLoaded` ceiling in milliseconds for the `/shelf` route.

### `scripts/check-performance-budgets.mjs`

This is the build-time half of the budget loop. It reads `build/stats.json` (emitted by `vite build` when you set `BUNDLE_STATS=1`) and `performance-budgets.json`, then walks the stats structure to compute client bundle sizes.

The interesting part is how it gets from the stats file to actual gzip numbers. Vite's stats JSON organizes data across three related maps:

```js
const computeClientBundleSizes = (stats) => {
  const parts = stats.nodeParts ?? {};
  const metas = stats.nodeMetas ?? {};
  const bundleGzipByFile = new Map();

  for (const meta of Object.values(metas)) {
    for (const [bundleFile, uid] of Object.entries(meta.moduleParts ?? {})) {
      const part = parts[uid];
      if (!part) continue;
      const previous = bundleGzipByFile.get(bundleFile) ?? 0;
      bundleGzipByFile.set(bundleFile, previous + (part.gzipLength ?? 0));
    }
  }

  const clientEntries = Array.from(bundleGzipByFile.entries()).filter(([bundleFile]) =>
    bundleFile.startsWith(CLIENT_BUNDLE_PREFIX),
  );
  const totalClientGzipBytes = clientEntries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const largestClientChunkBytes = clientEntries.reduce((max, [, bytes]) => Math.max(max, bytes), 0);

  return { totalClientGzipBytes, largestClientChunkBytes, clientEntries };
};
```

`nodeMetas` maps each source module to its `moduleParts` -- a dictionary from output bundle filename to a unique ID. That ID indexes into `nodeParts`, where the actual `gzipLength` lives. The script accumulates gzip bytes per bundle file, then filters to only the client-side chunks (anything under `_app/immutable`). Server bundles don't matter for user-facing performance, so we skip them.

After computing totals, the script compares against the budget file and exits non-zero if anything is over:

```js
const failures = [];
if (typeof totalBudget === 'number' && totalGzipKilobytes > totalBudget) {
  failures.push(
    `Total client bundle size ${formatKilobytes(totalClientGzipBytes)} kB gzip exceeds budget of ${totalBudget} kB`,
  );
}
```

Exit code 1 means a budget was exceeded. Exit code 2 means the script itself errored (missing file, bad JSON). This distinction matters when you wire it into CI -- a budget failure is a policy decision, not a crash.

### `tests/performance.spec.ts`

The runtime half. This test loads budgets from the same JSON file, navigates to `/shelf`, and reads the actual browser timing:

```ts
const navigationTiming = await page.evaluate(() => {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!entry) return { domContentLoaded: 0 };
  return {
    domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
  };
});

expect(navigationTiming.domContentLoaded).toBeLessThan(budgetMilliseconds);
```

`page.evaluate` runs inside the actual Chromium instance, so you're reading real `PerformanceNavigationTiming` data -- not a mock, not a proxy. The `domContentLoadedEventEnd - startTime` delta gives you the time from navigation start to the point where the HTML is fully parsed and all synchronous scripts have executed. It doesn't wait for images or lazy-loaded modules, which is exactly what you want for a "is this page interactive?" gate.

The budget value comes from the same `performance-budgets.json`, so there's no magic number hiding in the test file. If your current Shelf copy has already added the authenticated Playwright project from the storage-state lesson, run this spec there. If not, point the first version of the check at a public route and tighten it once the auth loop exists.

## What you still need to run

### The build budget loop

```sh
npm run performance:build
```

This runs `npm run build:stats` (which sets `BUNDLE_STATS=1` and runs `vite build` to emit `build/stats.json`) followed by the budget-check script. You should see output like:

```
Performance budget check OK: total 78.3 kB / 110 kB, largest chunk 42.1 kB / 55 kB
```

The exact numbers will vary with your build, but they should be under the thresholds.

### The runtime budget

```sh
npm run performance:runtime
```

This runs the Playwright performance spec against the preview server. If you already built the authenticated project in the earlier auth lab, this command should target that project. If you have not, the first version of the runtime check can point at a public route instead. Either way, the test reads `domContentLoaded` from the browser and compares it against the threshold in `performance-budgets.json`.

### The full loop

```sh
npm run performance:check
```

This chains both: build budgets first, then runtime. If either fails, the command exits non-zero. This is the one you'd wire into CI.

### The deliberate-failure experiment

This is the part that proves the budgets aren't just decorative. Open `performance-budgets.json` and drop a threshold below what your build actually produces:

```json
{
  "build": {
    "maxTotalGzipKilobytes": 5,
    "maxLargestChunkGzipKilobytes": 55
  }
}
```

Now run:

```sh
npm run performance:build
```

You should see:

```
Performance budget check FAILED:
  - Total client bundle size 78.3 kB gzip exceeds budget of 5 kB
```

Exit code 1. The script caught it. Revert the change when you're done -- the point was to see the failure mode, not to live with an impossible budget.

## Patterns to take away

- **One file, one truth.** Both the build script and the Playwright test read from `performance-budgets.json`. When you tighten a budget, you edit one number. When an agent reads the budget, it finds one file.
- **Build time and runtime are different questions.** Bundle size is a build-time property. Page load speed is a runtime property. Measuring both gives you coverage across the two most common ways performance regresses.
- **Exit codes are an API.** The script distinguishes "budget exceeded" (exit 1) from "script crashed" (exit 2). CI pipelines and agents can act on that distinction.
- **Real browser timing, not estimates.** The Playwright test uses `PerformanceNavigationTiming` from an actual Chromium instance. Synthetic benchmarks are better than no benchmarks, but real browser APIs are better than synthetic benchmarks.
- **Named commands compose.** `performance:build`, `performance:runtime`, and `performance:check` are separately runnable. An agent can call the one it needs without running the full loop every time.

## Additional Reading

- [Lab: Add Performance Budgets to Shelf](lab-add-performance-budgets-to-shelf.md)
- [Performance Budgets as a Feedback Loop](performance-budgets-as-a-feedback-loop.md)
