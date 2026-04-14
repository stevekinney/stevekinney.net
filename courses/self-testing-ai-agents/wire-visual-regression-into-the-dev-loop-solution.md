---
title: 'Wire Visual Regression Into the Dev Loop: Solution'
description: Walkthrough of Shelf's visual regression setup, from screenshot config through the break-and-detect cycle.
modified: 2026-04-14
date: 2026-04-10
---

Two spec files, four config lines, and a committed PNG. That's the entire visual regression setup. The hard part isn't the code—it's understanding why each piece exists and what happens when you skip it.

## The shipped files

### `tests/end-to-end/visual.spec.ts`

This file covers public pages that don't need authentication.

```ts
import { expect, test } from './fixtures';

test('design system matches the starter visual baseline', async ({ page }) => {
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('design-system.png', { fullPage: true });
});
```

Three lines of real work. Navigate, wait for the page to be ready, take the screenshot. Let's talk about each one.

`page.goto('/design-system')` targets the curated component gallery. This is the best page in the app for visual regression because it exercises every component in a controlled layout. One screenshot catches button styles, card layouts, typography, color tokens—everything that matters visually.

`await expect(page.getByRole('heading', { level: 1 })).toBeVisible()` is the stability gate. You need _something_ on the page to be confirmed-visible before you take the screenshot. Without this, you occasionally capture a blank page mid-render. The heading works because it's one of the first elements to paint, and if the heading isn't there, the page didn't load.

`toHaveScreenshot('design-system.png', { fullPage: true })` does two things. The first time you run it, it creates the baseline PNG. Every subsequent run, it compares the current page against that baseline pixel-by-pixel (within the configured tolerance). `fullPage: true` captures the entire scrollable page, not just the viewport.

The explicit filename (`'design-system.png'`) is intentional. Without it, Playwright auto-generates a name from the test title, which works but produces filenames like `design-system-matches-the-starter-visual-baseline-1-chromium-darwin.png`. The explicit name is easier to find in the snapshot directory and easier to reason about in diffs.

### `tests/end-to-end/visual-authenticated.spec.ts`

This file covers pages that require a logged-in user and seeded data.

```ts
import { expect, test } from './fixtures';
import { resetShelfContent } from './helpers/seed';

test.beforeEach(async () => {
  await resetShelfContent();
});

test('shelf page matches the seeded visual baseline', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('article', { name: /Station Eleven/ })).toBeVisible();
  await expect(page).toHaveScreenshot('shelf-page.png', { fullPage: true });
});
```

Two differences from the public version. First: `resetShelfContent` in `beforeEach`. Visual regression without deterministic data is a nightmare—every run produces a different shelf, which means every run produces a different screenshot, which means every run fails. The seed ensures Station Eleven is always there, always in the same position, always unrated.

Second: the extra `toBeVisible` check on the Station Eleven article. The heading tells you the page loaded. The article tells you the _data_ loaded. If you only wait for the heading, you sometimes capture the page in a state where the heading is painted but the book cards haven't rendered yet. That produces a false positive on the very first run and a false negative on every subsequent run. Wait for the data.

## The config

Four lines in `playwright.config.ts` under `expect.toHaveScreenshot`:

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

Each one solves a specific false-positive scenario.

**`animations: 'disabled'`** freezes all CSS animations and transitions before taking the screenshot. Without this, a spinning loader or a fade-in transition can produce different frames on different runs. The screenshot captures the _end state_, not a random mid-animation frame.

**`caret: 'hide'`** hides the blinking text cursor. If any input on the page has focus, the cursor blink produces a 1-pixel difference every other run. Hiding it eliminates that noise entirely.

**`scale: 'css'`** normalizes the screenshot to CSS pixels instead of device pixels. Without this, a Retina display produces a 2x image while CI (usually running headless on a non-Retina machine) produces a 1x image. The baselines won't match. `scale: 'css'` ensures both environments produce the same resolution.

**`maxDiffPixelRatio: 0.01`** allows up to 1% of pixels to differ before the test fails. This is the tolerance knob. Zero tolerance sounds rigorous, but in practice it fails on sub-pixel anti-aliasing differences between OS versions. 1% absorbs that noise while still catching any real visual change. If you find it's too loose (missing real changes) or too tight (flaking on font rendering), adjust it—but 0.01 is a solid starting point.

## Generating and committing baselines

The first run creates the baseline PNGs:

```bash
npm run test:e2e -- --update-snapshots
```

This produces snapshot directories next to each spec file:

- `tests/end-to-end/visual.spec.ts-snapshots/design-system.png`
- `tests/end-to-end/visual-authenticated.spec.ts-snapshots/shelf-page.png`

Yes, you commit these PNGs to git. That's the deal. They're small (usually 50-200KB each for a full-page screenshot), and they need to be version-controlled so the comparison works on every machine and in CI.

Check that `.gitignore` doesn't exclude them. Some `.gitignore` templates include `*.png` or `**/*.png`—if yours does, add an exception for the snapshot directories:

```
# .gitignore
!tests/end-to-end/**/*.png
```

After committing the baselines, run the suite cleanly:

```bash
npm run test:e2e
```

Then run it five times to verify stability:

```bash
for i in {1..5}; do npm run test:e2e || break; done
```

If any iteration fails, you have a false positive. The usual suspects: an animation you didn't freeze, a timestamp or relative date on the page ("2 hours ago" changes every run), or a random avatar. Fix the source (disable the animation, mock the date, seed the avatar) rather than loosening the tolerance.

## Part two: break something and watch it fire

The lab asks you to change button padding in `src/lib/components/button.svelte`:

```svelte
<!-- before -->
'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ...',
<!-- after -->
'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ...',
```

Run the visual specs:

```bash
npm run test:e2e -- --grep visual
```

Both tests should fail. The design system page has buttons. The shelf page has buttons. Bigger buttons mean different screenshots.

Open the HTML report:

```bash
npx playwright show-report playwright-report/html
```

Find the failing test and look at the three-panel view. The report shows:

- **Expected**: the committed baseline with the original button sizes.
- **Actual**: the current page with the wider buttons.
- **Diff**: a pink/red overlay highlighting every pixel that changed.

The diff should clearly show the buttons got bigger. On the shelf page, the bigger buttons might also push card content around, cascading the visual change beyond just the buttons themselves. That's good—it's exactly the kind of ripple effect that's invisible in a unit test and obvious in a screenshot.

### Showing the diff to an agent

Copy the diff image path from the report and paste it into your Claude Code conversation:

> "The visual regression test failed. Here's the diff. What changed, and is the change intentional?"

A good agent response identifies the specific change (button padding increased), describes the visual impact (buttons are wider and taller, some layout shifted), and asks whether this was intentional. It should not guess at whether the change is a bug—that's your call. It should surface the information you need to make that call.

### Closing the loop

You have two options:

**Revert the change.** Undo the padding edit, run the tests again. They pass. The baselines are still the original committed PNGs. This is the "no, that wasn't intentional" path.

**Update the baselines.** If the wider buttons are the new design, run `npm run test:e2e -- --update-snapshots` to regenerate the PNGs. Commit the new baselines as a separate commit with a message like "update visual baselines for wider button padding." This is the "yes, that was intentional" path.

Either way, your git history should show the experiment as discrete commits. The sequence should be legible: "here's where the padding changed, here's where the test caught it, here's where we decided what to do about it."

## What makes this work

The visual regression gate is valuable precisely because it's dumb. It doesn't understand buttons or padding or layout. It compares pixels. That means it catches things that no amount of unit testing or integration testing would catch: a CSS specificity conflict that turns all your buttons blue, a font-weight change that makes body text hard to read, a z-index collision that hides the rating modal behind the header.

The cost is false positives from non-determinism. The four config lines and the seeding discipline exist to drive that cost to zero. If your false-positive rate is zero, the visual gate becomes free—it runs in the background, never bothers you when nothing changed, and catches everything when something did.

A failed screenshot test is a conversation opener. The diff image is the message. Once your agent can read the diff, the loop closes itself.

## Additional Reading

- [Lab: Wire Visual Regression Into the Dev Loop](lab-wire-visual-regression-into-the-dev-loop.md)
- [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md)
- [Runtime Probes in the Development Loop](runtime-probes-in-the-development-loop.md)
