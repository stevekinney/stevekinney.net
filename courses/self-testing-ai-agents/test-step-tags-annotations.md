---
title: 'test.step, Tags, and Annotations'
description: Three Playwright features that agents ignore, and that turn out to be the difference between a failing test you can debug and one you have to reverse-engineer.
modified: 2026-04-11
date: 2026-04-11
---

A failing test that says `Error: expected 5, got 0` is a bug report written by someone who doesn't want to be helpful. It tells you what went wrong and nothing about where, why, or under what conditions. The failing test was _right there_, watching it all happen, and all it could think to say was "expected 5, got 0."

`test.step` is how you write failing tests that read like incident reports. Tags are how you slice a suite by _intent_ instead of by file. Annotations are how you link a test to the issue that made it exist. None of them change the behavior of a test — they change what the test says when it fails, and in a world where an agent is reading the failure dossier to decide what to fix, that difference is everything.

## `test.step` is a documentation format your tools read

Wrap a group of actions in `test.step(label, fn)` and that group becomes a collapsible section in the trace viewer, a line in the `list` reporter, and a field in the HTML report. It also becomes part of the error message when the test fails. The label you write is the label the agent reads.

Here's the rate-book test with and without steps, so you can see what the failure looks like.

Without steps:

```ts
test('user can rate Station Eleven', async ({ page, request }) => {
  await page.goto('/shelf');
  const stationEleven = page.getByRole('article', { name: /Station Eleven/ });
  await stationEleven.getByRole('button', { name: 'Rate this book' }).click();
  const dialog = page.getByRole('dialog', { name: /Rate Station Eleven/ });
  await dialog.getByRole('radio', { name: '4 stars' }).check();
  await dialog.getByRole('button', { name: 'Save rating' }).click();
  await expect(stationEleven.getByText('Rated: 4/5')).toBeVisible();
});
```

When that fails, the error message is a stack trace pointing at whichever line `expect` blew up on. The agent reading the dossier has to work backwards: the test is called "user can rate Station Eleven," the failing assertion is on `Rated: 4/5`, so _something_ in the chain from navigate-to-click-to-submit-to-persist broke. Good luck.

With steps:

```ts
test('user can rate Station Eleven', async ({ page, request }) => {
  await test.step('open the shelf', async () => {
    await page.goto('/shelf');
  });

  await test.step('open the rate-book dialog for Station Eleven', async () => {
    const stationEleven = page.getByRole('article', { name: /Station Eleven/ });
    await stationEleven.getByRole('button', { name: 'Rate this book' }).click();
  });

  await test.step('submit 4 stars', async () => {
    const dialog = page.getByRole('dialog', { name: /Rate Station Eleven/ });
    await dialog.getByRole('radio', { name: '4 stars' }).check();
    await dialog.getByRole('button', { name: 'Save rating' }).click();
  });

  await test.step('verify the rating persists on the shelf', async () => {
    const stationEleven = page.getByRole('article', { name: /Station Eleven/ });
    await expect(stationEleven.getByText('Rated: 4/5')).toBeVisible();
  });
});
```

Now the failure says `Error in step: verify the rating persists on the shelf — expected "Rated: 4/5" to be visible`. The agent reading the dossier knows exactly which phase failed. The trace viewer shows the steps as foldable sections. The HTML report lists them as subsections under the test. The JSON reporter emits them as structured data the failure-dossier summarizer can parse.

> [!NOTE] Steps nest
> You can call `test.step` inside another `test.step`, and the nesting shows up in all the reports. Use this sparingly — two levels deep is usually the right cap. If you need three, the test is probably doing too much.

The heuristic I use: every top-level user action gets a step. Navigate, click-through-a-flow, assert-outcome. Four steps for a four-act test. Not one step per line.

## Tags are how you slice a suite by intent

Every `test()` call can take a `tag` option:

```ts
test('user can rate Station Eleven', { tag: ['@critical', '@authenticated'] }, async ({ page }) => {
  // ...
});
```

Combine with `--grep @critical` to run just the tagged subset:

```bash
npx playwright test --grep @critical
```

This is how you shard a suite by _purpose_ instead of by file. `@critical` is the handful of tests you'd run on every PR; `@slow` is the expensive ones you defer to nightly; `@flaky-quarantine` is the ones you're not ready to delete but shouldn't block the pipeline. None of that maps cleanly onto file boundaries, because the definition of "critical" changes as the product does.

> [!WARNING] Don't use `@smoke` in Shelf
> Shelf already defines _smoke_ at the file-and-project level, via `playwright.smoke.config.ts` and the `firefox-smoke` / `webkit-smoke` projects in the root config. If you also start tagging tests `@smoke`, you'll end up with two competing definitions of the same word. The canonical tag vocabulary for this course is `@critical`, `@slow`, and `@flaky-quarantine`. `@smoke` stays out of the tag system.

Tags are supplemental metadata, not the source of truth. The file-and-project structure is where you decide _which_ tests run; tags are how you decide which subset of _those_ tests to run right now.

## Annotations are for linking to issues, not for in-test comments

```ts
test('search handles the empty-results case', async ({ page }) => {
  test.info().annotations.push({
    type: 'issue',
    description: 'https://github.com/stevekinney/shelf-life/issues/TBD',
  });
  // ...
});
```

Annotations show up in the HTML report and the JSON reporter output. Use them for:

- Linking a test to the issue it was written for.
- Linking a test to the incident it regressed against.
- Flagging a test as known-flaky with a pointer to the quarantine discussion.
- Recording environment assumptions (`{ type: 'requires', description: 'ENABLE_TEST_SEED=true' }`).

Don't use annotations as a substitute for comments. They're structured data meant for tooling, not prose meant for the next reader. A comment above the test is clearer than an annotation for "this tests the empty-results case."

## `expect.soft` is the companion to `test.step`

One more tool, and it's the one that pairs with steps to turn a failing test into a useful failure report. `expect.soft(value).toBe(...)` does everything `expect` does _except_ bail on the first failure. The test still fails at the end, but every soft assertion that didn't pass gets reported, not just the first one.

```ts
await test.step('verify all four result fields render', async () => {
  const result = page.getByRole('article', { name: /Piranesi/ });
  await expect.soft(result.getByRole('heading')).toHaveText('Piranesi');
  await expect.soft(result.getByText('Susanna Clarke')).toBeVisible();
  await expect.soft(result.getByText(/house of infinite halls/)).toBeVisible();
  await expect.soft(result.getByRole('button', { name: 'Add to shelf' })).toBeVisible();
});
```

If the title is wrong, the author is missing, and the button is unlabeled, _all three_ failures show up in the report. A plain `expect` would bail on the title and you'd never find out about the other two until the next run.

Use soft assertions when the step is verifying a list of things that _should all_ be true after an action. Don't use them for preconditions — you want those to fail fast.

## How an agent uses this

An agent reading a [failure dossier](failure-dossiers-what-agents-actually-need-from-a-red-build.md) gets `Step: verify the rating persists on the shelf — expected "Rated: 4/5" to be visible` instead of a stack trace in a nameless test. That line is the difference between the agent spending its first 90 seconds _figuring out what the test was trying to do_ and the agent spending its first 90 seconds _figuring out why the test failed_. `test.step` is upstream of every dossier that reads cleanly.

The dossier summarizer that already ships in Shelf reads steps out of the Playwright JSON reporter output. Nothing else has to change — once the test file has steps, the dossier has them too.

## The agent rules

```markdown
## test.step, tags, annotations

- Every top-level user action in a test gets a `test.step('...', async () => { ... })` wrapper with a human-readable label.
- Tag every test with at least one of `@critical` / `@slow` / `@flaky-quarantine`. Never tag a test `@smoke` in Shelf — that term is reserved for the file-based smoke config.
- Use `test.info().annotations.push(...)` to link a test to its issue, incident, or known-flake record. Do not use annotations as a substitute for comments.
- Use `expect.soft` when a single step is verifying a list of things that should all be true. Use plain `expect` for preconditions.
- Keep `test.step` nesting to two levels deep at most. If you need three, the test is doing too much.
```

## The thing to remember

A test that fails with `expected 5, got 0` is a test that doesn't want to help you. Everything in this lesson is about writing tests that _do_ want to help you — and, more importantly, tests that want to help the agent reading the dossier. Steps name the phases. Tags slice the suite. Annotations link out to context. Soft assertions collect all the failures instead of bailing on the first. Four tools, all additive, none of them change what your test is _doing_. They change what your test is _saying_ when it fails, and that's the entire game.

## Additional Reading

- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md) — the lesson this one hands off into. Once your tests have steps, the dossier reads them automatically.
- [Reading a Trace](reading-a-trace.md) — the trace viewer displays `test.step` blocks as foldable sections, which is the fastest way to locate a failure in a long flow.
- [Playwright Projects](playwright-projects.md) — the lesson on file-and-project-level organization, which is the layer below tags. Tags supplement projects; they don't replace them.
