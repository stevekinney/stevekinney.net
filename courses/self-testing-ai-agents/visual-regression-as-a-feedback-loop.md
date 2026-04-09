---
title: Visual Regression as a Feedback Loop
description: Screenshot diffs are not just a CI gate. They're the fastest way to tell an agent "this looks wrong" without saying a word.
modified: 2026-04-09
date: 2026-04-06
---

I spent years thinking of visual regression testing as a CI-only concern. You check in a screenshot, CI compares against the screenshot on the next run, the build fails if there's a diff. Nice-to-have, kind of annoying to maintain, skip it if you're short on time.

Then I started using agents seriously, and the whole thing flipped. Visual regression isn't primarily a CI gate for me anymore. It's the tightest feedback loop I have for telling an agent that its change _looks_ wrong in ways that no assertion will catch.

Let me explain the reframe, and then we'll look at how to actually wire it up.

## Why CI-only framing misses the point

The CI-only story goes like this: you're worried someone's going to accidentally change the padding on a button, or flip a color, or break a layout, and no other test will catch it. Visual regression catches it by taking a screenshot and diffing it against the committed baseline.

This is true, and it's fine. But if that's your only framing, you treat visual regression as insurance—something you pay for once, hope to never use, and grumble about when a baseline needs updating.

The agent reframing is different. When an agent touches the UI, there are two kinds of "wrong." One is behavior wrong: a button doesn't submit, a form doesn't validate, a link goes to the wrong place. Your Playwright tests catch those. The other is appearance wrong: the button is there and it submits, but it's three pixels taller than it was and now the card overflows, or the text is now white on white because of a cascade issue. Nothing in your test suite catches that, because no test asserts on visual appearance.

Until you add a screenshot diff.

Now the agent has a signal. "You changed the button component. The shelf page screenshot is different. Here's the diff. Was that intentional?" Most of the time the answer is "no, please fix it." Sometimes it's "yes, update the baseline." Either way, the agent knows something happened that no functional test would have flagged.

And here's the part I didn't expect: **the diff is legible to the agent.** You can feed a visual regression diff into an agent that can read images, and it will tell you, in plain language, what changed. "The button in the top-right is now taller and no longer aligned with the search bar." That's real, actionable feedback that the agent can act on without a human in the loop.

## Playwright's built-in: `toHaveScreenshot`

Playwright has a screenshot assertion that's good enough to build a real visual regression suite on. It's not as flashy as [Chromatic](https://www.chromatic.com/) or Percy, but it's free, it runs locally, it commits snapshots to git alongside the code, and it does exactly what we need for the in-dev feedback loop.

[Playwright's `toHaveScreenshot`](https://playwright.dev/docs/test-snapshots) is the tool we'll use for all visual regression in this workshop.

```ts
test('shelf page matches visual baseline', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page).toHaveScreenshot('shelf-page.png');
});
```

Shelf runs authenticated visual tests inside the same `authenticated` Playwright project the rest of the suite uses, with a `beforeEach` that calls `resetShelfContent` so every diff starts from the same seeded shelf state. If your project has a reason to separate visual reads from write-heavy tests (say, both suites racing the same user's data), you can point a second Playwright project at a different storage-state file, but do not reach for that complexity until a concrete conflict forces it.

First run: Playwright takes a screenshot and writes it to `tests/end-to-end/visual.spec.ts-snapshots/shelf-page.png` (the snapshot directory is named after the test file, so a different `<test-file>.spec.ts` would produce a different `<test-file>.spec.ts-snapshots/` folder). The test "passes" because there's nothing to compare against.

Every subsequent run: Playwright takes a new screenshot and compares it to the committed baseline. If they match pixel-for-pixel (modulo a small tolerance), the test passes. If they don't, the test fails, and Playwright writes three files to your report directory: the baseline, the actual, and a diff image highlighting the changed pixels.

You commit the baseline to git. When you make an intentional visual change, you regenerate the baseline (`--update-snapshots`) in the same commit. Reviewers see the old baseline being replaced with the new baseline in the diff and can eyeball whether the change was intentional.

## Making screenshot tests reliable

The number-one complaint about visual regression is "the baselines are always flaky." This is almost always fixable. Flakiness in screenshots comes from a few specific sources, and every one has a specific knob.

**Font rendering differences.** Same font, different OS, different antialiasing. Test on your Mac, commit the baseline, CI (Linux) produces subtly different text. The fix is to run screenshots in a consistent environment. Either use Playwright's Docker image everywhere or only run screenshot tests on CI with a pinned Linux image. My preference: do both runs in Docker so the baseline on your laptop matches the baseline on CI.

**Animations and transitions.** A button with a hover animation, a loading spinner, a fade-in transition—anything that moves is going to create a flaky screenshot. Playwright's `toHaveScreenshot` supports `animations: 'disabled'` in config, which injects CSS to disable animations. Use it.

```ts
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    },
  },
});
```

`animations: 'disabled'` kills CSS transitions. `caret: 'hide'` hides the blinking text cursor in inputs (which changes every half second and ruins screenshots). `scale: 'css'` ensures the screenshot uses CSS pixels regardless of device pixel ratio.

**Dynamic content.** A timestamp that says "2 minutes ago" is going to be "3 minutes ago" by the next run. A user-generated avatar, a random quote of the day, a visible date—any of these will break the diff. You have two options: mock the dynamic content (for example, install `page.clock` and set a fixed time, or seed the database with fixed content) or mask the dynamic regions with the `mask` option:

```ts
await expect(page).toHaveScreenshot('shelf-page.png', {
  mask: [page.getByTestId('current-time'), page.getByTestId('user-avatar')],
});
```

Masked regions get painted with a solid color in both the baseline and the actual, so they never affect the diff.

**Scrollbars.** They vary by OS. Playwright's screenshots ignore them by default on most setups, but double-check if your layout includes scrollable regions.

Fix these four things and screenshot tests are boring and reliable. Skip them and they're the flakiest tests in your suite. There is no in-between.

## Component-level vs page-level screenshots

Page-level screenshots are what I showed above: `expect(page).toHaveScreenshot`. They're what you want for catching layout regressions and big visual changes.

Component-level screenshots are what you want for catching design system drift. If you have a `<Button>` component used everywhere, take a screenshot of `<Button>` in every state (default, hover, disabled, loading) and assert against those. Now if someone changes the base button styles, the component screenshots fail _before_ any page screenshot has a chance to fail, and the failure is much more specific.

Playwright's component testing lets you do this, but honestly, for SvelteKit the simpler pattern is to have a `/design-system` route (or Storybook, if you already use it) that renders every component in every state, and take a page screenshot of _that_. It's less magical and it uses the same tooling as the rest of your end-to-end suite.

Shelf is going to ship with a `/design-system` route specifically for this purpose. One screenshot test covers it. The whole design system is under visual regression with one line of code.

## Chromatic, Percy, and the cloud tools

Built-in screenshots are great for the dev loop. They're more limited than the cloud tools in two ways:

- **Cross-browser matrix.** Chromatic runs your screenshots across Chrome, Safari, Firefox, and a bunch of viewports in parallel. Playwright can do this too, but each browser is a separate project and the coordination is on you.
- **Review workflow.** Chromatic's web UI for reviewing visual diffs (approve, reject, compare branches) is substantially better than staring at PNG files in a PR. For a team that ships visual changes often, the review UX is worth the price.

My recommendation: start with the built-in. If you find your team is drowning in manual diff review, or you need cross-browser coverage, then add Chromatic on top. Don't reach for the cloud tool first just because it's flashier. Built-in screenshots give the agent the feedback it needs during development, which is the harder problem.

## Feeding diffs to the agent

Here's the bit that was news to me.

When a screenshot test fails, the failure report includes the diff image. Claude Code and other agents that can read images can look at that diff directly. You can set up a hook (Module 9 has details) that, on a failed screenshot test, attaches the diff image to the agent's context and asks, "Was this change intentional? If not, what needs to be fixed?"

The agent will say things like, "The 'Rate' button is now 4 pixels taller because the new icon component has extra padding. The `ShelfCard` component now overflows. Either reduce the padding or increase the card height." That's the diff read back in natural language, as a prompt for the next edit.

This is the agent self-correcting on visual feedback. Not long ago, this was science fiction. Now it's a hook in your CI config.

And there is a natural next question after "did the UI change visually?": "did the same change also make the app slower or heavier?" Screenshot diffs do not answer that. The next module does.

## CLAUDE.md rules

```markdown
## Visual regression

- Page screenshots live in `tests/end-to-end/visual.spec.ts` and use
  `expect(page).toHaveScreenshot(name)`. Baselines are committed.
- Before regenerating a baseline, check that the change is intentional.
  Do not update baselines to "make the test pass."
- When a screenshot test fails, read the diff image in
  `playwright-report/` before proposing a fix.
- Dynamic regions (timestamps, user-generated content, loading
  indicators) must be masked via the `mask` option or mocked via seed
  data. Do not disable the screenshot test to work around flakiness.
- Animations are disabled globally via `playwright.config.ts`. Do not
  re-enable them per test.
```

## The one thing to remember

Visual regression is not insurance. It's a communication channel between you (or your agent) and the UI. Every failed screenshot is the UI telling you, "something changed that none of your other tests noticed." For the agent, it's the only feedback loop that checks _appearance_, and that turns out to be exactly the class of bug agents introduce most often.

## Additional Reading

- [Performance Budgets as a Feedback Loop](performance-budgets-as-a-feedback-loop.md)
- [The Waiting Story](the-waiting-story.md)
- [Lab: Wire Visual Regression Into the Dev Loop](lab-wire-visual-regression-into-the-dev-loop.md)
