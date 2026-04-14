---
title: 'Lab: Build a Failure Dossier for Shelf'
description: Wire up traces, screenshots, console capture, and a dossier summarizer. Then break a test and watch the agent fix it from the dossier alone.
modified: 2026-04-14
date: 2026-04-06
---

Short lab. Add the dossier infrastructure back into Shelf, understand why each piece is there, then break a test and watch the loop close.

Once the lab is wired up, Shelf writes artifacts under `playwright-report/test-results/`, the HTML report to `playwright-report/html/`, the JSON report to `playwright-report/report.json`, and the markdown summary to `playwright-report/dossier.md`. The simplest, most controlled way to force a failure against the current minimal suite is to change one assertion in `tests/smoke.spec.ts`, run `npm run test`, watch the smoke spec go red, run `npm run dossier`, read the generated markdown, then revert and rerun green.

> [!NOTE] In the current starter
> The Shelf starter doesn't include the dossier layer. This lab is where you add the Playwright artifact settings, the console-forwarding fixture wrapper, the dossier script, the `npm run dossier` command, and the matching `CLAUDE.md` note.

## 1. The config — `playwright.config.ts`

Open `playwright.config.ts`. Find the `outputDir`, `use`, and `reporter` keys. They look like this:

```ts
outputDir: 'playwright-report/test-results',
use: {
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
  ['json', { outputFile: 'playwright-report/report.json' }],
  ['list'],
],
```

The JSON reporter is the load-bearing one — the dossier script reads it. The HTML reporter is what humans look at. The list reporter is what streams to the terminal while the suite runs.

**Question:** why `retain-on-failure` instead of `on`? (Answer: `on` retains traces, screenshots, and videos for every test, pass or fail. On a 38-test suite that adds hundreds of megabytes of artifacts for runs that don't need them. `retain-on-failure` keeps the loop cheap when it's green and generous when it's red.)

## 2. The console forwarders — `tests/fixtures.ts`

Create `tests/fixtures.ts`. The extended `page` fixture subscribes to `page.on('console', ...)` and `page.on('requestfailed', ...)` and forwards errors to the Node process's stderr with a `[browser error]` or `[network error]` prefix.

Notice the filter for `ERR_ABORTED`. That code fires whenever Playwright navigates away from a page mid-request, which happens constantly in a test suite. Without the filter the console is unreadable.

**Question:** why forward to stderr instead of collecting into an array and dumping at the end? (Answer: streaming to stderr means the error lands in the Playwright report under the test it came from, and the list reporter picks it up in real time. An end-of-run dump loses the association between the error and the test that caused it.)

## 3. The dossier script — `scripts/summarize-failure-dossier.ts`

Create `scripts/summarize-failure-dossier.ts`. Roughly 200 lines in the completed version. Walk the six sections:

- **Lines 16–64: type declarations.** `PlaywrightReport → PlaywrightSuite → PlaywrightSpec → PlaywrightTest → PlaywrightResult → PlaywrightAttachment`. These mirror the shape Playwright's JSON reporter emits. They exist as explicit types instead of `any` so the `suites → specs → tests → results` walk stays honest when the report schema drifts.
- **Lines 66–76: `collectSpecs` and `pickAttachment`.** Recursive flatten of the nested suite tree plus a generic attachment-picker. Both are small helpers the walk needs.
- **Lines 78–97: `pickFailureScreenshot`.** This is the visual-regression-aware part. When a `toHaveScreenshot` assertion fails, Playwright retains three images: `expected` (the baseline), `actual` (the new render), and `diff` (the pixel difference). The shipped script prefers `diff`, then `actual`, then any image attachment. The lesson sketch in [Failure Dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md) omits this — a reviewer always wants the diff, not the baseline, and shipping the simpler version would lead to a dossier that links to the wrong image on visual failures.
- **Lines 99–137: `buildFailureList`.** The walk. Iterate every spec, every test inside it, every result inside that. Skip anything that isn't `failed` or `timedOut`. For each failure, pull the error message with a three-level fallback (`result.error?.message ?? result.errors?.[0]?.message ?? 'Unknown error'`), the screenshot path, the trace path, and the video path.
- **Lines 139–178: `renderDossier`.** Markdown rendering. The crucial line is the `reproduceCommand`: on a repo with named Playwright projects it should render something like `npx playwright test --project=${failure.projectName} ${failure.file} -g ${JSON.stringify(failure.title)}`. On the minimal starter, where you may still be using a single unnamed project, the important pieces are still the same: file plus grepped title, and the project flag only when it exists. Without those pieces the "reproduce" command reruns far too much of the suite.
- **Lines 180–200: `main`.** Read the report, build the list, ensure the output directory exists, write the markdown, print a summary to stderr. The summary goes to stderr (not stdout) so a calling script can pipe the markdown somewhere without mixing in log lines.

**Question:** why does `buildFailureList` keep `'timedOut'` in the failed-status set? (Answer: a timeout is a failure, and a timeout leaves the same artifacts behind as a regular failure. Leaving it out means the dossier silently drops timeouts, which is the worst kind of gap — "the tests passed" when they actually hung.)

## 4. The named command — `package.json`

Open `package.json` and add `"dossier": "tsx scripts/summarize-failure-dossier.ts"`. Notice there's no `&&` chain — the dossier script runs on demand, not after every test run. That's deliberate: most test runs are green, and writing an empty dossier every time adds noise without signal. The agent calls `npm run dossier` only when it needs to look at a failure.

## 5. CLAUDE.md — the reproduction instructions

Open `CLAUDE.md`. Find the "When a test fails" section. It names `npm run dossier` and points at `playwright-report/dossier.md`. That's the whole entry — three lines of markdown, but load-bearing. Without it, the agent would look at a failing test and scroll the terminal output instead of reading the structured file.

![The Playwright HTML report used as the dossier front door](./assets/lab-failure-dossier-report.png)

## Acceptance criteria

You're done when you can answer each of these without looking:

- [ ] Why does the config use `retain-on-failure` instead of `on`?
- [ ] Why does the console forwarder filter `ERR_ABORTED`?
- [ ] Why does the forwarder stream to stderr rather than dumping at the end?
- [ ] Why does `pickFailureScreenshot` prefer `diff` over `actual` over any image?
- [ ] Why does `buildFailureList` treat `'timedOut'` the same as `'failed'`?
- [ ] What three pieces does the `reproduceCommand` chain together, and why all three?
- [ ] Why is `npm run dossier` an on-demand command instead of something chained onto `npm run test`?

And one mechanical check:

- [ ] You broke a test, ran the suite, ran `npm run dossier`, and opened `playwright-report/dossier.md` to see the failure listed with a screenshot link and a reproduce command. Then you reverted and reran green.

## Testing the loop end-to-end

Now the hard part. Verify the loop actually works by giving the agent a failing test and nothing else.

1. Introduce a subtle bug in Shelf that the existing smoke spec catches. Example: open `src/routes/+page.svelte` and change a handful of characters in the `PageHeader` heading (say, from `Build a shelf that remembers what you actually read` to `Build a shelf that remembers every book you open`) so `tests/smoke.spec.ts` goes red on the `getByRole('heading', { name: /Build a shelf that remembers what you actually read/i })` assertion.
2. Run `npx playwright test tests/smoke.spec.ts`. It should fail because the heading text no longer matches the regex.
3. Run `npm run dossier`. Open `playwright-report/dossier.md` to confirm the failure is captured.
4. Open Claude Code. Say: _"Read `playwright-report/dossier.md`. Diagnose the failure. Propose a fix. Apply it."_
5. Do not give the agent any other context. Do not mention which line you edited. Let it figure it out from the dossier and the code.

### End-to-end acceptance criteria

- [ ] The agent reads the dossier without being prompted to look anywhere else.
- [ ] The agent reproduces the failure locally using the reproduction command from the dossier.
- [ ] The agent identifies the mismatched heading in the home page (or whichever spec you broke).
- [ ] The agent applies the fix and reruns the test.
- [ ] The test passes.
- [ ] You did not need to provide additional context during the conversation.

If the agent got stuck, the dossier was missing something. Figure out what it was missing and add it. Common gaps: not enough context in the error message, screenshot doesn't show the relevant UI state, reproduction command doesn't isolate the failure, console logs not included. Iterate until the agent can debug a planted bug without your help.

## Stretch goals

- Expand the dossier to include the first 20 lines of the trace's action log for each failure (Playwright's trace JSON can be parsed to extract this).
- Add a "recent git history" section to the dossier—the last 5 commits and their summaries—so the agent has context for what recently changed.
- Write a second dossier format, `dossier.json`, so tools can consume it programmatically.
- Add the dossier summarizer to the Playwright script so it always runs after a failing test run. In the current starter that might be `"test": "playwright test || (npm run dossier && exit 1)"`.

## The one thing to remember

The moment you can hand the agent a single file and say "diagnose this," you've automated the first half of debugging. Everything after that is iteration, and iteration is where agents excel. The dossier is the bridge between "a test failed" and "the agent can fix it unsupervised."

## Additional Reading

- [Solution](build-a-failure-dossier-for-shelf-solution.md)
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
- [The Second Opinion](the-second-opinion.md)
