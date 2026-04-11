---
title: Reading a Trace
description: The Playwright trace viewer is the single best piece of software in the ecosystem, and most agents use it like a folder full of screenshots. This lesson teaches the four panes, a real Shelf failure walked through end to end, and the five fields that feed a failure dossier.
modified: 2026-04-11
date: 2026-04-11
---

The Playwright trace viewer is the single best piece of software in the Playwright ecosystem, and the agents I work with use it like a folder full of screenshots. They open it, scroll, find a red box, close it, and go guess at a fix. That's not reading a trace. That's looking at one.

A trace isn't a recording. It's a time-indexed database of DOM snapshots, network activity, console messages, and action metadata — and every single thing your test did is in there, in order, with before-and-after state. Learning to read one is the single highest-leverage debugging skill in this entire course, because it's the difference between "the agent patches the test until it passes" and "the agent proposes the right fix the first time."

## What's inside a .zip trace

`trace.zip` is a real zip file with real files inside. If you've ever unzipped one, you've seen a `trace.trace` file, a `resources/` folder full of network snapshots and DOM captures, and a `network.network` file with request/response metadata. The `show-trace` command renders all of that into the viewer, but the underlying data is _structured_, not a video. You can parse it with a script. You can diff two traces. You can write a custom reporter that pulls specific fields out of one.

The important reframe: a trace is _data_. It happens to have a great viewer. That's why reading it well matters — the viewer is presenting structured evidence, and your job is to find the specific piece of evidence that explains the failure.

## Opening one

Given a trace zip on disk:

```bash
npx playwright show-trace path/to/trace.zip
```

That opens the viewer in a browser tab. You can also open traces from the HTML report — every failing test links to its trace, and clicking the link opens the viewer inline. The lab in this section generates three real traces for you to practice on:

```bash
npm run traces:generate
```

That script runs the three deliberately-broken specs in `tests/end-to-end/labs/broken-traces/` and copies the resulting trace files to `playwright-report/lab-traces/`. Open them one at a time. We'll work through what to look for next.

## The four panes and what each one tells you

Every trace has four panes in the viewer, and each one answers a different question.

### Timeline / Actions

**The question it answers**: _when_ did each locator resolve, how long did it take, and which one stalled?

The Timeline is the top-of-screen strip showing every action your test performed, in order, sized proportionally to how long it took. When you click an action, every other pane updates to show the state at that moment.

The signal you're looking for: a single action that's disproportionately wide. An action that takes 4.8 seconds on a test that usually takes 1.2 total is the smoking gun. That action was _waiting_ for something. Find out what.

### DOM snapshots (before, action, after)

**The question it answers**: _what_ did the page look like when the locator ran?

This is where "element not found" becomes "element was hidden behind a modal that I forgot about." For every action, Playwright captures a snapshot of the DOM from three moments: before the action fired, at the moment it fired, and immediately after. You can toggle between them with the snapshot selector at the top of the viewer.

The signal you're looking for: the element you _expected_ the locator to match is missing, or it's present but obscured, or it's present multiple times. Agents stop looking at this pane too soon. Look at it longer. The answer is almost always in here.

### Network

**The question it answers**: _which_ requests fired, in what order, with what status codes and timing?

Every HTTP request the page made during the trace is listed, with timing, status, and payload. You can click any request to see the headers and body.

The signal you're looking for: a request that was still pending when the assertion ran (this is the timing-race bucket from the [flaky-test-triage lesson](flaky-test-triage.md)). Or a request that 401'd and triggered a redirect (this is the config/auth-mismatch bucket). Or a request that never fired at all (which means the click didn't dispatch the handler, which usually means the locator resolved to the wrong element).

### Console and source

**The question it answers**: _what_ did the browser say, and _where_ in the test source did the failure land?

The Console pane shows every `console.log`, `console.error`, and `console.warn` the page emitted during the test. The Source pane shows your test code with the failing line highlighted. Between them, you get both the browser's voice and your own.

The signal you're looking for: a `console.error` that explains the failure directly. If the page emitted an error and you didn't catch it, you're missing a whole layer of diagnostic information. Shelf's shared `fixtures.ts` already forwards these to stderr; the [fixtures lesson](fixtures-worker-scoped-test-scoped.md) shows why.

## Reading a trace for a real failure

Let's walk through the Trace A failure from the lab. The spec in `tests/end-to-end/labs/broken-traces/trace-a-config.spec.ts` opts out of the default storage state, navigates to `/shelf`, and asserts the "Your books" heading is visible. It fails.

Generate it if you haven't already:

```bash
npm run traces:generate
```

Then open it:

```bash
npx playwright show-trace playwright-report/lab-traces/trace-a-config.zip
```

Now read the four panes, in order.

**Timeline**: you see two actions — `goto('/shelf')` and `expect(heading).toBeVisible()`. The `goto` is short. The `expect` stalls for five seconds and fails. That's the action that burned the time. Click it.

**DOM snapshot at the failure**: the pane shows a login form, not the shelf. The `<h1>` reads "Sign in to Shelf." The heading "Your books" is nowhere in the DOM. The locator was looking for something that doesn't exist on this page.

**Network**: this is the smoking gun. You see a `GET /shelf` that responded with a `302 Found` and a `Location` header pointing to `/login`, followed by a `GET /login` that responded with a `200 OK`. The test asked for `/shelf` and the server redirected it to `/login` before the page ever rendered.

**Console**: empty. No JavaScript error. This is important — the failure is server-side, not client-side. The redirect happened before any of your app's code ran in the browser.

**Diagnosis**: the test is unauthenticated, and `/shelf` is gated server-side on `locals.user`. Classify it as a config / auth mismatch from the [flaky-test-triage](flaky-test-triage.md) taxonomy. The fix is the project wiring, not the test body — specifically, the `labs-broken-traces` project in `playwright.labs.config.ts` mounts storage state by default, and this one spec opts out via `test.use({ storageState: { cookies: [], origins: [] } })`. The _lesson_ is the failure. The _trace_ is how you get from the failure to "oh, it's the auth."

The whole walkthrough took maybe thirty seconds once you know what to look for. That's the skill.

## The five fields an agent needs

When an agent reads a trace to decide what to fix, there are five fields it should extract — and they map cleanly onto the four panes plus the test file.

1. **Failing step name**. If the test uses `test.step`, the failure report already says which step blew up. If not, you're stuck with a line number. The [test.step lesson](test-step-tags-annotations.md) is what makes this field useful.

2. **DOM snapshot at failure**. Paste the relevant part of the rendered HTML into the dossier — the login form, the stacked modal, the article with the wrong rating, whatever the smoking gun is.

3. **Relevant network requests**. Status, URL, method, and timing for any request that's either (a) pending at the moment of failure or (b) clearly the cause of the failure (a 302, a 401, a 500).

4. **Console errors**. Anything the page emitted via `console.error` or `pageerror`. If it's empty, say so explicitly — an empty console is also diagnostic information.

5. **Timestamp delta between action and assertion**. "Click fired at 1.2s, assertion ran at 1.21s, PATCH response returned at 1.85s" is a complete story in one line. That delta is how you diagnose a timing race without even opening the timeline pane.

These five fields are the handoff to the [Failure Dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md) lesson. The dossier summarizer already extracts most of them from the Playwright JSON reporter output; the discipline here is making sure _you_ know what to look for when the automated extraction misses something.

## The agent rules

```markdown
## Reading a trace

- When a test fails, read the trace _before_ changing code. Classify the failure into one of the four buckets from the triage lesson.
- Quote specific evidence from the trace in the fix commit: the failing step name, the DOM snapshot summary, the relevant network request with status and timing, and the console output (or note it as empty).
- Never delete a trace without extracting the five dossier fields. The dossier is a contract with future-you and the next agent.
- If the timeline shows a single action taking disproportionately long, that action is the smoking gun. Start there.
- If the network pane shows a pending request at the moment of failure, suspect a timing race (bucket 1). Use `waitForResponse`, not a bumped assertion timeout.
```

## The thing to remember

The trace viewer is not a video player. It's a structured-data browser dressed up as a debugging UI. When you treat it like a video player, you scroll, find a red box, and guess. When you treat it like a structured-data browser, you know which pane answers which question, you work through them in order, and you produce a diagnosis in thirty seconds. The trace was telling you the whole time. You just had to learn how to listen.

## Additional Reading

- [Flaky-Test Triage: When Retries Are Lying to You](flaky-test-triage.md) — the framework that turns a trace finding into a classified flake and a specific fix.
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md) — where the five fields above turn into the structured artifact the agent reads.
- [The Waiting Story](the-waiting-story.md) — the lesson that warned you about the exact race-condition failure mode the Network pane surfaces.
