---
title: The Playwright Trace Viewer
description: How to record, open, filter, and actually use Playwright's trace viewer so failed tests come with evidence instead of vibes.
modified: 2026-04-14
date: 2026-04-12
---

The trace viewer is one of the best debugging tools in the entire front-end ecosystem, and a lot of teams still use it like a screenshot folder. They open `trace.zip`, click around until they feel vaguely smarter, and then go patch the test. That is not a workflow. That is a ritual.

The [Playwright trace viewer docs](https://playwright.dev/docs/trace-viewer) are solid, and the viewer really does give you almost everything you need: action timeline, DOM snapshots, filmstrip, source locations, logs, console output, network traffic, metadata, and attachments. The trick is learning what it is good at so you stop treating it like a video and start treating it like evidence.

The next [Reading a Trace](reading-a-trace.md) lesson is about diagnosis. This lesson is about operating the tool itself: how to record traces sensibly, open them locally or from CI, and use the viewer features that save the most time.

## Record traces with intent

Most teams either record too little or way too much.

The local-development version is simple:

```bash
npx playwright test --trace on
```

That records traces for every test in the run. It is great when you are actively debugging one thing. It is lousy as a permanent default because trace recording is not free.

For CI, the official docs recommend something more surgical:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
});
```

That setup is smart for exactly the reason you think: passing tests stay cheap, and failing tests get a trace on retry when you actually need the artifact. If you do not use retries, `trace: 'retain-on-failure'` is the next-best default. It is heavier, but still sane.

The options worth remembering:

- `'on-first-retry'`: my default for CI
- `'retain-on-failure'`: good when you want traces for every failure without enabling retries
- `'retain-on-failure-and-retries'`: excellent when you are actively chasing a flake and want both the failing and the eventually-passing attempts to compare
- `'on'`: useful during local debugging, not a great permanent default
- `'off'`: the setting you forget about until the day you really needed the trace

The docs are also blunt about the tradeoff: tracing everything is performance-heavy. Treat `trace: 'on'` like a debugging mode, not like a moral virtue.

If you are using the [Playwright test runner](https://playwright.dev/docs/test-intro), prefer the config-level `trace` option. If you are using Playwright as a library, use [`browserContext.tracing`](https://playwright.dev/docs/api/class-tracing).

## Open traces the fast way

The local command is the one everybody knows:

```bash
npx playwright show-trace path/to/trace.zip
```

The two workflows people forget about are the ones that matter most in teams.

### Open from the HTML report

If you already have the Playwright report on disk, use:

```bash
npx playwright show-report
```

Every failed test in the HTML report has a link to its trace. This is usually the fastest local entry point because the report already groups the failure, the stack, the attachments, and the trace in one place.

### Open remote traces directly

The official docs call this out, and it is surprisingly useful:

```bash
npx playwright show-trace https://example.com/trace.zip
```

If your CI uploads `trace.zip` artifacts to some accessible storage, you can jump straight from failure notification to trace viewer without manually downloading and unpacking anything first.

There is also [`trace.playwright.dev`](https://trace.playwright.dev/), the statically hosted viewer. You can drag and drop a trace file into it, or point it at a remote URL with a query parameter:

```text
https://trace.playwright.dev/?trace=https://example.com/trace.zip
```

The docs note two important details:

- the viewer loads the trace entirely in your browser
- cross-origin rules still apply for remote URLs

That second point explains a lot of "works locally, remote trace won't load" confusion. The viewer is fine. Your artifact host is blocking cross-origin access.

## Use the timeline like a filter, not decoration

The top filmstrip and timeline are not just there to look nice. They are the fastest way to narrow the problem space.

The workflow I use:

1. Find the long action.
2. Double-click it.
3. Let the viewer filter everything else to that time range.

When you double-click an action, the viewer narrows the visible logs, console output, and network requests to that action window. That is a huge deal. Without filtering, a noisy test looks like ten unrelated problems. With filtering, it usually looks like one.

The same applies to the timeline slider. Drag a range and the viewer filters console and network to only the selected actions. This is one of those features that turns a chaotic failure into something you can actually reason about.

## Know what each tab is good at

The trace viewer has more tabs than most people actively use. The useful mental model is not "memorize all the tabs." It is "know which question each tab answers."

### Actions

This is your table of contents. It tells you what Playwright tried to do, what locator it used, and how long it took. If the action list looks wrong, the test likely _is_ wrong.

### Snapshots

This is where you answer "what did the page look like before, during, and after the action?" The official docs call out three snapshot moments: Before, Action, and After. That Action snapshot is especially helpful when you are debugging a click target because it shows the exact node and click position.

### Source and Call

These tabs answer "where in the test did this happen?" and "what did Playwright think it was doing?" I use them together constantly. Source gives me the line. Call gives me the locator, strict-mode details, keys pressed, and timing.

### Log

This is the "what was Playwright waiting on?" tab. If a click looked instant in your head and took four seconds in the trace, the log usually explains whether Playwright was waiting for visibility, stability, enabled state, or some scroll-into-view step first.

### Console and Network

These are the tabs that make the viewer more than a pretty replay. Browser console output, test-side console output, request timing, headers, request bodies, response bodies. Most real failures stop being mysterious once you line these two tabs up against the action timeline.

### Metadata and Attachments

Metadata is underrated. Browser, viewport, duration, and other run-level facts matter more than people admit, especially once projects or cross-browser runs enter the picture.

Attachments matter anytime the test produces extra artifacts. The official docs call out screenshot diffs here, and it is a good example: actual, expected, diff, all in one place.

## The good workflow for CI failures

When a test fails in CI, this is the sequence I trust:

1. Read the failure summary in the HTML report or dossier.
2. Open the trace from that failure.
3. Use the action list to find the slow or failing step.
4. Filter the viewer to that action range.
5. Compare snapshots, then inspect console and network.
6. Only after that decide whether the fix belongs in the test, the app, the config, or the environment.

That order matters because it keeps you from free-associating. The trace viewer is at its best when it is narrowing possibilities.

## The gotchas

### Recording everything forever

`trace: 'on'` everywhere feels safe until artifact storage explodes and the suite slows down. Great for active debugging. Usually the wrong permanent CI default.

### Forgetting the trace starts with the traced context

If you are using the library API, tracing has to start before the interesting navigation. Starting it after the page already loaded is like beginning a screen recording after the bug already happened.

### Confusing "server is noisy" with "trace is noisy"

A trace with twenty requests is not too much information. It is reality. Use action filtering first. The filtering tools are what turn volume into signal.

### Treating the viewer as a substitute for classification

The viewer shows you evidence. It does not name the class of failure for you. That is the bridge to the next lesson: once you know where the evidence lives, you still need to classify the bug correctly.

## The agent rules

```markdown
## Trace viewer

- Record traces intentionally: `on-first-retry` in CI, `retain-on-failure`
  when retries are off, `retain-on-failure-and-retries` when you need flake
  forensics, and `on` only while actively debugging.
- Open the trace from the failing report first, then filter to the slow or
  failing action before reading console or network noise.
- Use the trace viewer to gather evidence, not to justify a guess.
- If the trace is remote, try `show-trace <url>` or `trace.playwright.dev`
  before manually downloading artifacts.
```

## The thing to remember

The trace viewer is not "nice to have" debugging garnish. It is the fastest way to turn a failed test into a bounded investigation. Record traces on purpose, open them from the failure report, filter aggressively, and let the viewer narrow the story before you touch code.

## Additional Reading

- [Reading a Trace](reading-a-trace.md)
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
- [Flaky-Test Triage: When Retries Are Lying to You](flaky-test-triage.md)
- [Playwright UI Mode](playwright-ui-mode.md)
