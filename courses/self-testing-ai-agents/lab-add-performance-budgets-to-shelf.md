---
title: 'Lab: Add Performance Budgets to Shelf'
description: Add a build-size budget, add a targeted runtime threshold, and make both numbers cheap enough that the agent can actually use them.
modified: 2026-04-14
date: 2026-04-06
---

You're going to add two checks to Shelf:

- one that says "the shipped client bundle did not get quietly heavier"
- one that says "this important route or interaction did not get quietly slower"

That is enough to turn performance from a vague aspiration into a real feedback loop.

> [!NOTE] Prerequisite
> Complete [Performance Budgets as a Feedback Loop](performance-budgets-as-a-feedback-loop.md) first. This lab assumes you are intentionally building the small two-budget version, not a whole performance platform.

> [!NOTE] In the current starter
> The Shelf starter doesn't include the performance budget loop. This lab is where you add the stats build, the budget file, the check script, the runtime spec, and the `npm run performance:*` commands.

Install the stats-build dependency first:

```sh
npm install -D rollup-plugin-visualizer
```

## The task

Create the five pieces of Shelf's performance budget loop in order. For each one, answer the question in its section before moving on. When you're done, falsify one threshold and watch the gate break.

## 1. The stats build — `vite.config.ts`

Open `vite.config.ts` and add the `rollup-plugin-visualizer` import. Wire it behind a `BUNDLE_STATS=1` environment flag so the normal build stays fast and the stats build is opt-in.

When the flag is set, Vite emits two files:

- `build/stats.html` — a treemap report for humans
- `build/stats.json` — the `raw-data` template, keyed for automation

**Question:** why behind an env flag instead of always-on? (Answer: the stats generation adds meaningful time to the build, and you only need it when you're about to run the budget check.)

## 2. The thresholds — `performance-budgets.json`

Create `performance-budgets.json`. It's eight lines:

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

That's it. Two build numbers, one runtime number, no schema, no tooling. The numbers are baseline-plus-buffer — the current build is ~105 kB total, and 110 gives enough headroom for small feature work without letting a 20% regression slip through.

**Question:** why are the thresholds in a JSON file instead of hardcoded in the check script? (Answer: the file is the contract. Bumping a threshold is a visible commit, which means bumping a threshold is a conversation.)

## 3. The check script — `scripts/check-performance-budgets.mjs`

Create `scripts/check-performance-budgets.mjs`. It's about 88 lines. Walk the four sections:

- **Lines 12–16: constants.** The `CLIENT_BUNDLE_PREFIX = '_app/immutable'` is the SvelteKit-specific filter — it's what makes the budget "client bundle only" rather than "everything Vite emits."
- **Lines 18–43: `computeClientBundleSizes`.** This is the whole lesson. Walk `nodeMetas → moduleParts → nodeParts` to sum gzip bytes per output file, filter to client chunks, return `totalClientGzipBytes`, `largestClientChunkBytes`, and `clientEntries`.
- **Lines 45–83: `main`.** Read both files, compute sizes, compare to budgets, push a human-readable string into `failures` for each exceeded threshold. On failure: print to stderr and exit 1. On success: print the current numbers with their budgets and exit 0.
- **Lines 85–88: top-level error handler.** Exits 2 on any thrown error so the agent can distinguish "budget exceeded" from "script broke."

The lesson walks the `nodeMetas` structure in the **The checker script** section of [Performance Budgets as a Feedback Loop](performance-budgets-as-a-feedback-loop.md) if you want the data-shape explanation before you open the script.

**Question:** why does the script return `clientEntries` from `computeClientBundleSizes` even though `main` doesn't use it? (Answer: future rules like "which chunk grew the most week-over-week" can read it without re-walking the report. The function is written for the next feature, not just this one.)

## 4. The runtime spec — `tests/performance.spec.ts`

Create `tests/performance.spec.ts`. It goes to `/shelf`, reads `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd` inside the browser context, loads the threshold from `performance-budgets.json`, and asserts the measured value is under it.

Two things to notice:

- The threshold is read from disk, not hardcoded. Same contract as the build budget — bumping it is a visible commit.
- If you already completed the storage-state lab, run the spec inside that authenticated Playwright project so it measures the real build-and-preview flow. If your current Shelf copy still has only the minimal public starter, either add the authenticated project first or point the runtime check at a public route until the auth loop exists.

**Question:** why measure `domContentLoadedEventEnd` instead of something like `largestContentfulPaint`? (Answer: `domContentLoaded` is cheaper to stabilize because it doesn't depend on image decode or font load. For a budget you want a number that moves only when _your_ code changes, not when an asset pipeline hiccups.)

## 5. The named commands — `package.json`

Open `package.json` and add the four performance scripts:

```json
{
  "scripts": {
    "build:stats": "BUNDLE_STATS=1 vite build",
    "performance:build": "npm run build:stats && node scripts/check-performance-budgets.mjs",
    "performance:runtime": "playwright test tests/performance.spec.ts --project=authenticated",
    "performance:check": "npm run performance:build && npm run performance:runtime"
  }
}
```

The shapes matter: `performance:check` is the one command an agent calls to get the full answer. Everything below it is a piece the agent can rerun in isolation when one of the two halves is the one that broke.

**Question:** why _doesn't_ `performance:runtime` shell out to `drizzle-kit push --force` first? (Answer: by this point the authenticated project and seed helpers should already own the app setup. The performance command should measure the app, not hide infrastructure bootstrapping inside a side-effect-heavy script preamble.)

## Break it

Now that you've read all five pieces, prove you understand how they interact.

1. Open `performance-budgets.json`. Lower `maxTotalGzipKilobytes` from `110` to `50`.
2. Run `npm run performance:build`.
3. Read the failure output. It should name the failing budget and the actual measured size.
4. Restore the threshold. Rerun. Watch it go green.

If the failure didn't look the way you expected, go back to `scripts/check-performance-budgets.mjs` section 3 and re-read `main` — the `failures.push(...)` string is the thing you just saw, word for word.

## Acceptance criteria

You're done when you can answer each of these without looking:

- [ ] Why is the stats build gated behind `BUNDLE_STATS=1`?
- [ ] Why do the thresholds live in a JSON file instead of the script?
- [ ] What does `CLIENT_BUNDLE_PREFIX` filter out, and why?
- [ ] What's the difference between exit 1 and exit 2 in `check-performance-budgets.mjs`?
- [ ] Why does the runtime spec run under the `authenticated` project specifically?
- [ ] Why does `performance:runtime` stay focused on the test run instead of sneaking setup commands into the script?
- [ ] You lowered `maxTotalGzipKilobytes` to `50`, ran `npm run performance:build`, saw it fail, and restored the threshold. (Mechanical check of the read.)

## Troubleshooting

- If the runtime number jumps around wildly, stop measuring against the dev server and switch to build plus preview.
- If the build stats are hard to parse, simplify the report shape before you add more budgets.
- If the budget fails after a legitimate feature addition, inspect the stats first. Sometimes the fix is obvious. Sometimes the correct answer is a deliberate budget update with an explanation.

## Stretch goals

- Track a second runtime flow, but only after the first one is stable.
- Upload the build stats report and runtime trace as CI artifacts when the check fails.
- Add a workflow summary that prints the before-and-after numbers for faster review.

## The one thing to remember

Performance only becomes part of the loop when there is a number the agent can break. Pick the number, store it in the repository, and make the command cheap enough that the agent will actually run it.

## Additional Reading

- [Solution](add-performance-budgets-to-shelf-solution.md)
- [Performance Budgets as a Feedback Loop](performance-budgets-as-a-feedback-loop.md)
- [Runtime Tools Compared](runtime-tools-compared.md)
