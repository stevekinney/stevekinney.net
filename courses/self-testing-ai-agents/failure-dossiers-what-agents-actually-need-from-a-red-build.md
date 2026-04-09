---
title: 'Failure Dossiers: What Agents Actually Need From a Red Build'
description: A failed test is a prompt. The prompt is only as good as the evidence attached to it.
modified: 2026-04-09
date: 2026-04-06
---

Here's a thing I wish I'd understood about a year earlier than I did: **when an agent sees a test failure, the test output is a prompt.** That's the whole framing shift. The red X on the build isn't a status—it's the next instruction the agent is going to act on, and everything attached to the red X is context for that instruction.

Which means the quality of your test output determines how well the agent can fix things. A failure that says `expect(received).toBe(expected)` with two-line stack trace is a bad prompt. A failure that says what was expected, what actually happened, what the page looked like, what the console said, what the network did, and where to look first—that's a good prompt. The agent will fix the second one without your help about three times more often than it fixes the first.

This lesson is about making failures good prompts. I call the bundle a "failure dossier," because I'm dramatic. Call it whatever you want. The idea is the same.

## What a failure dossier contains

Minimum viable dossier for a failing Playwright test:

- **The test name and file path.** Obvious, often missing from a copy-pasted error.
- **The assertion that failed.** What did the test expect? What did it get? Both sides, not just the failure message.
- **A screenshot of the page at the point of failure.** Playwright takes this for you if you ask it to.
- **The full DOM snapshot at the point of failure.** Playwright's trace file includes this.
- **Console logs from the browser during the test run.** Also in the trace.
- **Network requests that happened during the test.** Also in the trace.
- **The command to reproduce.** Not "the test failed"—the literal shell command that isolates this test.

If your dossier has all of these and a label saying "here's what failed and why," the agent has everything it needs to propose a fix without asking you a single question.

The good news: Playwright already captures most of this for you. You just have to turn it on and route it to a place the agent can read it.

## Turning on traces, screenshots, and videos

In `playwright.config.ts`, use the [tracing configuration options](https://playwright.dev/docs/api/class-testoptions#test-options-trace):

```ts
export default defineConfig({
  outputDir: 'playwright-report/test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

Three knobs.

`trace: 'retain-on-failure'` tells Playwright to record a trace file (`trace.zip`) for every test that fails and discard it for every test that passes. The trace includes DOM snapshots, screenshots, network logs, console logs, and the full Playwright action log. It's the most information-dense artifact in the whole ecosystem. You can open it with `npx playwright show-trace trace.zip` and get a fully interactive timeline of the test using the [Trace Viewer](https://playwright.dev/docs/trace-viewer).

`screenshot: 'only-on-failure'` writes a single PNG of the page at the moment the assertion failed. This is the image you feed to an agent. It's redundant with the trace but cheaper to access—one file, opens instantly.

`video: 'retain-on-failure'` records the whole test as a video. I use this less often than I expected to. A video of a test is hard for an agent to consume (most agents can't watch video), and it's rarely more useful than the trace for a human. I keep it on because it's free, but I wouldn't miss it if it weren't.

## The HTML report is the dossier's front door

`playwright.config.ts`:

```ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
  ['list'],
],
```

The HTML reporter writes `playwright-report/html/index.html`, and for each failed test it shows the assertion, the screenshot, the error stack, and a link to open the trace. Open it in a browser and you get a gorgeous, readable dossier with zero effort.

> [!NOTE]
> **Third dry run validation**: In the current Shelf branch, the easiest safe planted failure was a missing visual snapshot. That produced the full dossier artifact set we care about: `report.json`, `dossier.md`, a retained screenshot, a retained video, and a `trace.zip` under `playwright-report/test-results/` without needing to ship a fake application bug just to exercise the reporting loop.

![The Playwright HTML report after a deliberate Shelf failure](./assets/lab-failure-dossier-report.png)

The `open: 'never'` flag keeps Playwright from auto-opening a browser tab when you run tests, which is annoying in CI and distracting locally.

## Making dossiers agent-readable

Here's where the lesson gets interesting. An HTML report is great for humans. It's _okay_ for agents. The agent can read the filesystem, so it can technically find the error messages. But it's much better if the agent can ask for "the dossier for the last failing test" and get back a structured summary.

A failure dossier summarizer is worth writing. It's a ~50 line script that:

1. Reads `playwright-report/` after a test run.
2. Finds the failed tests.
3. For each one, extracts the error message, the screenshot path, a short DOM excerpt from the trace, and the first three console errors.
4. Writes a single `dossier.md` file with all of that, linked to the screenshots.

```ts
// scripts/summarize-failure-dossier.ts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const reportJson = JSON.parse(readFileSync('playwright-report/report.json', 'utf8'));

const failures = reportJson.suites
  .flatMap((suite: any) => suite.specs ?? [])
  .flatMap((spec: any) =>
    (spec.tests ?? []).flatMap((test: any) => {
      const failedResult = (test.results ?? []).find((result: any) => result.status === 'failed');
      return failedResult ? [{ spec, failedResult, projectName: test.projectName }] : [];
    }),
  );

const markdown = failures
  .map(
    ({ spec, failedResult, projectName }: any) => `
## ${spec.title}

**File**: \`${spec.file}:${spec.line}\`

**Error**:
\`\`\`
${failedResult.error?.message}
\`\`\`

**Screenshot**: [${path.basename(failedResult.attachments[0].path)}](${failedResult.attachments[0].path})

**Reproduce**:
\`\`\`sh
npx playwright test --project=${projectName} ${spec.file} -g "${spec.title}"
\`\`\`
`,
  )
  .join('\n---\n');

writeFileSync('playwright-report/dossier.md', markdown);
console.error(`Wrote dossier for ${failures.length} failures`);
```

(Adjust field names to match your Playwright version—the JSON schema shifts between releases. The point is the structure, not the exact API.)

Now you can add to `CLAUDE.md`:

```markdown
## When a test fails

1. Run `npm run dossier` to generate a summary at `playwright-report/dossier.md`.
2. Read the dossier. It contains the error, screenshot path, and reproduction command for every failure.
3. Use the reproduction command to rerun just the failing test while iterating.
4. Do not "fix" by changing the assertion. Fix the underlying code.
```

The agent now has a single, structured entry point. One command, one file, actionable content inside.

## How the loop flows

```mermaid
graph LR
  A["Test fails<br/>Red build"] --> B["Trace + screenshots<br/>+ console + network"]
  B --> C["dossier.md generated<br/>structured summary"]
  C --> D["Agent reads dossier"]
  D --> E["Reproduces failure<br/>from command in dossier"]
  E --> F["Inspects screenshot<br/>and trace"]
  F --> G["Proposes fix"]
  G --> H["Rerun test"]
  H -->|Passes| I["✓ Done"]
  H -->|Still fails| D
```

## Console and network capture

Two Playwright tricks that pay for themselves immediately in the dossier.

**Forwarding browser console to test output.** Add this as a test fixture:

```ts
// tests/end-to-end/fixtures.ts
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.error(`[browser ${msg.type()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      console.error(`[browser pageerror] ${error.message}`);
    });
    await use(page);
  },
});
```

Now any browser console error shows up in the test output. When a test fails, the agent can grep the output for `[browser` and see what the app was complaining about in the moments leading up to failure. Half of "mystery" failures turn out to be "oh, there was a TypeError in a component we didn't think mattered."

**Network failure logging.** Similar pattern:

```ts
page.on('requestfailed', (request) => {
  const failureText = request.failure()?.errorText ?? 'unknown error';
  if (failureText.includes('ERR_ABORTED') || failureText.includes('NS_BINDING_ABORTED')) {
    return;
  }
  console.error(`[network failed] ${request.method()} ${request.url()} - ${failureText}`);
});
page.on('response', async (response) => {
  if (response.status() >= 400) {
    console.error(
      `[network ${response.status()}] ${response.request().method()} ${response.url()}`,
    );
  }
});
```

Every failed request, every 4xx, every 5xx shows up in the output. When a test fails because "the button didn't do anything," the `[network 500]` line in the output tells the agent that the button _did_ do something—the API call just failed.

## The `console.log` trap

A counterintuitive one: stop letting the agent add `console.log` statements to tests as a debugging technique. The test fails, the agent adds `console.log(await page.content())` and reruns it. This works, but it's a worse version of what the trace already gives you. The trace has the full DOM at every step, timestamped, already structured.

Rule:

```markdown
- Do not add `console.log` statements to test files to debug failures.
  Read the trace instead: `npx playwright show-trace <path>`. If the
  information you want is not in the trace, either add it as a
  permanent observation (network listener, console forwarder) or
  explain why it's missing.
```

The reason this matters is that `console.log` statements add up. They land in PRs. They ship to CI. They accumulate. A test file with fifteen `console.log` calls is a test file nobody wants to read, and all fifteen were added one at a time by an agent trying to fix a failure.

## What the dossier gives you on the agent side

Here's the loop I care about. A test fails. The dossier is generated. The agent runs Claude Code and says:

> Read `playwright-report/dossier.md`. Pick the first failure. Use the reproduction command to rerun the test in isolation. Look at the screenshot. Read the trace. Propose a fix. Apply the fix. Re-run the test. If it still fails, iterate.

That's a fully self-driving debugging loop. The agent doesn't need you to paste error messages. It doesn't need you to run the test. It doesn't need you to open the HTML report. It reads the dossier, reproduces the failure, looks at the evidence, and iterates. All you do is notice when the loop converges and review the fix.

Every piece of this lesson is a piece of that loop. The dossier is the entry point. The trace is the evidence. The reproduction command is the action. The screenshot is the sanity check.

## The one thing to remember

A failing test is a prompt. A good prompt is loaded with evidence. Traces, screenshots, console logs, reproduction commands—all of them belong in the dossier, because the agent can only act on what you attach. Turn them on once and the loop gets dramatically tighter.

## Additional Reading

- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
- [Lab: Build a Failure Dossier for Shelf](lab-build-a-failure-dossier-for-shelf.md)
