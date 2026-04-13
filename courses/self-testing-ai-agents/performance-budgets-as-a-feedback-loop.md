---
title: Performance Budgets as a Feedback Loop
description: Functional and visually correct is not enough if the change made the app slower or heavier. Budgets turn that into a real gate.
modified: 2026-04-12
date: 2026-04-06
---

There is a class of bug agents are weirdly good at introducing: the feature works, the tests pass, the screenshot matches, and the page is now noticeably slower.

Nobody writes that bug on purpose. It still ships all the time.

So, this lesson is about adding one more loop: a cheap, boring, enforceable performance budget. Not a heroic one. Not a "let's do a full observability program before lunch" one. Just enough of a gate that an agent cannot quietly double your route weight or turn a fast interaction into a sticky one.

> [!NOTE] Prerequisite
> This lesson assumes you've already wired visual regression. Screenshot diffs tell you _what changed visually_. Performance budgets tell you whether the same change also made the application heavier or slower.

## Why performance needs its own loop

Most of the loops we've built so far answer correctness questions.

- Does the UI behave?
- Does it still look right?
- Does the code follow the rules?
- Did a second reviewer spot anything odd?

Performance is different because the failure mode is usually not binary. The page still renders. The form still submits. The bug is that it now takes 900 milliseconds longer, or the route chunk grew by 140 kilobytes, or the loading state sits on-screen just long enough to feel sticky.

That kind of regression slips past every other loop unless you decide, ahead of time, that certain numbers are not allowed to drift quietly.

That's what a budget is: a limit with consequences.

## The two-budget model

I do not want a giant performance program in a one-day workshop. I want two numbers the agent can actually enforce.

The model:

- **Build-time budget**: how big did the shipped client bundle get?
- **Runtime budget**: how long did one critical route or interaction take in a reproducible environment?

That is enough to catch most accidental regressions.

In Shelf, the concrete files are `tests/end-to-end/performance.spec.ts` for the runtime side and the `npm run performance:*` script family for the build side, with `npm run performance:build` as the narrow "just gather the numbers" entry point. The whole point is that the budget lives behind named commands the agent can run, not behind a blog post about performance culture.

## Build-time budgets: catch weight gain early

Shelf exposes `npm run build:stats`, which flips a `BUNDLE_STATS=1` environment variable and tells the Vite config to pipe [`rollup-plugin-visualizer`](https://github.com/btd/rollup-plugin-visualizer) into the output—producing both a `build/stats.html` treemap for humans and a `build/stats.json` raw data file for automation. You can follow the same shape with any bundler; the point is not the plugin.

The wiring inside `vite.config.ts` is small. You import `visualizer` from `rollup-plugin-visualizer`, conditionally include two instances in the Vite plugin list (one HTML, one JSON), and gate the whole block on the `BUNDLE_STATS` flag so a normal `npm run build` stays fast and silent:

```ts
// vite.config.ts (trimmed)
import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

const shouldEmitBundleStats = process.env.BUNDLE_STATS === '1';

export default defineConfig({
  plugins: [
    sveltekit(),
    ...(shouldEmitBundleStats
      ? [
          visualizer({
            filename: path.resolve('build/stats.html'),
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            emitFile: false,
          }),
          visualizer({
            filename: path.resolve('build/stats.json'),
            template: 'raw-data',
            gzipSize: true,
            brotliSize: true,
            emitFile: false,
          }),
        ]
      : []),
  ],
});
```

Two notes about that block:

- **`template: 'treemap'`** produces the HTML treemap a human can scroll through. **`template: 'raw-data'`** produces the JSON your check script will parse. You want both — humans use one, the loop uses the other.
- **`emitFile: false`** writes the report to disk via `filename` instead of pushing it through the Rollup output graph. This keeps the report files out of the published bundle.

Shelf ships exactly this pattern in `vite.config.ts`. The point is that a green build produces machine-readable numbers you can compare against a threshold in version control.

What I want from the build-side loop:

- total client bundle size
- biggest route or entry chunk
- stable output file the agent can parse

If those numbers jump, the loop goes red before the regression has a chance to become "well, it still technically works."

### What `build/stats.json` actually looks like

Before you can parse it, you have to know what it contains. `rollup-plugin-visualizer` with `template: 'raw-data'` emits a file that looks roughly like this (trimmed for readability):

```jsonc
{
  "version": 2,
  "tree": {
    "name": "root",
    "children": [
      /* the whole module tree */
    ],
  },
  "nodeMetas": {
    "abc-1": {
      "id": "/src/routes/(app)/shelf/+page.svelte",
      "moduleParts": {
        "_app/immutable/nodes/4.CdrmuZQ8.js": "abc-1-part",
      },
    },
  },
  "nodeParts": {
    "abc-1-part": {
      "renderedLength": 1820,
      "gzipLength": 640,
      "brotliLength": 560,
    },
  },
}
```

Two keys carry the signal we want:

- **`nodeMetas`** — one entry per source file in the graph. Each meta has a `moduleParts` map whose keys are the _output_ bundle files (like `_app/immutable/chunks/BiOosUrW.js`) and whose values are uids into `nodeParts`.
- **`nodeParts`** — size information per piece of emitted code: `renderedLength` (raw bytes), `gzipLength`, `brotliLength`.

Summing the gzip bytes for every `nodePart` that belongs to a given output file gives you that file's compressed size. Summing those across every file under `_app/immutable/` (SvelteKit's client chunk prefix) gives you the total client bundle gzip size. The largest of those sums is your worst-case route chunk.

### The checker script

Once you know the shape, the checker is short. It reads both files, walks `nodeMetas` → `moduleParts` → `nodeParts`, aggregates by bundle file, filters to client chunks, and compares the totals against the stored thresholds:

```js
// scripts/check-performance-budgets.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const STATS_PATH = resolve('build/stats.json');
const BUDGETS_PATH = resolve('performance-budgets.json');
const CLIENT_BUNDLE_PREFIX = '_app/immutable';

const formatKilobytes = (bytes) => (bytes / 1024).toFixed(1);

const computeClientBundleSizes = (stats) => {
  const parts = stats.nodeParts ?? {};
  const metas = stats.nodeMetas ?? {};
  const bundleGzipByFile = new Map();

  for (const meta of Object.values(metas)) {
    for (const [bundleFile, uid] of Object.entries(meta.moduleParts ?? {})) {
      const part = parts[uid];
      if (!part) continue;
      bundleGzipByFile.set(
        bundleFile,
        (bundleGzipByFile.get(bundleFile) ?? 0) + (part.gzipLength ?? 0),
      );
    }
  }

  const clientEntries = [...bundleGzipByFile.entries()].filter(([file]) =>
    file.startsWith(CLIENT_BUNDLE_PREFIX),
  );
  return {
    totalClientGzipBytes: clientEntries.reduce((sum, [, bytes]) => sum + bytes, 0),
    largestClientChunkBytes: clientEntries.reduce((max, [, bytes]) => Math.max(max, bytes), 0),
  };
};

const [statsRaw, budgetsRaw] = await Promise.all([
  readFile(STATS_PATH, 'utf8'),
  readFile(BUDGETS_PATH, 'utf8'),
]);
const stats = JSON.parse(statsRaw);
const budgets = JSON.parse(budgetsRaw);

const { totalClientGzipBytes, largestClientChunkBytes } = computeClientBundleSizes(stats);
const totalKilobytes = totalClientGzipBytes / 1024;
const largestKilobytes = largestClientChunkBytes / 1024;

const failures = [];
if (totalKilobytes > budgets.build.maxTotalGzipKilobytes) {
  failures.push(
    `Total client bundle ${formatKilobytes(totalClientGzipBytes)} kB exceeds budget of ${budgets.build.maxTotalGzipKilobytes} kB`,
  );
}
if (largestKilobytes > budgets.build.maxLargestChunkGzipKilobytes) {
  failures.push(
    `Largest client chunk ${formatKilobytes(largestClientChunkBytes)} kB exceeds budget of ${budgets.build.maxLargestChunkGzipKilobytes} kB`,
  );
}

if (failures.length > 0) {
  console.error('Performance budget check FAILED:');
  for (const failure of failures) console.error('  - ' + failure);
  process.exit(1);
}

console.log(
  `Performance budget check OK: total ${formatKilobytes(totalClientGzipBytes)} kB / ${budgets.build.maxTotalGzipKilobytes} kB, ` +
    `largest chunk ${formatKilobytes(largestClientChunkBytes)} kB / ${budgets.build.maxLargestChunkGzipKilobytes} kB`,
);
```

And `performance-budgets.json` is the stored-threshold file next to the script. Start with numbers slightly above the current measured baseline:

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

> [!NOTE] The starter ships this
> Shelf's `scripts/check-performance-budgets.mjs` is a slightly longer version of this sketch that adds `try/catch` around the JSON parse and exposes `clientEntries` for future rules. The walk is identical. Read the sketch above to understand _how_ the aggregation works, then compare it with your lab implementation or the course solution to see the exact shape.

## Runtime budgets: catch slowness where the user feels it

Build size is not the same thing as runtime speed. Sometimes the bundle barely changes and the route still gets slower because a query now runs twice, a component renders too much, or the page does expensive work on load.

This is where the [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data) and Playwright traces earn their keep.

I want one targeted runtime budget, not an entire dashboard:

- the `/shelf` route must load under a chosen threshold in a production-like preview
- or the "rate a book" interaction must complete under a chosen threshold

Pick one flow users actually feel. Measure it the same way every time. Store the threshold. Fail when it drifts.

That is enough to make the loop real.

## Why I am not defaulting to [Lighthouse](https://developer.chrome.com/docs/lighthouse) here

I like [Lighthouse](https://developer.chrome.com/docs/lighthouse). I also know what happens when people wire it in too early: they drown in scores, environment noise, and advice that is technically correct but useless to the task at hand.

For this workshop, I want the cheaper loop:

- build stats for weight
- one reproducible runtime measurement for speed
- Playwright trace or browser timing data when the number goes bad

Once that loop is stable, _then_ you can layer in bigger tooling. But I would not start there.

> [!NOTE] Measurement discipline
> Measure runtime budgets against a stable preview target, not a hot-reloading dev server. If the environment changes every run, the number is telling you about the environment, not the feature.

## How to set the numbers without making them fake

The wrong way: invent ambitious numbers out of thin air and watch the team disable the check by Thursday.

The right way:

1. Measure the current green state.
2. Decide what drift is acceptable.
3. Store the threshold in version control.
4. Tighten later if the team proves it can hold the line.

I usually start with "current baseline plus a small buffer" because it keeps the loop honest. The budget exists to catch accidental regressions first. Optimization heroics can come later.

## What the agent should do when the budget breaks

When the budget breaks, I want the agent to behave exactly the way it behaves on a failing test:

- inspect the changed files
- inspect the build stats or trace
- identify the thing that got heavier or slower
- fix it or explicitly propose a budget change

The last part matters. A budget is allowed to change. But the change should be deliberate, reviewed, and explained, not smuggled in because the agent wanted the check to stop yelling.

## What goes in `CLAUDE.md`

```markdown
## Performance budgets

- After UI or bundle-affecting changes, run the performance budget
  checks before declaring the task done.
- Track two things: build-size drift and one critical runtime
  measurement on a production-like preview target.
- If a budget fails, inspect the stats or trace before guessing at a
  fix.
- Do not raise a budget just to make the check pass. If the budget needs
  to change, explain why in the summary or commit message.
```

## How You Know the Budget Is Real

You have this loop when:

- the repository emits build stats the agent can parse
- one runtime-critical flow has a reproducible timing threshold
- the agent treats budget failures as real failures, not advisory output

## The one thing to remember

Performance budgets are not about chasing perfect scores. They are about making regressions impossible to ignore. Pick two numbers that matter, enforce them consistently, and let the agent trip over them before your users do.

## Additional Reading

- [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md)
- [Lab: Add Performance Budgets to Shelf](lab-add-performance-budgets-to-shelf.md)
