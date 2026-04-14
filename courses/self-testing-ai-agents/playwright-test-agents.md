---
title: Playwright Test Agents
description: Playwright ships three built-in agents that can plan, generate, and heal your test suite. Here's how they work and where they fit in the loop.
modified: 2026-04-14
date: 2026-04-10
---

So, [Playwright](https://playwright.dev/) 1.56 shipped something genuinely new: three built-in agents—**planner**, **generator**, and **healer**—that can write and maintain your test suite from inside your coding agent's loop. Not "AI-assisted autocomplete for test code." Actual agents with tools, instructions, and the ability to drive a browser, inspect the result, and iterate.

This matters for us because it changes the shape of the feedback loop. Until now, the agent wrote code, ran the tests, read the output, and tried again. With Playwright's test agents, the agent can also _write the tests themselves_—and when those tests break, heal them without you pasting the stack trace back in. The verification layer becomes something the agent can build _and_ maintain, not just consume.

## The three agents

Each agent handles one phase of the test lifecycle. You can use them independently, chain them together, or let them run as a loop.

- **Planner:** Explores your app in a real browser and produces a structured Markdown test plan.
- **Generator:** Takes that Markdown plan and turns it into executable Playwright test files, verifying selectors and assertions live as it goes.
- **Healer:** Runs a failing test, inspects the current UI, patches the test, and re-runs until it passes—or marks it with `test.fixme()` if the functionality itself appears broken.

The key insight is that they're composable. Planner doesn't need generator, and healer doesn't need either of the other two. But when you chain all three, you get a pipeline that goes from "here's my app" to "here's a passing test suite" to "the tests still pass after a refactor" without you writing a single locator.

> [!NOTE] These agents are tools, not magic
> They produce real Playwright test files—the same `test()` blocks, `expect()` assertions, and `getByRole()` locators you'd write by hand. You can (and should) read, edit, and commit the output. They're accelerators for the loop, not a replacement for understanding what the tests do. If an agent stalls or errors out, re-run it—but review the diff first, since a partial run may have already edited files.

## Getting started

Add the agent definitions to your project with the `init-agents` command. These definitions are collections of [MCP](https://modelcontextprotocol.io/) tools and instructions that Playwright provides, and they should be regenerated whenever you update Playwright to pick up new capabilities.

For [Claude Code](https://docs.claude.com/en/docs/claude-code/overview):

```bash
npx playwright init-agents --loop=claude
```

For [VS Code](https://code.visualstudio.com/):

```bash
npx playwright init-agents --loop=vscode
```

For [GitHub Copilot](https://github.com/features/copilot):

```bash
npx playwright init-agents --loop=copilot
```

For [OpenCode](https://opencode.ai/):

```bash
npx playwright init-agents --loop=opencode
```

> [!TIP]
> VS Code v1.105 or later is needed for the agentic experience to work properly.

For Claude Code, this creates three agent definitions in `.claude/agents/` (planner, generator, healer) and an MCP server config in `.mcp.json`. It may also scaffold a `specs/README.md` and a default seed test if none exists. Other tools put the definitions elsewhere—VS Code and Copilot use `.github/agents/`, OpenCode uses `.opencode/prompts/`.

One thing to know: `init-agents` replaces the repo's `.mcp.json`. Shelf doesn't ship one, so this is harmless inside the workshop. If you're running it against your own repo that already registers MCP servers, back the file up first and merge `playwright-test` in after.

Once the agents are generated, you command them through your AI tool of choice. The generated artifacts follow a clean structure we'll look at in a moment.

## The CLI options that actually matter

The help output for `init-agents` is short:

```text
--loop <loop>
-c, --config <file>
--project <project>
--prompts
-h, --help
```

Short help is nice. It is also not enough explanation on its own.

### `--loop <loop>`

This is the only required decision. It tells Playwright which agent host it should initialize for:

- `claude`: writes Claude Code agent definitions under `.claude/agents/` and an MCP config in `.mcp.json`
- `copilot`: writes GitHub Copilot-style agent definitions under `.github/agents/`
- `opencode`: writes OpenCode config plus agent prompts under `.opencode/`
- `vscode`: uses the current VS Code / GitHub agent layout under `.github/agents/`
- `vscode-legacy`: uses the older VS Code chatmode layout under `.github/chatmodes/` and `.vscode/mcp.json`

The important distinction is that `vscode` is the current path. `vscode-legacy` exists for older VS Code setups that still expect chatmodes instead of the newer agent definition format.

### `-c, --config <file>`

This points `init-agents` at the Playwright config file it should load before it tries to find a seed project.

Use it when:

- your config is not the default `playwright.config.ts` in the current directory
- you have multiple Playwright configs in the repo
- you are running `init-agents` from a subdirectory and do not want Playwright guessing

This flag matters because the generator uses the loaded config to find the project's `testDir`, then searches that project for a file whose name includes `seed`. If it does not find one, it creates a default `seed.spec.ts` in that project's `testDir`.

### `--project <project>`

This chooses which Playwright project to treat as the **primary seed project**.

If you omit it, Playwright uses the first top-level project in the loaded config. That is fine when your config has one obvious main project. It is not fine when your config has multiple roles or environments and the first project happens to be something weird like `setup`, `firefox`, or `mobile`.

Use `--project` when the seed should clearly come from one specific project:

```bash
npx playwright init-agents --loop=claude --project=authenticated
```

That tells Playwright where to look for an existing seed file and where to create the default one if no seed exists yet.

### `--prompts`

This tells Playwright to write prompt templates alongside the agent initialization instead of only writing the agent definitions.

In practice, that means provider-specific prompt folders such as:

- `.claude/prompts/`
- `.opencode/prompts/`
- `.github/prompts/`

This is useful when you want the prompt text version-controlled as an editable artifact instead of living only inside the generated agent files.

One nuance: `--prompts` is meaningful for the current Claude, Copilot, OpenCode, and modern VS Code layouts. It is not the interesting flag in `vscode-legacy` mode, because that older path is built around chatmodes instead of the newer prompt-template layout.

### `-h, --help`

This just prints the command help and exits:

```bash
npx playwright init-agents --help
```

That sounds trivial, but it is the fastest way to confirm which loop providers your installed Playwright version actually supports before you start cargo-culting examples from a blog post written against a different release.

## Planner

The planner agent explores your running app in a real browser and produces a Markdown test plan. It's doing what a QA engineer does on their first pass through an unfamiliar app: clicking around, noting what the app does, and writing down what should be tested.

**What it needs from you:**

- A clear request—"Generate a plan for the guest checkout flow" or "Plan tests for the shelf rating workflow."
- A **seed test** that bootstraps the environment your app needs. The planner runs the seed test to bootstrap the environment—global setup, project dependencies, fixtures, hooks—and then explores from there. It also reads the seed's structure as a style reference for the generated plan.
- Optionally, a PRD or requirements document for additional context.

The seed test is just a regular Playwright test that gets the app into a usable state:

```ts
import { test, expect } from '@playwright/test';
import { resetShelfContent } from './helpers/seed';

test('seed', async ({ page }) => {
  await resetShelfContent();
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { name: /shelf/i })).toBeVisible();
});
```

If you've already reached the failure-dossier lab and added `tests/fixtures.ts`, importing from `./fixtures` is also fine. The important part here is the seeded, authenticated starting position — not the wrapper file.

In Shelf, that seed is literally `tests/seed.spec.ts`. Once generation has happened and a test is red, the healer is usually pointed at one concrete file under `tests/<failing-spec>.spec.ts`. Those two paths are the handoff points for the whole loop.

**What it produces:**

A Markdown file in `specs/`—something like `specs/basic-operations.md`. The plan is human-readable but precise enough that the generator can act on it mechanically. Each scenario includes numbered steps, expected results, and enough context that you could hand it to a human tester and they'd know what to do.

Here's a trimmed example of the kind of output you should get:

```markdown
# TodoMVC Application - Basic Operations Test Plan

## Application Overview

The TodoMVC application is a React-based todo list manager. Key features
include task management, bulk operations, filtering by status, a real-time
counter, edit-in-place, and state persistence during navigation.

## Test Scenarios

### Adding New Todos

**Seed:** `tests/seed.spec.ts`

#### Add Valid Todo

**Steps:**

1. Click in the "What needs to be done?" input field
2. Type "Buy groceries"
3. Press Enter key

**Expected Results:**

- Todo appears in the list with unchecked checkbox
- Counter shows "1 item left"
- Input field is cleared and ready for next entry
```

Notice the structure: each scenario names its seed, lists concrete steps, and specifies observable expected results. This isn't a vague requirements document—it's a test plan an agent (or a person) can execute step by step.

## Generator

The generator takes a Markdown plan from `specs/` and produces executable Playwright test files. The important thing: it doesn't just translate text into code. It verifies selectors and assertions _live_ as it performs each scenario, so the generated tests reflect what the app actually does, not what the plan guessed.

Playwright provides the generator with generation hints and a catalog of assertions, so the output tends to land on `getByRole` locators and auto-retrying assertions—exactly the patterns we've been building toward in this course.

**What it needs from you:**

- A Markdown plan from `specs/`. Include the file in your prompt context so the generator knows where to find it.

**What it produces:**

Test files under `tests/`, aligned one-to-one with the spec scenarios. The generated tests may have initial issues—selectors that don't quite match, assertions that need tightening—and that's where the healer comes in.

A generated test might look something like this:

```ts
// spec: specs/basic-operations.md
// seed: tests/seed.spec.ts

import { test, expect } from '../fixtures';

test.describe('Adding New Todos', () => {
  test('Add Valid Todo', async ({ page }) => {
    const todoInput = page.getByRole('textbox', { name: 'What needs to be done?' });
    await todoInput.click();
    await todoInput.fill('Buy groceries');
    await todoInput.press('Enter');

    await expect(page.getByText('Buy groceries')).toBeVisible();

    const todoCheckbox = page.getByRole('checkbox', { name: 'Toggle Todo' });
    await expect(todoCheckbox).toBeVisible();
    await expect(todoCheckbox).not.toBeChecked();

    await expect(page.getByText('1 item left')).toBeVisible();
    await expect(todoInput).toHaveValue('');
  });
});
```

Two things to notice. First, the comments at the top trace the test back to its spec and seed—so you can always find the plan that generated a given test. Second, it's using `getByRole` and auto-retrying assertions, not CSS selectors and `waitForTimeout`. The generator has internalized the locator hierarchy we covered earlier in this course.

## Healer

This is the agent that closes the loop. When a test fails—because the UI changed, a locator drifted, or the generated code wasn't quite right—the healer replays the failing steps, inspects the current state of the UI, and patches the test.

**What it does:**

- Replays the failing test steps in a real browser.
- Inspects the current DOM to find equivalent elements or flows.
- Suggests a patch: a locator update, a wait adjustment, a data fix.
- Re-runs the test to verify the patch works.
- Repeats until the test passes, or until guardrails stop the loop. If the error persists and the healer is confident the test is correct, it marks the test with `test.fixme()` and adds a comment before the failing step explaining what's happening instead of the expected behavior.

That last point is subtle and important. A good healer doesn't just force tests to pass. It distinguishes between "the test is stale" and "the feature is broken." When the healer skips a test, it's telling you something worth investigating.

**What it needs from you:**

- The name of the failing test.

**What it produces:**

- A passing test, or a `test.fixme()` annotation with a comment explaining why the healer believes the functionality itself is broken. A healer-skipped test looks something like this:

```ts
test('Rate a book from the shelf', async ({ page }) => {
  await page.goto('/shelf');
  // Healer: the "Rate this book" button no longer appears in the shelf view.
  // This looks like a removed feature, not a stale locator.
  test.fixme();
  await page.getByRole('button', { name: 'Rate this book' }).click();
  // ...
});
```

## The artifact structure

The agents produce files in a predictable layout:

```
repo/
  .claude/agents/             # agent definitions for Claude Code
  .mcp.json                   # MCP server config for the test agents
  specs/                      # human-readable test plans from the planner
    basic-operations.md
  tests/                      # generated Playwright tests
    seed.spec.ts              # seed test for environment bootstrap
    create/
      add-valid-todo.spec.ts  # generated from specs/basic-operations.md
  playwright.config.ts
```

> [!TIP]
> VS Code and Copilot put agent definitions under `.github/agents/` instead. OpenCode uses `.opencode/prompts/`. The layout above reflects the Claude Code default.

**Agent definitions** are provided by Playwright and should be regenerated when you update Playwright versions. They contain the MCP tool definitions and instructions that power each agent.

**Specs** in `specs/` are the structured plans. They're version-controlled, reviewable, and editable. If the planner's plan isn't quite right, you can edit the Markdown before handing it to the generator.

**Tests** in `tests/` are the generated Playwright tests. They're regular `.spec.ts` files—nothing special about them. You commit them, review them in pull requests, and run them in CI like any other test.

**Seed tests** like `seed.spec.ts` provide the starting context. They handle authentication, fixture setup, and anything else the planner needs to explore from a known state.

Commit the agent definitions to version control. They're small Markdown files, and keeping them in the repo means every developer on the team gets the same agent behavior.

## Where test agents fit in the loop

The test agents slot into the feedback loop at a specific point: they're the layer between "the agent wrote some code" and "the agent knows whether the code works." Here's how that looks in practice.

Without test agents, the loop is: write code → run existing tests → read failures → fix → repeat. The tests are static—someone (you) wrote them, and the agent just runs them.

With test agents, the loop expands: write code → plan tests for the new behavior → generate tests → run them → heal any that fail → report. The agent can now _extend_ the test suite as part of its workflow, not just consume what's already there.

This is a meaningful shift. It means an agent working on a new feature can also produce the verification for that feature, in the same conversation. The planner explores what the feature actually does (not what the prompt said it should do), the generator writes tests that match the real UI, and the healer keeps those tests alive as the code evolves.

The lab walks through this pipeline once, end to end. In practice, you loop back to the planner whenever requirements change or the app gains new workflows.

The catch—and I want to be honest about this—is that agent-generated tests are only as good as the plan. If the planner misunderstands the feature, the generator will faithfully produce tests for the wrong thing, and the healer will faithfully keep those wrong tests passing. You still need to review the specs in `specs/` with the same care you'd review any test. The agents accelerate the mechanical work. The judgment about _what to test_ is still yours.

## The agent rules

If you're using test agents in your project, add something like this to the instructions file:

```markdown
## Playwright Test Agents

- The planner, generator, and healer agent definitions live under
  `.claude/agents/` with an MCP config in `.mcp.json`. Regenerate them
  with `npx playwright init-agents --loop=claude` after updating Playwright.
- Plans live in `specs/`. Review them before generating tests—the generator
  will faithfully implement whatever the plan says, including mistakes.
- Generated tests live in `tests/`. They are regular Playwright tests—commit
  them, review them in PRs, run them in CI.
- When a test fails after a UI change, try the healer before manually fixing
  the test. If the healer skips the test, investigate—it believes the feature
  is broken, not just the test.
- Seed tests (`seed.spec.ts`) must use the project's custom fixtures. Do not
  bypass fixtures or global setup in seed tests.
```

## The one thing to remember

Playwright's test agents turn the verification layer from something you build _for_ the agent into something the agent can build _with_ you. Planner explores, generator writes, healer maintains. The mechanical work of keeping a test suite current gets cheaper. The judgment about what matters—what to plan, what to review, when to override the healer—stays with you.

## Additional Reading

- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [The Waiting Story](the-waiting-story.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [Lab: Generate and Heal a Test Suite with Playwright Agents](lab-generate-and-heal-with-playwright-agents.md)
