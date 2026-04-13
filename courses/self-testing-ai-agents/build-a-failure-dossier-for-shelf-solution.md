---
title: 'Build a Failure Dossier for Shelf: Solution'
description: Walkthrough of the failure dossier script, config settings, and the experiment that proves the loop works.
modified: 2026-04-12
date: 2026-04-10
---

A failure dossier is the difference between an agent that says "tests failed" and an agent that says "the rate-book dialog test failed on line 47 because the Save button wasn't visible within 5 seconds -- here's the screenshot, here's the trace, and here's the exact command to reproduce it." The first response starts a conversation. The second one starts a fix.

The day-one Shelf starter no longer ships that infrastructure. This lab wires it back in: Playwright config that retains the right artifacts, a fixture that forwards browser console noise, and a script that reads the JSON report and renders a structured markdown dossier.

## What to add

### `playwright.config.ts` -- artifact retention settings

Three settings in the `use` block control what Playwright saves when a test fails:

```ts
use: {
  baseURL: 'http://127.0.0.1:4173',
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

- **`trace: 'retain-on-failure'`** records a full trace for every test but only _keeps_ it when the test fails. Traces include DOM snapshots at every action, network requests, and console logs. They're the single most useful debugging artifact Playwright produces.
- **`screenshot: 'only-on-failure'`** captures a screenshot at the moment of failure. This is the "what did the page actually look like?" evidence.
- **`video: 'retain-on-failure'`** records video but, like traces, only retains it on failure. Video is heavier than traces but occasionally shows timing-dependent issues that a snapshot misses.

The reporter configuration is equally important:

```ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
  ['json', { outputFile: 'playwright-report/report.json' }],
  ['list'],
],
```

The `json` reporter is what the dossier script reads. Without it, there's no machine-readable report to summarize. The `html` reporter is for humans who want to browse failures interactively. The `list` reporter prints results to the terminal during the run.

### `tests/end-to-end/fixtures.ts` -- console forwarding

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (message) => {
      const messageType = message.type();
      if (messageType === 'error' || messageType === 'warning') {
        console.error(`[browser ${messageType}] ${message.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`[browser pageerror] ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      const failureText = request.failure()?.errorText ?? 'unknown error';
      if (failureText.includes('ERR_ABORTED') || failureText.includes('NS_BINDING_ABORTED')) {
        return;
      }
      console.error(`[network failed] ${request.method()} ${request.url()} - ${failureText}`);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.error(
          `[network ${response.status()}] ${response.request().method()} ${response.url()}`,
        );
      }
    });

    await use(page);
  },
});
```

This fixture wraps every test's `page` to forward browser-side noise to Node's stderr. Why does this matter for the dossier? Because the forwarded lines show up in Playwright's reporter output, the HTML report, and the JSON report. Without this, a `console.error('Cannot read properties of undefined')` happening in the browser would be invisible in the dossier -- the test would just time out, and you'd have no idea why.

The `ERR_ABORTED` / `NS_BINDING_ABORTED` filter is there because those are normal navigation cancellations. Forwarding them would create noise that obscures real failures.

### `scripts/summarize-failure-dossier.ts` -- the dossier script

This is the core of the lab. It reads `playwright-report/report.json`, walks the suite tree, collects failures, and renders a markdown file.

The type definitions map Playwright's JSON report structure:

```ts
type FailureSummary = {
  title: string;
  file: string;
  line: number | null;
  projectName: string;
  errorMessage: string;
  screenshotPath: string | null;
  tracePath: string | null;
  videoPath: string | null;
};
```

This is the schema for each failure entry. Everything an agent needs to understand, reproduce, and fix a failure is captured here.

The suite-walking logic is recursive because Playwright nests suites arbitrarily deep (file > describe > describe > test):

```ts
const collectSpecs = (suites: PlaywrightSuite[]): PlaywrightSpec[] => {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...collectSpecs(suite.suites ?? [])]);
};
```

Screenshot selection has an opinion about which image is most useful:

```ts
const pickFailureScreenshot = (attachments: PlaywrightAttachment[] | undefined): string | null => {
  const isImage = (attachment: PlaywrightAttachment): boolean =>
    attachment.contentType?.startsWith('image/') === true;
  const byNamePreference = (name: string) =>
    (attachments ?? []).find(
      (attachment) => isImage(attachment) && attachment.name?.includes(name) === true,
    );
  return (
    byNamePreference('diff')?.path ??
    byNamePreference('actual')?.path ??
    pickAttachment(attachments, isImage) ??
    null
  );
};
```

When Playwright does visual comparison testing, it generates three images: `expected`, `actual`, and `diff`. The `diff` image highlights exactly what changed, so it's the most actionable. The `actual` image shows what the page looked like. The `expected` baseline is the least useful for debugging a failure. The function tries them in that order and falls back to any image attachment for non-visual failures that just have a generic screenshot.

The rendered dossier for each failure includes a reproduction command:

```ts
const reproduceCommand = `npx playwright test --project=${failure.projectName} ${failure.file} -g ${JSON.stringify(failure.title)}`;
```

This is the line the agent (or you) can copy-paste to rerun just the failing test. The `--project` flag targets the right browser configuration, the file path narrows to the right spec, and `-g` filters to the specific test by title. No guessing, no reading through test files to figure out which test failed.

When there are no failures, the dossier says so plainly:

```ts
if (failures.length === 0) {
  return '# Playwright failure dossier\n\nNo failing tests.\n';
}
```

## What you still need to run

### Generate a green dossier first

Run the full test suite and then generate the dossier:

```sh
npx playwright test
npm run dossier
```

Open `playwright-report/dossier.md`. It should say "No failing tests." This is your baseline -- proof that the script runs and produces output even when everything passes.

### The deliberate-break experiment

Now break something on purpose. A reliable way: open `src/routes/shelf/+page.svelte` and change the page heading text to something different. Any test that asserts on the heading content will fail.

Run the suite again:

```sh
npx playwright test
```

You should see at least one failure. Now generate the dossier:

```sh
npm run dossier
```

Open `playwright-report/dossier.md`. For each failure, you should see:

- **The test title and file location** -- which test broke and where it lives.
- **The error message** -- what Playwright actually reported.
- **A screenshot path** -- what the page looked like at the moment of failure.
- **A trace path** -- with the command to open it (`npx playwright show-trace <path>`).
- **A reproduction command** -- the exact `npx playwright test` invocation to rerun just that test.

Open the trace to confirm it's real:

```sh
npx playwright show-trace playwright-report/test-results/<the-trace-file>.zip
```

The viewer shows the full timeline of actions, DOM snapshots at each step, and the exact point where the assertion failed.

### Revert and confirm green

Undo your deliberate break, run the suite again, regenerate the dossier, and confirm it's back to "No failing tests."

### The agent loop

This is the payoff. With the dossier infrastructure in place, the workflow becomes:

1. Tests fail (in CI or locally).
2. Run `npm run dossier`.
3. Hand the dossier to the agent (or let the agent read it directly -- the `CLAUDE.md` "When a test fails" section already tells it to).
4. The agent reads the error, opens the trace, identifies the bug, fixes it, and reruns the specific test.

The dossier replaces "hey, the tests are red, can you look?" with a structured brief that gives the agent everything it needs to start working immediately.

## Patterns to take away

- **Artifacts are only useful if they're retained.** `trace: 'retain-on-failure'` and `screenshot: 'only-on-failure'` are the settings that make debugging possible. Without them, a failure is just an error message with no context.
- **JSON reporters are for machines, HTML reporters are for humans.** The dossier script reads the JSON report. You browse the HTML report. Both are generated from the same run. Wire both.
- **Console forwarding closes the visibility gap.** Browser-side errors are invisible to the test runner unless you explicitly forward them. The fixture bridges that gap, and the forwarded output shows up in the dossier.
- **Screenshot preference matters.** When visual regressions generate multiple images, the diff is the most useful. The dossier script encodes that preference so the agent sees the most actionable image first.
- **Reproduction commands are an API.** A human can copy-paste the command. An agent can execute it directly. Either way, the path from "failure identified" to "failure reproduced" is a single command, not a research project.

## Additional Reading

- [Lab: Build a Failure Dossier for Shelf](lab-build-a-failure-dossier-for-shelf.md)
- [Failure Dossiers: What Agents Actually Need from a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
