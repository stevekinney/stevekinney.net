---
title: 'Lab: Wire Accessibility Checks Into Shelf'
description: Add an automated accessibility scan for critical routes, document the manual keyboard checks, and make accessibility failures part of the loop.
modified: 2026-04-12
date: 2026-04-06
---

This is where accessibility stops being a nice sentiment and becomes a real gate.

You're going to add an automated scan to Shelf's end-to-end suite, then pair it with a tiny manual checklist for the cases the scan cannot prove. I like this lab because it is small, mechanical, and immediately useful. Also, it tends to expose UI problems you did not realize you already had. Fun surprise.

> [!NOTE] Prerequisite
> Complete [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md) first. This lab assumes you already buy the split between automated violations and manual-only checks.

## The task

Add an automated accessibility smoke test for Shelf's critical routes and document the manual keyboard checks the automation cannot cover.

## Step 1: install the Playwright integration

Install the [axe-core Playwright integration](https://www.deque.com/axe/core-documentation/):

```sh
npm install -D @axe-core/playwright
```

If you've already added the package in an earlier pass, confirm the version and move on. Do not reinstall the world for sport.

## Step 2: add a dedicated accessibility spec

Create `tests/end-to-end/accessibility.spec.ts`.

Start with the highest-signal routes in Shelf:

- `/login`
- `/shelf`
- any modal, drawer, or form-heavy route you added during the workshop

Start from this exact pattern:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('shelf page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/shelf');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  expect(results.violations).toEqual([]);
});
```

Keep the scope intentionally small at first. I would rather have three stable route-level accessibility checks than twenty noisy ones nobody trusts.

## Step 3: handle known exceptions honestly

If the scan returns a real violation, fix the markup.

If you hit a legitimate exception:

- scope it narrowly with an `exclude` or rule-specific suppression
- leave a code comment explaining why
- add the same reason to the task summary or commit message

Do **not** disable large classes of rules globally because one component was annoying.

## Step 4: add the manual keyboard checklist

Create `docs/accessibility-smoke-checklist.md` in the Shelf repository.

Keep it short. Three to five checks is enough:

- Can I reach every interactive control on `/shelf` with `Tab` and `Shift+Tab`?
- If a modal opens, does focus move into it and return when it closes?
- Are validation errors exposed in text, not only color?
- Can I submit the primary forms without touching a mouse?

This file exists so the agent and the humans both know what the automated scan did _not_ prove.

## Step 5: make the loop easy to run

If your Shelf repo has a dedicated end-to-end script already, keep the accessibility spec inside that suite. Otherwise, add an explicit script:

```json
{
  "scripts": {
    "test:accessibility": "playwright test tests/end-to-end/accessibility.spec.ts"
  }
}
```

The key is that the agent has a named command to run. Hidden rituals do not make good loops.

> [!NOTE] Shelf folds accessibility into `test:e2e`
> The Shelf starter does **not** ship a standalone `test:accessibility` script. Instead, `accessibility.spec.ts` is matched by the `authenticated` project's `testMatch`, so it runs on every `npm run test:e2e` invocation—alongside the rate-book, search, and visual specs. That's the preferred pattern once the spec is stable: one gate, one command, no side channels. If you're new to the project and haven't built trust in the spec yet, keep the standalone script while you iterate, then fold it in once it stops surprising you.

## Acceptance criteria

- [ ] `@axe-core/playwright` is installed in the Shelf repository
- [ ] `tests/end-to-end/accessibility.spec.ts` exists
- [ ] The spec covers at least two critical Shelf routes
- [ ] The accessibility scan fails the test when `violations` are present
- [ ] Any suppression is narrowly scoped and documented in code
- [ ] `docs/accessibility-smoke-checklist.md` exists with the manual keyboard checks
- [ ] There is a named command for running the accessibility scan, either standalone or as part of `npm run test:e2e`
- [ ] Running the accessibility spec locally exits zero on the current green state

## Troubleshooting

- If the scan fails on contrast or landmark issues you did not expect, believe the result first and inspect the markup second.
- If authenticated routes are involved, reuse the storage-state setup from [Storage State Authentication](storage-state-authentication.md) instead of inventing a second login path.
- If the accessibility check is flaky, it is usually because the route was not actually stable yet. Fix the waiting story before blaming the scan.

## Stretch goals

- Add a separate accessibility smoke test for your design-system route if Shelf exposes one.
- Add an npm script that runs only the accessibility spec plus the manual checklist reminder.
- Add one deliberate bad ARIA attribute, watch the test fail, then fix it so you trust the loop.

## The one thing to remember

Accessibility scans are not there to make you feel virtuous. They are there to make regressions loud. Keep the scope small, the results trusted, and the manual checklist honest.

## Additional Reading

- [Solution](wire-accessibility-checks-into-shelf-solution.md)
- [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md)
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
