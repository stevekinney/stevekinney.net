---
title: 'Flaky-Test Triage: When Retries Are Lying to You'
description: A four-bucket diagnostic framework for flaky tests, and the rule that prevents agents from bumping `retries` every time they see a red build.
modified: 2026-04-14
date: 2026-04-11
---

Shelf's search test passes nine times out of ten on my laptop and one time out of ten in CI. The honest thing is to admit I don't know why. The dishonest thing is to bump `retries` from 2 to 3 and call it Tuesday.

This lesson is about that second move — the one every agent I've worked with reaches for when a test flakes. Retries are a painkiller. They mask the symptom, let the underlying bug grow, and eventually the tumor is big enough to take down the whole suite. Everything here is a substitute for that reflex.

## Four causes of flake, not one

Flaky tests have personality. Once you've seen a few, you learn to recognize which family a given flake belongs to before you even open the trace. There are four families, and each one has a different fix. If you can classify the flake, you already know what to do.

### 1. Timing race

**Symptom**: the test asserts something _before_ the network request that would have made the assertion pass. Sometimes the request is fast and the assertion coincidentally wins. Sometimes the request is slow and the assertion fails.

**Example**: the rate-book test clicks "Save rating" and immediately asserts the rating text is visible, without waiting for the `PATCH /api/shelf/:id` response. On a fast machine the PATCH resolves before the assertion runs. On a slow machine, no.

**Fix**: use `page.waitForResponse` on the specific request, or let Playwright's auto-retrying assertions do the waiting for you. Never bump the assertion's timeout as a first response — that just makes the race less visible, not less real.

Link back: this is the exact failure mode [The Waiting Story](the-waiting-story.md) warned you about. Read that lesson if you want the full treatment.

### 2. Shared state leak

**Symptom**: test N passes in isolation and fails when test N−1 runs first. The failure is about some book, some user, or some setting that test N−1 left behind. Run the full suite and it's flaky. Run the single test and it's fine.

**Example**: test N−1 adds Annihilation to the shelf and doesn't clean up. Test N counts shelf entries and expects two, because two is what `resetShelfContent()` shelves. It finds three. Fail.

**Fix**: put state management in a _fixture with teardown_, not in `beforeEach` discipline. The [Fixtures lesson](fixtures-worker-scoped-test-scoped.md) is the prerequisite here. The rule is that mutating fixtures have a teardown half that's awaited, and the teardown is what keeps the leak from reaching the next test.

### 3. Order-dependent rendering or locator ambiguity

**Symptom**: a locator resolves to the wrong element, either because a modal or toast is transiently stacked over the page, or because the same role-plus-name combination exists on multiple elements at once. Playwright throws a strict-mode violation or silently clicks the wrong thing.

**Example**: the shelf renders one "Rate this book" button per shelved book. `page.getByRole('button', { name: 'Rate this book' })` matches both of them. Strict-mode violation.

**Fix**: scope the locator to a region. `page.getByRole('article', { name: /Station Eleven/ }).getByRole('button', { name: 'Rate this book' })` resolves to exactly one button. The [Locators lesson](locators-and-the-accessibility-hierarchy.md) calls this "region-scoped locators" and it's the single most reliable fix for this class of flake.

### 4. Config / auth mismatch

**Symptom**: the test runs under the wrong Playwright project, misses its storage state, hits a server that wasn't seeded, or depends on `setup` without declaring it. The failure looks like "element missing" or "redirected to /login." The test body is fine — the wiring is broken.

**Example**: a test sitting in `tests/rate-book.spec.ts` but accidentally run under the `public` project instead of `authenticated`. It has no storage state. It navigates to `/shelf` and the server redirects it to `/login` before a single assertion runs.

**Fix**: check the project, check the `dependencies: ['setup']` line, check the `storageState` in the project config. The fix is the _wiring_, not the test body. Link back: [Playwright Projects](playwright-projects.md) and [Storage State Authentication](storage-state-authentication.md).

## Triage workflow

When a test flakes, run it. Run it ten times.

```bash
for i in {1..10}; do npm run test -- --grep "your test name" || break; done
```

Count the failures.

- **0 out of 10**: not flaky on your machine. Probably CI-only. Suspect timing (bucket 1) or worker isolation (bucket 2). Run the same test on CI a few times and see if it fails there.
- **1 to 3 out of 10**: real flake. Open the trace from a failing run and classify into one of the four buckets. Apply the corresponding fix.
- **4 or more out of 10**: not flaky — broken. Stop calling it flaky. It's a test that fails half the time because something is actually wrong with the test or with the code it's testing. Treat it like a bug report, not a flake.
- **10 out of 10**: something is wrong with your setup. You're probably not even running the test you think you're running.

The threshold between "real flake" and "broken" is the part that matters. Agents default to calling everything "flaky" because "flaky" lets them bump `retries` and move on. A 40% failure rate is not a flake. It's a test that needs to be fixed or deleted.

> [!WARNING] The agent rule
> Before touching flaky-test code, an agent must (a) read a trace from a failing run, (b) classify the failure into one of the four buckets above, and (c) propose a _locator / fixture / wait / project-config_ fix, not a retry bump. The next lesson, [Reading a Trace](reading-a-trace.md), is how step (a) works in practice.

## Quarantine without hiding

Sometimes you can't fix the flake today. The feature is shipping, the test is slowing the team down, and you need it out of the way. The move is not to delete the test. The move is not to bump the timeout. The move is:

```ts
test.fixme('adding a search result through the UI lands it on the shelf', async ({ page }) => {
  test.info().annotations.push({
    type: 'issue',
    description:
      'https://github.com/stevekinney/shelf-life/issues/TBD — HAR replay races the network',
  });
  // ... rest of the test unchanged
});
```

`test.fixme` marks the test as "expected to fail." Playwright still runs it, still captures the trace, and _fails the run if the test starts passing_. That last part is the critical feature: the moment the flaky test is accidentally fixed (by you or by someone else touching related code), `test.fixme` tells you so you can delete the quarantine marker. Nothing hides.

Compare with `test.skip`, which just doesn't run the test. Skip hides. `fixme` announces.

The annotation is not optional — it's how future you remembers why this test is in quarantine. "TBD" in the URL is fine for a first pass, as long as you circle back and file the real issue before the end of the day.

## What retries are actually for

Retries exist for one reason: protecting `main` from _environmental_ flakes. DNS, cold starts, browser install races, web-server startup jitter. The kind of thing where the failure is in the infrastructure around the test, not in the test itself.

The standard CI pattern is `retries: process.env.CI ? 2 : 0`. Treat 2 as a ceiling. Don't raise it. Zero in local runs is not negotiable: a test that fails once locally is information, and you want to see that information, not hide it under a second attempt.

The specific agent failure mode I want to head off: "this test flaked, let me set `retries: 5`." No. If 2 retries isn't enough, you are not dealing with an environmental flake. You are dealing with one of the four buckets above, and the fix lives there.

## The agent rules

```markdown
## Flaky-test triage

- Never raise `retries` above `process.env.CI ? 2 : 0` to "fix" a flaky test. Retries are for environmental flakes only.
- When a test flakes, run it 10x locally first. 0/10 means CI-only. 1–3/10 means real flake, classify and fix. 4+/10 means it's broken, not flaky.
- Classify every flake into one of four buckets: timing race, shared state leak, order-dependent rendering, config/auth mismatch. Each has a specific fix.
- Before proposing a fix, open the trace from a failing run and cite specific evidence (DOM snapshot at failure, network timing, console output).
- Quarantine with `test.fixme` plus an issue annotation, never with `test.skip` and never with a retry bump. `fixme` stays loud; skip hides.
```

## The thing to remember

"Flaky" is not a diagnosis. It's the word you use _before_ you've figured out which of the four buckets the failure belongs to. The whole point of this lesson is that every flake has a cause, each cause has a fix, and bumping `retries` isn't one of them. When you catch yourself reaching for the retry dial, stop — open the trace instead. The next lesson is how to read it.

## Additional Reading

- [Reading a Trace](reading-a-trace.md) — the next lesson, which is how step 3 of the triage workflow actually works.
- [The Waiting Story](the-waiting-story.md) — the timing-race bucket's home lesson.
- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md) — the shared-state-leak bucket's home lesson.
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md) — the locator-ambiguity bucket's home lesson.
