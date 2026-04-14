---
title: 'Generate and Heal with Playwright Agents: Solution'
description: What to expect when running Playwright's planner, generator, and healer agents against Shelf, and how to judge the output.
modified: 2026-04-14
date: 2026-04-10
---

This lab doesn't produce a single shipped file. It produces an _experience_—running three agents against a real app, reading their output, and deciding whether to trust it. The "solution" here isn't code to copy. It's a walkthrough of what you should have seen, what strong output contains, and where the agents need your judgment.

Your results will differ from mine in the details. The agents explore the app live, and Shelf's layout, copy, and component structure all influence what the planner observes and the generator writes. That's fine. What matters is whether your output meets the quality bar described below—not whether it matches mine token for token.

## What `init-agents` produces

After running `npx playwright init-agents --loop=claude`, you should have:

- `.claude/agents/` containing three files: one for the planner, one for the generator, one for the healer. Each is a Markdown file with agent instructions and tool definitions.
- `.mcp.json` at the project root, pointing Claude Code at the Playwright MCP server so the agents can launch browsers, take screenshots, and interact with pages.

If you don't see both of these, the command didn't complete. Check that you're on Playwright 1.56 or later (`npx playwright --version`) and that you ran the command from the project root.

You don't need to edit these files. They're generated scaffolding. The interesting work starts when you use them.

## The seed test

Your seed test should be minimal:

```ts
import { test, expect } from '@playwright/test';
import { resetShelfContent } from './helpers/seed';

test('seed', async ({ page }) => {
  await resetShelfContent();
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { name: /shelf/i })).toBeVisible();
});
```

Two things to note. First: at this point in the course it can import directly from `@playwright/test`. The authenticated project wiring lives in `playwright.config.ts`, not in a custom wrapper file. Later, once you've completed the failure-dossier lab, importing from `./fixtures` is a reasonable follow-up because that file wraps `page` with console and network forwarding.

Second: the seed test is deliberately boring. It resets shelf content, navigates to one page, and asserts a heading exists. Its job isn't to test anything—it's to bootstrap the app into a logged-in, seeded state so the planner has something to explore. Think of it as the planner's starting position on the chessboard.

## Expected planner output

When you point the planner at the shelf rating workflow, it launches a browser, navigates to `/shelf`, and starts exploring. What it produces is a Markdown file in `specs/` that reads like a test plan.

A good planner output for the rating workflow should include:

- **The starting state**: user is logged in, shelf has books (it gets this from the seed test).
- **The interaction sequence**: find a book, click the rate button, select a star rating in the modal, submit.
- **Expected results**: success toast appears, rating is visible on the card, modal closes.
- **Edge cases it noticed**: what happens if you cancel the modal, what happens if you submit without selecting a rating.

Things to watch for:

- **Wrong routes.** The planner explores live, but it might describe `/books` when Shelf uses `/shelf`. Check the URLs in the plan against the actual app.
- **Invented UI copy.** The planner reads the page, but it sometimes paraphrases. If it says "Rating saved successfully" but the app says "Thanks for rating!", the generator will write an assertion that fails. Correct the copy in the plan before generating.
- **Missing the modal interaction.** The rating flow involves a dialog with radio buttons. If the planner describes it as "click the 4th star" instead of "select the radio button labeled '4 stars'," the generator will produce a fragile locator. Edit the plan to be specific about the interaction pattern.

Edit the plan. It's a Markdown file. You're the reviewer, the planner is the author. Treat it exactly like a spec in a pull request.

## Expected generator output

The generator reads the plan and produces test files. For the rating workflow, you should get something like:

- A test that navigates to `/shelf`, finds a specific book, opens the rating modal, selects a star rating, submits, and asserts the success toast.
- Comments in the test that reference the spec file ("From spec: rate-book-workflow.md, scenario 1").
- Locators that use `getByRole`, `getByLabel`, or `getByText`—not CSS selectors.

Here's what to check in the generated tests:

**Locator quality.** The generator should produce `getByRole` locators. If you see `page.locator('.book-card')` or `page.locator('#rating-modal')`, that's a failure. The agent has access to the live DOM and should be resolving accessible names, not scraping class names.

**Wait strategy.** There should be zero `waitForTimeout` calls. The generator should use auto-retrying assertions (`toBeVisible`, `toHaveText`) for UI state and `waitForResponse` for network round-trips. If you see `await page.waitForTimeout(1000)` anywhere, flag it.

**Assertion strength.** Watch for assertions that are too weak. `toBeVisible()` on the toast is weaker than `toHaveText(/Thanks/)` on the toast. The first passes even if the toast says "Error: something went wrong." The second catches that. Prefer specific assertions.

**Traceability.** Each test should have a comment or description that connects it back to the plan. This matters when a test fails six months from now and someone needs to understand _why_ the test exists, not just _what_ it checks.

If the generated tests fail when you run them, that's normal. The generator verifies locators live but doesn't always get assertions right on the first pass. Don't fix them by hand yet—that's the healer's job.

## Expected healer behavior

The healer takes a failing test, replays it in a browser, inspects the DOM at the failure point, and patches the test. What it does falls into a few categories.

**Good fixes** (you should see these):

- Updating a locator because the accessible name in the app doesn't match what the generator wrote. Example: the generator wrote `getByRole('button', { name: 'Submit' })` but the button says "Save rating."
- Adding a `waitForResponse` where the test clicked a button and immediately asserted the result without waiting for the network round-trip.
- Adjusting assertion text to match the actual UI copy. The plan said "Rating saved," the app says "Thanks for rating!", the healer updates the assertion.

**Suspicious fixes** (investigate if you see these):

- Adding `waitForTimeout`. This should never happen with current Playwright agents. If it does, the healer is compensating for a timing issue it doesn't understand. Fix it by hand with the right wait pattern.
- Weakening an assertion. If the healer changes `toHaveText('Thanks for rating!')` to `toBeVisible()`, it's hiding a problem. Either the toast copy changed (check the app) or the healer gave up on matching the text (fix it by hand).
- Marking a test with `test.fixme()`. This means the healer couldn't figure out the fix. Investigate. Is the feature broken? Is the locator fundamentally wrong? The healer is telling you it needs human judgment—provide it.

## The break-and-heal cycle

When you make a deliberate UI change—renaming a button, changing toast copy, swapping a heading level—and run the tests, they should fail. The failures should be obvious: a locator can't find an element because the name changed, or an assertion doesn't match because the text changed.

The healer's patch should be minimal. If you renamed "Add to shelf" to "Save to library," the healer should change exactly one string in the locator. If you changed the heading from `h1` to `h2`, it should change the `level` option in `getByRole('heading', { level: 1 })` to `level: 2`.

If the healer rewrites the entire test, or adds workaround logic, or introduces new helper functions—that's a signal the original test was over-coupled to implementation details. A well-written test is easy to heal because the changes are surgical. A poorly-written test is hard to heal because everything is tangled.

After healing, revert your UI change and run the tests again. They'll fail again (they now match the _changed_ UI). Heal again. You should end up back where you started. This round-trip is the proof that the healer is updating locators and assertions, not rewriting logic.

## Judgment criteria

Here's the rubric I use when evaluating agent-generated tests:

| Criterion    | Pass                                                                                             | Fail                                   |
| ------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Locators     | All `getByRole`/`getByLabel`/`getByText`, `getByTestId` only for genuinely un-labelable elements | Any `page.locator()` with CSS or XPath |
| Waits        | Zero `waitForTimeout`, uses `toBeVisible`/`toHaveText`/`waitForResponse`                         | Any magic timeout                      |
| Assertions   | Specific (`toHaveText`, `toHaveAttribute`) over generic (`toBeVisible`)                          | Assertions weakened to pass            |
| Traceability | Comments reference the spec file and scenario                                                    | No connection to the plan              |
| Seeding      | Uses `resetShelfContent` or equivalent                                                           | Depends on ambient database state      |
| Auth         | Uses storage state via project config                                                            | Logs in inside the test                |

If a generated test fails three or more of these, the plan needs editing, not the test. Go back to the spec, make it more specific about the interaction pattern and expected results, and regenerate.

## The meta-lesson

The agents handle the mechanical work: exploring the app, generating locators, patching drifted selectors. They're fast at the parts that are tedious for humans and reliable at the parts that are repetitive.

But they don't know _what_ to test. They don't know whether a weakened assertion is acceptable or dangerous. They don't know whether `test.fixme()` means "the feature is broken" or "I gave up." That judgment stays with you.

Use the agents to go faster. Use your eyes to go correctly. The combination is better than either alone.

## Additional Reading

- [Lab: Generate and Heal with Playwright Agents](lab-generate-and-heal-with-playwright-agents.md)
- [Playwright Test Agents](playwright-test-agents.md)
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [The Waiting Story](the-waiting-story.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
