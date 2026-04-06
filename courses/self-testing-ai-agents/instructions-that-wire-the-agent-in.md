---
title: Instructions That Wire the Agent In
description: The one rule for instruction files in this workshop—if the agent can't mechanically act on it, it doesn't belong there.
modified: 2026-04-06
date: 2026-04-06
---

If you've used [Claude Code](https://docs.claude.com/en/docs/claude-code/overview), Cursor, or Codex for more than an afternoon, you've written some flavor of instruction file. [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory), `.cursorrules`, `AGENTS.md`—they're all the same idea with different filenames. A markdown file at the root of the repo that the agent reads before it does anything else.

I have written a lot of these, and most of mine were bad. Not bad in the "wrong information" sense—bad in the "the agent couldn't actually do anything with what I wrote" sense.

This lesson is the one rule I want you to take home about instruction files. Other courses can teach you the full taxonomy of [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) patterns. We're going to focus on one thing: **how to use the instruction file to wire the agent into the feedback loop we're going to spend the rest of the day building.**

## The rule

Anything the agent can't mechanically act on doesn't belong in the instructions file.

That's it. That's the whole rule. If you can't imagine the agent reading a line and doing something specific in the next thirty seconds because of it, the line is taking up space.

## What that excludes

Most of what people write in instruction files, honestly.

- "Write clean code." Clean by what measure? The agent has no rubric.
- "Follow best practices." Whose? Best practices for what stack, what era, what team?
- "Use good variable names." This is an aesthetic preference dressed up as a directive.
- "Be concise." The agent will be concise for one response and verbose for the next.
- "Think carefully before making changes." It's an LLM. It doesn't have a "think more carefully" lever you can pull from a markdown file.

I'm not picking on these because they're _wrong_—they're not wrong, exactly. They're just not actionable. The agent can't tell whether it's followed them. You can't tell whether it's followed them. They're vibes, and vibes don't survive the next session.

The other tell is when you find yourself writing instructions that are really instructions to _yourself_—things you wish you'd remembered. Those belong in a checklist or a code review template, not in the agent's prompt.

## What that includes

The good news is that the rule is generative, not just restrictive. Once you're only writing things the agent can act on, a lot of useful stuff opens up.

Things the agent _can_ act on, mechanically:

- "Run `bun test` before declaring a task done. If anything fails, read the failure output and fix it before reporting back."
- "Write a failing test before you write the implementation. The first commit on a task should be the test."
- "When a Playwright test fails, read the trace file at `playwright-report/trace.zip` before guessing at a fix."
- "Never use `page.waitForTimeout`. If you're tempted, use `page.waitForResponse` or a `getByRole` with `expect` instead."
- "The `green` state for this codebase means: `bun lint`, `bun typecheck`, `bun test`, and `bun e2e` all exit zero. Don't say a task is done until all four are green."

Notice what these have in common. Every one of them references a specific command, a specific file path, or a specific API. There's nothing to interpret. The agent reads the rule and either complies or doesn't, and you can tell which from the diff.

## The "what does green mean" anchor

If you only put one thing in your `CLAUDE.md` after this workshop, make it this: **a definition of what 'green' means in this codebase, with the exact commands.**

A version that does the work:

```markdown
## What "done" means in this repo

A task is not done until all four of these exit zero:

1. `bun lint`
2. `bun typecheck`
3. `bun test`
4. `bun playwright test`

If any of them fail, read the output, fix the issue, and re-run. Do not
report the task as complete with a failing check, even if you "know" the
failure is unrelated. If you genuinely believe a failure is unrelated,
say so explicitly and link the failing test name in your summary.
```

That block alone catches more bad agent output than any number of "write clean code" directives. It's mechanical. It's checkable. It encodes the loop.

## A non-example, before and after

Here's a real `CLAUDE.md` I would have written two years ago. I'm not proud of it.

```markdown
# Project Guidelines

- Write clean, readable code
- Follow best practices for TypeScript
- Use descriptive variable names
- Add comments where appropriate
- Test your changes
- Consider edge cases
- Be mindful of performance
```

Every one of those bullets is true. Every one of them is also useless to the agent. There is no command to run, no file to open, no rule that fails loudly when broken.

Here's the version that wires the agent in:

```markdown
# Project Guidelines

## What "done" means

A task is complete only when all of the following exit zero:

- `bun lint`
- `bun typecheck`
- `bun test`
- `bun playwright test --project=chromium`

Run them in that order. Stop and fix the first failure before continuing.

## Testing

- Write the failing test before the implementation. Commit the test first.
- Unit tests live next to the file under test as `<name>.test.ts`.
- End-to-end tests live in `tests/end-to-end/`. Use `getByRole` first,
  `getByLabel` or `getByText` second, `data-testid` as a last resort.
  Never use raw CSS selectors.
- Never use `page.waitForTimeout`. Use `expect(locator).toBeVisible()`,
  `page.waitForResponse`, or `page.waitForRequest` instead.

## When something fails

- Playwright failures: read `playwright-report/index.html` and the trace
  for the failing test before proposing a fix.
- Type errors: do not silence with `any` or `@ts-expect-error`. Fix the
  underlying type.
- Lint errors: do not add `eslint-disable` comments. Fix the underlying
  code.

## Things not to do

- Do not modify files in `src/lib/legacy-auth/`. That directory is
  scheduled for deletion. If you think you need to touch it, stop and ask.
- Do not add new dependencies without flagging it in your summary.
```

Every line in the second version is something the agent can _do_. The first version is a vibe statement. The second version is a loop.

## How this maps to other agents

The same pattern works in Cursor (`.cursor/rules/*.mdc`), Codex (`AGENTS.md`), and Copilot (`.github/copilot-instructions.md`). The filenames change, the directory changes, the syntax for nesting and scoping changes. The rule does not. If your rules file is full of adjectives, you're going to have a bad time regardless of which agent is reading it.

We'll come back to instruction files in almost every module from here on. Module 3's locator hierarchy ends up as a rule in this file. Module 8's lint config ends up as a rule in this file. Module 9's CI command ends up as the canonical "what green means" in this file. The instruction file is where the rest of the workshop's loop gets _named_ to the agent.

## Additional Reading

- [The Hypothesis](the-hypothesis.md)
- [Lab: Rewrite the Bad CLAUDE.md](lab-rewrite-the-bad-claude-md.md)
