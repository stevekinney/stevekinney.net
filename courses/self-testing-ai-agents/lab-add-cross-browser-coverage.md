---
title: 'Lab: Add Cross-Browser Coverage'
description: Keep Chromium as the default, then add Firefox and WebKit coverage to a tagged smoke subset so the loop stays fast enough to use.
modified: 2026-04-09
date: 2026-04-06
---

This lab takes the abstract advice and turns it into an actual Playwright layout the agent can run without melting the fast loop.

> [!NOTE] Prerequisite
> Complete [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md) first. This lab assumes you are deliberately _not_ putting the full suite on every browser.

## The task

Add Firefox and WebKit coverage to a tagged smoke subset in Shelf while keeping Chromium as the default local and pull-request browser.

## Step 1: add browser projects

Update `playwright.config.ts` in Shelf so it defines projects for:

- Chromium
- Firefox
- WebKit

Keep Chromium as the default project you run most often.

## Step 2: tag the smoke subset

Pick a small set of end-to-end tests and tag them for cross-browser execution.

Good candidates:

- login
- shelf landing page
- one form flow
- one modal or drawer interaction

Use a tag such as `@cross-browser` in the test titles or a dedicated spec file. The important thing is that the subset is explicit and easy to grep.

## Step 3: add focused commands

Expose commands like these:

```json
{
  "scripts": {
    "test:e2e": "playwright test --project=chromium",
    "test:e2e:cross-browser": "playwright test --grep @cross-browser --project=chromium --project=firefox --project=webkit"
  }
}
```

The exact script names can vary. The split should not.

## Step 4: keep the artifacts browser-specific

If your Playwright config or CI job uploads traces and screenshots, make sure the browser name is visible in the artifact path or job name.

You want failures to read like this:

- Firefox failed on the login smoke test
- WebKit failed on the modal focus smoke test

Not this:

- some browser failed somewhere, good luck

## Step 5: verify the split

Run both commands:

- the default Chromium loop
- the cross-browser smoke loop

Then intentionally break something that one alternate browser is likely to care about:

- a focus-management assertion
- a layout-sensitive selector
- a form-control behavior

You are not trying to produce a fake "Safari bug." You are checking that the workflow can make a browser-specific failure legible.

## Acceptance criteria

- [ ] Shelf defines Chromium, Firefox, and WebKit Playwright projects
- [ ] Chromium remains the default fast browser command
- [ ] A tagged smoke subset exists for cross-browser coverage
- [ ] A named command runs the cross-browser smoke subset across all three browser projects
- [ ] Browser-specific artifacts or job names make failures easy to distinguish
- [ ] The default Chromium command still works without pulling the full multi-browser matrix into every run

## Troubleshooting

- If the cross-browser set is slow, cut the test list before you optimize the infrastructure.
- If the same test is flaky in every browser, you do not have a browser problem. You have a waiting or determinism problem.
- If WebKit behaves differently, treat that as signal first. You can decide later whether it is a product bug, a browser quirk, or a test assumption.

## Stretch goals

- Run the cross-browser smoke subset only on pull requests touching UI paths.
- Add one browser-specific reproduction command to `CLAUDE.md`.
- Store a short note in the repository listing which routes have earned cross-browser smoke coverage and why.

## The one thing to remember

The win here is not "we run more browsers." The win is "we run the right browsers against the right tests without making the fast loop unusable."

## Additional Reading

- [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
