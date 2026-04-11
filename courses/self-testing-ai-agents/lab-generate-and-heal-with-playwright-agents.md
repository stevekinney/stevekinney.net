---
title: 'Lab: Generate and Heal a Test Suite with Playwright Agents'
description: Use the planner, generator, and healer agents to build a test suite for Shelf's core workflow, then break the UI and watch the healer fix it.
modified: 2026-04-10
date: 2026-04-10
---

This lab puts the three Playwright test agents through a real workflow against Shelf. You'll plan a test suite, generate it, verify it passes, break the UI on purpose, and then watch the healer close the loop. The goal is to see where the agents save you time and where you still need to apply judgment.

> [!NOTE] Prerequisites
> You need [Playwright](https://playwright.dev/) 1.56 or later and a working Shelf setup with authentication already configured via storage state. If you haven't done the storage state lab yet, go do that first—the planner needs a logged-in session to explore the app.

## Set up the agent definitions

Start by generating the agent definitions for your coding tool. If you're using [Claude Code](https://docs.claude.com/en/docs/claude-code/overview):

```bash
npx playwright init-agents --loop=claude
```

This creates agent definitions in `.claude/agents/` and an MCP server config in `.mcp.json`. Verify that `.claude/agents/` was created and contains the three agent files (planner, generator, healer) before moving on.

## Write the seed test

The planner needs a seed test that bootstraps the app into a usable state. Create `tests/end-to-end/seed.spec.ts` that uses your existing fixtures and navigates to the shelf:

```ts
import { test, expect } from './fixtures';

test('seed', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { name: /shelf/i })).toBeVisible();
});
```

The seed test does two things: it runs through any global setup and project dependencies your `playwright.config.ts` defines (including storage state authentication), and it gives the planner a starting page to explore from. Run it once to make sure it passes:

```bash
npx playwright test --project=chromium tests/end-to-end/seed.spec.ts
```

> [!TIP]
> If the seed fails, check that storage state authentication is configured—Shelf's `playwright.config.ts` starts the app via `webServer`, so you don't need to start it manually. See [Storage State Authentication](storage-state-authentication.md) if you haven't done that setup yet.

## Plan the shelf rating workflow

Ask the planner to generate a test plan for Shelf's core workflow: browsing the shelf, rating a book, and verifying the rating persists. Include the seed test in the prompt context so the planner knows where to start and what style to follow.

> [!TIP] Example prompt
> In Claude Code, try: "Use the playwright-test-planner agent to plan tests for the shelf rating workflow. The seed test is at `tests/end-to-end/seed.spec.ts`."

The planner will launch a browser, navigate through the app, and produce a Markdown plan in `specs/`. Read the output carefully. Check that the steps match what the app actually does—the planner is exploring live, but it can still miss things or describe a flow incorrectly.

Things to watch for in the plan:

- Does it reference the correct page routes (`/shelf`, not `/books`)?
- Do the expected results match Shelf's actual UI copy? ("Added to your shelf" vs. "Book added" vs. whatever Shelf actually says.)
- Does it account for the rating modal's specific interaction pattern?
- Are there scenarios you'd want that the planner missed?

If anything is wrong or missing, edit the Markdown plan directly before moving to the next step. The plan is a regular file—treat it like any other spec you'd review in a pull request.

## Generate the tests

Hand the plan to the generator agent. Include the spec file from `specs/` in the prompt context. The generator will produce test files under `tests/` that implement each scenario from the plan.

> [!TIP] Example prompt
> "Use the playwright-test-generator agent to generate tests from `specs/<your-plan>.md`." Use the actual filename the planner created in the previous step.

Once the tests are generated, read them. Check for:

- `getByRole` locators (not CSS selectors).
- Auto-retrying `expect` assertions (not `textContent()` + manual comparison).
- No `waitForTimeout` calls.
- Comments that trace each test back to its spec and seed.

If the generated tests have issues that match anti-patterns from the earlier lessons—CSS selectors, magic timeouts, `.first()` without scoping—note them but don't fix them by hand yet. Let the healer attempt the fix first so you can see what it does and judge its work. Run the suite first:

```bash
npx playwright test --project=chromium
```

If tests fail at this stage, that's expected. The generator verifies selectors live but doesn't always get assertions right on the first pass. This is where the healer earns its keep.

## Heal any failures

For each failing test, invoke the healer agent with the test name (the healer's reasoning and patches appear in your coding tool's output—Claude Code shows each step as it replays, inspects, and patches). Pay attention to the _kind_ of fix it applies.

> [!TIP] Example prompt
> "Use the playwright-test-healer agent to fix the failing test in `tests/end-to-end/<failing-spec>.spec.ts`."

Good healer fixes:

- Updating a locator to match a changed label or role.
- Adding a `waitForResponse` where the test was missing a network wait.
- Adjusting an assertion to match the actual UI copy.

Suspicious healer fixes:

- Adding `waitForTimeout` (this should never happen with current Playwright agents, but check).
- Weakening an assertion to make it pass (changing `toHaveText('Thanks for rating!')` to `toBeVisible()`, for example).
- Marking a test with `test.fixme()` without a clear explanation.

If the healer marks a test with `test.fixme()`, investigate. Either the feature is broken in Shelf (possible—check the app manually) or the healer couldn't figure out the right fix (also possible—fix it by hand using the patterns from the course).

Run the full suite again after healing. Everything should be green:

```bash
npx playwright test --project=chromium
```

## Break the UI, then heal

Now the interesting part. Commit your current work (or create a branch) before making the next change, so you can revert cleanly without losing unrelated progress. Make a deliberate UI change in Shelf that will break the tests you just generated. Pick one of these:

- Rename the "Add to shelf" button to "Save to library" in the component.
- Change the rating modal's confirmation text from "Thanks" to "Rating saved."
- Move the shelf heading from an `h1` to an `h2`.

Run the tests. They should fail. Then invoke the healer on each failure and watch it adapt. The healer should update the locators or assertions to match the new UI without changing what the test _verifies_.

After healing, check the diff. The healer's patches should be minimal: a changed string here, an updated role there. If the healer rewrote the entire test or added workarounds, that's a signal the original test was too tightly coupled to implementation details rather than behavior.

Revert your UI change when you're done. The tests should fail again (they now match the _changed_ UI), and healing again should restore them to the original form.

## Acceptance criteria

- [ ] Agent definitions exist under `.claude/agents/` and `.mcp.json` exists, both generated by `npx playwright init-agents --loop=claude`.
- [ ] A seed test at `tests/end-to-end/seed.spec.ts` passes and uses the project's custom fixtures.
- [ ] At least one Markdown plan exists in `specs/` covering the shelf rating workflow.
- [ ] Generated test files exist under `tests/` with comments tracing back to their spec.
- [ ] `rg "waitForTimeout" tests/end-to-end/` returns nothing in any agent-generated test.
- [ ] No raw CSS selectors via `page.locator()` in agent-generated tests. Prefer semantic locators (`getByRole`, `getByLabel`, `getByText`), with `getByTestId` only as a last resort.
- [ ] The full suite passes: `npx playwright test --project=chromium` exits zero.
- [ ] You successfully broke a UI element, healed the tests, and verified the healer's patch matches the "good healer fixes" criteria from the healing section above.

## Stretch goals

If you finish early:

- Ask the planner to generate a plan for a second workflow—adding a new book to the shelf via the search page. Generate and heal the tests for it. See how much of the plan you need to edit versus how much the planner gets right on its own.
- Run the full suite with `--repeat-each=10` and see if any of the agent-generated tests flake. If they do, diagnose the cause—is it a locator issue, a timing issue, or a missing seed? Fix it by hand and compare your fix to what the healer would have done.
- Try the healer on one of the _manually written_ tests from the earlier labs. Does it improve anything? Does it break anything?

## The one thing to remember

The test agents handle the mechanical work: exploring, generating locators, patching drifted selectors. The judgment—what to test, whether the plan makes sense, whether a healer skip means the test is wrong or the feature is broken—stays with you. Use the agents to go faster. Use your eyes to go correctly.

## Additional Reading

- [Playwright Test Agents](playwright-test-agents.md)
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [The Waiting Story](the-waiting-story.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
