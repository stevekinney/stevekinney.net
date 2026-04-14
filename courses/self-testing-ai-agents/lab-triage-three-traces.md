---
title: 'Lab: Triage Three Traces'
description: Generate three real traces from deliberately-broken Shelf specs, open each one in the viewer, and diagnose the failure using the four-bucket taxonomy.
modified: 2026-04-14
date: 2026-04-11
---

Time to cash the checks from the last two lessons. [Reading a Trace](reading-a-trace.md) taught you the four panes. [Flaky-Test Triage](flaky-test-triage.md) gave you the four-bucket classification. This lab asks you to apply both, at the same time, to three real traces generated from three deliberately-broken specs in the Shelf starter.

The three broken specs live in `tests/labs/broken-traces/`. The Shelf starter does not ship the trace-generator helper, and the root `playwright.config.ts` ignores `tests/labs/**` by default so the green starter loop stays green. Each of those specs also starts with `test.skip()` as a safety gate — your generator helper has to remove or wrap that call before Playwright will actually run them and produce failing traces. Additionally, the future `labs-broken-traces` project referenced in the spec comments isn't defined in the starter's `playwright.config.ts` yet; you add it as part of this lab alongside the generator helper. This lab is where you add `scripts/generate-lab-traces.mjs` (or an equivalent helper) plus whatever temporary config override you need to make those specs discoverable. Then you generate the traces, open them in the viewer, and write a four-field diagnosis per trace. The goal is muscle memory: classify-and-cite, classify-and-cite, classify-and-cite, until reading a trace stops feeling like reverse-engineering and starts feeling like reading.

## Setup

First, add the generator helper as `scripts/generate-lab-traces.mjs` (or equivalent), then wire a package script for it:

```json
{
  "scripts": {
    "traces:generate": "node scripts/generate-lab-traces.mjs"
  }
}
```

Then, from the Shelf repo root:

```bash
npm run traces:generate
```

That helper runs the deliberately-broken specs, tolerates the expected nonzero exit (the specs are red by design), and copies the three trace zips into `playwright-report/lab-traces/`:

```
playwright-report/lab-traces/
├── trace-a-config.zip
├── trace-b-race.zip
└── trace-c-stale-locator.zip
```

If any of the three files are missing, the script will fail loudly. That means the lab scaffolding is out of sync with something — the spec was accidentally fixed, the project was renamed, the outputDir drifted. Open the traces you have and file a bug.

> [!TIP] Re-running the lab
> If you add a `traces:clean` helper, have it remove `playwright-report/lab-traces/` so you can regenerate from a clean slate. Useful if you want to generate new traces after tweaking the broken specs.

## Your job

Create a file next to the traces — say, `playwright-report/lab-traces/triage.md` — with a four-field diagnosis for each of the three traces. The four fields:

1. **Failing step name**. If the spec doesn't use `test.step`, use the test title plus the line number. If it does use steps, use the step label.
2. **Smoking-gun pane**. One of: Timeline, DOM snapshot, Network, Console. This is the pane where the _specific_ evidence that explains the failure lives. There's usually exactly one right answer per trace.
3. **Which of the four causes from [flaky-test-triage](flaky-test-triage.md) applies**. One of: timing race, shared state leak, order-dependent rendering / locator ambiguity, config / auth mismatch.
4. **Proposed fix**. The minimum code change that would turn this red trace green — a specific locator, a specific `waitForResponse`, a specific project wiring edit. Not "fix the test." A concrete change.

Every diagnosis has to cite _specific evidence_ from the trace: a network request URL, a DOM snapshot timestamp, a console error string. "The test seems to fail because of timing" is not a diagnosis. "The network pane shows `PATCH /api/shelf/abc123` still pending at 1.21s while the assertion ran at 1.20s" is.

## Acceptance criteria

- `playwright-report/lab-traces/triage.md` exists and has a four-field diagnosis for each of the three traces.
- Each diagnosis cites at least one specific piece of evidence (a URL, a timestamp, a DOM excerpt, a console string) from the relevant pane.
- The _cause_ field in each diagnosis is one of the four labels from the flaky-test-triage lesson. Not "unclear" or "mixed."
- The proposed fix for each trace is a concrete code change, not a vague intention.

## Suggested order of attack

Open Trace A first:

```bash
npx playwright show-trace playwright-report/lab-traces/trace-a-config.zip
```

Walk the four panes in order. Timeline, DOM snapshot, Network, Console. Where's the disproportionately-long action? What does the DOM look like at the failure? What's in the Network pane? What's in the Console? The evidence will point at a bucket. Write the diagnosis.

Then Trace B. The pattern is similar, but the signal lives in a different pane. Follow the same four-pane sweep, and notice how your _second_ answer is in a different place than your first. That's the skill this lab is training — stop looking at the same pane first every time.

Then Trace C. This one's different again. Your diagnosis should end up citing something from the error/console pane or the DOM snapshot, not the timeline.

## Stretch: write the fix

For at least one of the three traces, go beyond diagnosis and actually fix the spec. The broken specs live in `tests/labs/broken-traces/`. Edit the file, run `npm run traces:generate` again, and confirm the generator complains that the trace for your "fixed" spec is missing — because the spec passed, so Playwright didn't write a `trace.zip` for a failed run.

That's the signal: when the trace disappears, the test is green. The generator is telling you the fix worked.

Revert the fix before committing. The broken specs are fixtures for the lab; they're supposed to stay broken.

## Don't

- Don't cite "it felt like a race condition" without a network-pane fact to back it up.
- Don't classify into two buckets. Each trace has one primary cause. Pick one.
- Don't skip the Console pane on a trace just because the test doesn't use `console.log`. Browser errors land there too.
- Don't propose `retries: 3` as a fix. You just spent the whole previous lesson learning why that's a painkiller.

## What success looks like

After the first trace, you're working through the panes methodically and writing a real diagnosis. After the second, you've noticed that the smoking gun lives in different panes for different bugs. After the third, you can classify a failure in under a minute without scrolling around aimlessly.

When you come back to this lab a week later and regenerate the traces, you can walk all three in ten minutes. That's muscle memory. That's the goal.

## Additional Reading

- [Reading a Trace](reading-a-trace.md) — the lesson on what each pane means.
- [Flaky-Test Triage: When Retries Are Lying to You](flaky-test-triage.md) — the four-bucket taxonomy you're classifying into.
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md) — where the four-field diagnosis you're writing becomes the structured artifact an agent actually uses.
