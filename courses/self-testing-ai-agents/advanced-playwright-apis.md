---
title: Advanced Playwright APIs
description: A short list of page-level Playwright APIs that solve real diagnostic and leak-checking problems once the suite is already in decent shape.
modified: 2026-04-14
date: 2026-04-14
---

Playwright has plenty of APIs that are mildly interesting in the abstract and completely irrelevant in a real test suite. This appendix is not that list.

It is also intentionally short now. Locator debugging belongs in [Playwright UI Mode](playwright-ui-mode.md). Screenshot stabilization belongs in [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md). HAR lifecycle details belong in [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md).

What remains here are the genuinely odd [Page APIs](https://playwright.dev/docs/api/class-page) that still earn their keep once the suite gets weird: quick postmortems in test code and explicit leak probes.

## Let the page keep its own receipts

The [Page API](https://playwright.dev/docs/api/class-page) exposes `page.consoleMessages()` and `page.pageErrors()`, which is a lot nicer than wiring your own event collectors every time a test gets noisy. This pairs well with [The Playwright Trace Viewer](playwright-trace-viewer.md): traces are still the main evidence artifact, but sometimes you want a quick postmortem directly in test code.

The useful pattern is not "dump every message forever." The useful pattern is "capture the current counts, do the risky thing, then inspect what was added."

Use these when:

- a click succeeds but the page quietly logs `console.error(...)` and the visible assertion fails three steps later
- a save flow sometimes explodes in the browser with an uncaught exception, but the trace is more evidence than you need for the first pass
- you want a test to fail with "the page threw after publish" instead of "expected heading to be visible"

```ts
const messageCountBefore = (await page.consoleMessages()).length;
const errorCountBefore = (await page.pageErrors()).length;

await page.getByRole('button', { name: 'Publish' }).click();

const consoleMessages = (await page.consoleMessages()).slice(messageCountBefore);
const pageErrors = (await page.pageErrors()).slice(errorCountBefore);

expect(pageErrors).toHaveLength(0);
expect(consoleMessages.map((message) => message.type())).not.toContain('error');
```

That is the whole move:

- `consoleMessages()` and `pageErrors()` give you the latest bounded history from the page
- the API keeps only the last 200 messages, so this is for focused postmortems, not permanent log retention
- counting before the risky action and slicing after it gives you a simple "what changed?" view without building your own event bus

> [!NOTE] 200-message cap
> Because the buffer is capped at roughly 200 messages, the "count before and slice after" pattern breaks quietly if the action under test produces more than `200 - messageCountBefore` messages — older messages drop off and the slice index points at the wrong place. For noisy actions, either use the `{ filter: 'since-navigation' }` option on `consoleMessages()` or add an explicit navigation marker before the risky step.

This is not a replacement for the trace viewer. It is a good way to make the test fail with something more informative than "expected true to be false."

## `requestGC()` is how you stop hand-waving about leaks

The [Page API](https://playwright.dev/docs/api/class-page#page-request-gc) also gives you `page.requestGC()`, which sounds suspiciously low-level until you remember that memory leaks are usually diagnosed with vibes and denial. This fits naturally beside [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md): if a page is supposed to drop an object after navigation or teardown, you can check instead of guessing.

Use this when:

- a dialog, editor, or chart instance is created and destroyed repeatedly and you suspect old instances are sticking around
- a route transition is supposed to tear down subscriptions, observers, or heavyweight widgets and you want one hard check instead of a hand-wave in code review
- you are investigating "the fifth run gets slower than the first" and need a narrow leak probe before reaching for full browser profiling

The docs show the right pattern: keep a `WeakRef`, request garbage collection, then assert that the object is gone.

```ts
await page.evaluate(() => {
  globalThis.dialogWeakRef = new WeakRef(window.__testDialog);
  window.__testDialog = undefined;
});

await page.requestGC();

const leaked = await page.evaluate(() => !!globalThis.dialogWeakRef.deref());
expect(leaked).toBe(false);
```

This is still a heuristic. Garbage collection is not a blood oath that every unreachable object is gone immediately. But it is a real signal, which is already better than most leak checks teams ship.

## The agent rules

```markdown
## Playwright debugging APIs

- Use `page.consoleMessages()` and `page.pageErrors()` for focused
  postmortems, not as permanent log dumping infrastructure.
- If a test needs to assert on new console noise or browser errors, read
  the current buffers first, perform the risky action, then inspect the
  new slice.
- Use `page.requestGC()` only for explicit leak checks where the page
  code exposes a `WeakRef` or similarly testable handle.
```

## The one thing to remember

The useful advanced Playwright APIs are not the cute ones. They are the ones that make failures easier to explain and leak checks harder to hand-wave away.

## Additional Reading

- [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md)
- [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md)
- [Playwright UI Mode](playwright-ui-mode.md)
- [The Playwright Trace Viewer](playwright-trace-viewer.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [Page API](https://playwright.dev/docs/api/class-page)
