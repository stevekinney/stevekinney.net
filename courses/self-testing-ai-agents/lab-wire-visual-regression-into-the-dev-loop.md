---
title: 'Lab: Wire Visual Regression Into the Dev Loop'
description: Set up Playwright's screenshot gate on Shelf, commit baselines, and watch an agent respond to a diff.
modified: 2026-04-09
date: 2026-04-06
---

Short lab. Two halves. The first half wires the screenshot gate into Shelf. The second half deliberately breaks a component and watches the loop fire.

## Setup

Make sure you're on the hardened Shelf from the Module 3 lab. You'll need storage-state authentication and seeding in place. Visual regression without those is a nightmare.

> [!NOTE]
> **Third dry run validation**: The current Shelf starter keeps `workers: 1` in `playwright.config.ts` because the local app still uses one shared SQLite file. The visual-regression lab still works exactly the same way; it just uses the current single-worker config instead of assuming broad browser parallelism.

## Part one: wire the screenshot gate

Create or expand `tests/end-to-end/visual.spec.ts`. In the current Shelf starter, the cleanest setup is to keep the design-system screenshot anonymous and run the authenticated screenshots under a dedicated visual-reader storage state so they do not share Alice's mutable shelf data with the rate-book test.

```ts
import { expect, test } from '@playwright/test';
import { emptyStorageState, marcoAuthenticationFile } from './storage-state';

test.describe('visual regression', () => {
  test.use({ storageState: marcoAuthenticationFile });

  test.beforeEach(async ({ request }) => {
    await request.post('/api/shelf', {
      data: { openLibraryId: 'OL1', status: 'reading' },
    });
    await request.post('/api/shelf', {
      data: { openLibraryId: 'OL2', status: 'to-read' },
    });
    await request.post('/api/shelf', {
      data: { openLibraryId: 'OL5', status: 'finished' },
    });
    await request.post('/api/shelf/OL1/rating', {
      data: { rating: 4 },
    });
    await request.post('/api/shelf/OL5/rating', {
      data: { rating: 5 },
    });
  });

  test('shelf page', async ({ page }) => {
    await page.goto('/shelf');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: "Marco's Shelf" })).toBeVisible();
    await expect(page).toHaveScreenshot('shelf-page.png', { fullPage: true });
  });

  test('book detail page', async ({ page }) => {
    await page.goto('/books/OL1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Station Eleven' })).toBeVisible();
    await expect(page).toHaveScreenshot('book-detail.png', {
      fullPage: true,
      mask: [page.getByTestId('last-updated')],
    });
  });
});

test.describe('public visual regression', () => {
  test.use({ storageState: emptyStorageState });

  test('design system', async ({ page }) => {
    await page.goto('/design-system');
    await expect(page.getByRole('heading', { name: /Shelf design system/i })).toBeVisible();
    await expect(page).toHaveScreenshot('design-system.png', { fullPage: true });
  });
});
```

Update `playwright.config.ts` to disable animations and hide carets:

```ts
expect: {
  toHaveScreenshot: {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    maxDiffPixelRatio: 0.01,
  },
},
```

Generate the baselines:

```sh
bun playwright test visual.spec.ts --update-snapshots
```

For the npm-based Shelf starter, the equivalent local command is:

```sh
npx playwright test tests/end-to-end/visual.spec.ts --project=chromium --update-snapshots
```

Commit the baseline images. They should be in `tests/end-to-end/visual.spec.ts-snapshots/`. Yes, you commit PNGs to git. That's the deal.

If you are documenting the diff for course material, try the Playwright MCP first. In the current Codex desktop environment it may fail with `ENOENT: mkdir '/.playwright-mcp'`. If that happens, fall back to local Playwright screenshots and say so explicitly in the lesson update instead of pretending the MCP worked.

## Part one acceptance criteria

- [ ] `tests/end-to-end/visual.spec.ts` exists and contains at least three `toHaveScreenshot` assertions.
- [ ] `playwright.config.ts` sets `animations: 'disabled'`, `caret: 'hide'`, and `scale: 'css'` under `expect.toHaveScreenshot`.
- [ ] `npx playwright test tests/end-to-end/visual.spec.ts --project=chromium` passes on a clean run (no diffs).
- [ ] Running the same test five times in a row produces zero false positives: `for i in {1..5}; do npx playwright test tests/end-to-end/visual.spec.ts --project=chromium || break; done` exits zero every iteration.
- [ ] The committed baseline files exist at `tests/end-to-end/visual.spec.ts-snapshots/` (verify with `ls`—all three PNGs should be present).
- [ ] `.gitignore` does not ignore snapshot PNGs (`grep -i snapshot .gitignore` returns nothing obviously conflicting).

## The snapshot target in Shelf

Once the suite is wired correctly, the shelf-page baseline should look something like this:

![The Shelf visual baseline rendered from the committed Playwright snapshot](./assets/lab-visual-regression-shelf-page.png)

## Part two: break something, and watch it fire

Now we're going to simulate the loop. Open `src/lib/components/Button.svelte` (or wherever Shelf's button component lives). Change the padding:

```svelte
<!-- before -->
<button class="px-4 py-2 ...">
<!-- after -->
<button class="px-6 py-3 ...">
```

Run the screenshot test again:

```sh
npx playwright test tests/end-to-end/visual.spec.ts --project=chromium
```

It fails. Open the HTML report:

```sh
npx playwright show-report
```

Find the failing test, look at the three-panel view (baseline, actual, diff). The diff image should clearly show the buttons in the screenshots have changed size.

Now simulate the agent loop. You have two options depending on your setup:

**Option A—manual.** Copy the diff image path into your Claude Code conversation and ask: _"The visual regression test failed. Here's the diff. What changed, and is the change intentional?"_ Let the agent look at the image and describe what it sees.

**Option B—hooked.** If you're using Claude Code with a hook that auto-attaches test failures, just run the test and let the hook fire. (We'll wire this kind of hook properly in Module 9. For today, manual is fine.)

Either way, notice what the agent says. It should identify that the buttons got bigger, guess correctly whether the change cascaded to other layout (on Shelf, it probably pushed some cards wider), and propose either reverting the change or updating the baseline.

When the padding experiment lands correctly, the shelf-page diff should look like this kind of "everything got roomier" change:

![The shelf-page visual diff after widening button padding](./assets/lab-visual-regression-shelf-page-diff.png)

## Part two acceptance criteria

- [ ] The button padding change produces a failing `toHaveScreenshot` assertion.
- [ ] `playwright-report/` contains a diff image for the failing test.
- [ ] You showed the diff to your agent and got a response that correctly identifies what visually changed.
- [ ] You either: (a) reverted the button change and re-ran to green, or (b) ran `--update-snapshots` as an intentional baseline update and committed the new baselines as a separate commit.
- [ ] Your git history shows the experiment as discrete commits so the sequence is legible later.

## Stretch goals

- Add a `design-system` route that exercises every component in every state, if Shelf doesn't already have one. Add a single screenshot test for the whole route. Consider this your poor-person's [Chromatic](https://www.chromatic.com/).
- Set up a second Playwright project for a different viewport (e.g., `iPhone 13` from Playwright's device presets) and regenerate baselines for it. Now your visual regression covers mobile too.
- Try the same flow with [Chromatic](https://www.chromatic.com/) instead of built-in snapshots, just to see the difference in review UX. Don't commit the Chromatic setup permanently unless the whole team is on board—the built-in is the long-term pattern for this workshop.
- Intentionally introduce a subtle change (e.g., change a font weight from 500 to 600) and see if the `maxDiffPixelRatio: 0.01` tolerance catches it. Tune the tolerance if needed.

## The one thing to remember

A failed screenshot test is a conversation opener. The diff image is the message. Once the agent can read the diff, the loop closes itself.

## Additional Reading

- [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md)
- [Runtime Probes in the Development Loop](runtime-probes-in-the-development-loop.md)
