---
title: 'Lab: Tag and Step-Annotate the Shelf Suite'
description: Take two existing Shelf tests and rewrite them to produce failure messages an agent can actually use.
modified: 2026-04-14
date: 2026-04-11
---

Two of Shelf's specs — the starter's `tests/smoke.spec.ts` and the `tests/rate-book.spec.ts` you built in the previous lab — work fine. They pass every time, they hit the right endpoints, and they verify the right outcomes. They also fail like they're punishing you when they fail. No steps, no tags, no annotations, nothing that helps a dossier summarizer turn a red build into something an agent can fix.

> [!NOTE] Prerequisite: the rate-book hardening lab
> `tests/rate-book.spec.ts` is produced by the [harden-the-flaky-rate-book-test lab](lab-harden-the-flaky-rate-book-test.md), not by the Shelf starter. Run this lab after completing the harden-the-flaky-rate-book-test lab; otherwise, scope the work to `tests/smoke.spec.ts` only and come back for the rate-book pieces once that file exists.

Your job in this lab is to retrofit both specs with `test.step`, tag them correctly, add at least one annotation, and introduce one `expect.soft` assertion where it genuinely helps. Then prove the result by running `--grep @critical` and watching the subset you expect to show up.

## The starting point

Open `tests/smoke.spec.ts` and (assuming you've completed the rate-book hardening lab) `tests/rate-book.spec.ts`. Both files pass today. Neither file has any of the four things the lesson covered.

Specifically:

- No `test.step` wrappers anywhere. Every test is a flat sequence of `page.goto`, locator chains, and assertions.
- No `tag` on any test signature.
- No `test.info().annotations.push(...)` calls.
- No `expect.soft` — every assertion bails on the first failure.

Count what's missing. I get four things per test. Your job is to put them back.

> [!NOTE] Non-destructive
> You're editing production specs this time. Run the full `npm run test` after each pass to confirm the suite is still green. The whole point of this lab is to land in `main` without breaking anything.

## Your job

1. Wrap every top-level user action in each test with a `test.step('...', async () => { ... })`. The label has to be readable as a line in a CI log — "open the shelf," "submit 4 stars," "verify the rating persists via API," not "step 1" or "do the thing."

2. Tag every test with at least one of `@critical`, `@slow`, or `@flaky-quarantine`. The rate-book test (from the earlier rate-book hardening lab) is `@critical`. At least one of the smoke tests should be `@critical` too. Defend the rest.

3. Add an annotation to the rate-book test linking to a fake GitHub issue URL for that test's historical flake. Use `type: 'issue'`.

4. Find one place where the assertion is checking _a list of things that should all be true_ after an action, and rewrite that block to use `expect.soft`. The smoke test's navigation-link assertions are the natural candidate.

5. Run `npx playwright test --grep @critical` and confirm only the critical subset runs. Then run the full `npm run test` and confirm the suite is still green.

## Acceptance criteria

From the Shelf repo root:

```bash
npm run test
```

Must still pass, same as before. You're not changing behavior, you're changing the _story_ each test tells.

```bash
npx playwright test --grep @critical
```

Must run a strict subset of tests (at least the rate-book test and whichever smoke tests you marked critical). Zero tests filtered out of the set should have `@critical` in their tag array.

```bash
rg "test\.step\(" tests/smoke.spec.ts tests/rate-book.spec.ts
```

Must return at least two hits per test. (If you haven't landed the rate-book hardening lab yet, scope these checks to `tests/smoke.spec.ts` only — `tests/rate-book.spec.ts` is produced by that earlier lab.)

```bash
rg "annotations\.push" tests/rate-book.spec.ts
```

Must return at least one hit. (Again, this assumes `tests/rate-book.spec.ts` exists from the earlier rate-book hardening lab.)

```bash
rg "expect\.soft" tests/smoke.spec.ts
```

Must return at least one hit.

## Suggested order of attack

Start with the rate-book test because it's simpler. One test, one flow, four natural steps: open the shelf, open the rate-book dialog, submit the rating, verify the persisted rating. Wrap each in `test.step`, run the suite, commit.

Tag it `@critical` next. That's one line on the test signature. Run `--grep @critical` and confirm it shows up. Commit.

Move to the smoke spec. Tag the homepage smoke as `@critical` — it's the public face of the starter. Tag the protected-route redirect smoke `@critical` too unless you can defend it as `@slow` for some reason. Add steps. The "verify the public navigation" block in the first test is a natural step boundary because it has a clear intent.

Now the annotation. Put it on the rate-book test and add:

```ts
test.info().annotations.push({
  type: 'issue',
  description: 'https://github.com/stevekinney/shelf-life/issues/TBD',
});
```

The URL can be fake. The shape has to be real.

Finally, the soft assertion. The homepage smoke already checks several navigation links in a row. Rewrite that block to `expect.soft` so a failure reports every mismatched link instead of bailing on the first one. Run the suite. Commit.

## Stretch

Write a tiny custom reporter snippet that prints only the `test.step` names for each failing test, suitable for pasting into the failure dossier. It's ~30 lines of TypeScript:

```ts
// tests/reporters/step-reporter.ts
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class StepReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'failed') return;
    process.stderr.write(`\n[${test.title}]\n`);
    for (const step of result.steps) {
      process.stderr.write(`  - ${step.title} (${step.duration}ms)\n`);
    }
  }
}

export default StepReporter;
```

Wire it into a temporary lab-only Playwright config, or add it to the main config while you experiment, and run the lab slice to see it in action.

## What success looks like

You run the rate-book test, deliberately break one assertion (change `4` to `5` in the rating step), and the failure message now says which step blew up, which argument mismatched, and — via the annotation — which issue to link the incident to. The dossier summarizer picks up all of it for free. No extra plumbing.

Then you un-break the test, run the full suite, and commit.

## Additional Reading

- [test.step, Tags, and Annotations](test-step-tags-annotations.md) — the lesson this lab exercises.
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md) — where the `test.step` output gets picked up for the dossier.
- [Reading a Trace](reading-a-trace.md) — the trace viewer shows `test.step` blocks as foldable sections, which is the fastest way to see what the retrofitted test now looks like under the hood.
