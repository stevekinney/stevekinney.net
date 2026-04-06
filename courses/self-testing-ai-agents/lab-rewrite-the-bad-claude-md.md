---
title: 'Lab: Rewrite the Bad CLAUDE.md'
description: Take Shelf's deliberately useless instructions file and turn it into one the agent can actually act on.
modified: 2026-04-06
date: 2026-04-06
---

Time to do the thing.

Open the Shelf starter repository. At the root, there's a [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) file. It is bad on purpose. It is the kind of [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) I would have written two years ago, full of aspirational adjectives and zero mechanically checkable rules. Your job is to fix it.

## Setup

```sh
git clone <shelf-repo-url>
cd shelf
bun install
bun run dev
```

Open [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) in your editor. Read it. Notice how every line is technically true and operationally useless.

## The task

Rewrite [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) so that every rule in it is something the agent can mechanically act on. You are allowed to delete _aggressively_. You are encouraged to delete more than you keep.

Specifically, the new file should include:

- A "what green means" section that names the exact commands the agent should run before declaring a task done. Look in `package.json` for the actual script names. Don't make commands up.
- At least one rule about how tests get written (TDD ordering, file location, naming convention—your call).
- At least one rule about how [Playwright](https://playwright.dev/) locators get chosen.
- At least one rule about something the agent should _not_ do in this codebase (a directory to leave alone, a pattern to avoid, a dependency not to add).

Keep the file under sixty lines. If it's longer than that, you're probably writing instructions to yourself instead of to the agent.

## Acceptance criteria

Each item is independently checkable. Don't move on until all are ticked.

- [ ] [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) exists at the repository root and is under sixty lines (`wc -l CLAUDE.md` reports a number ≤ 60).
- [ ] The file contains a section that names at least three exact shell commands the agent should run before declaring a task done.
- [ ] Every command named in that section actually exists in `package.json` (verify with `cat package.json | grep <command-name>` for each).
- [ ] The file contains zero instances of the words "clean," "best practices," "good," or "appropriate" (`grep -iE 'clean|best practices|good|appropriate' CLAUDE.md` returns no matches).
- [ ] The file contains at least one rule that mentions a specific file path in the repo, and that path resolves (`ls <path>` exits zero for the path you named).
- [ ] The file contains at least one rule about [Playwright](https://playwright.dev/) locator choice that names a specific [Playwright](https://playwright.dev/) API (e.g., `getByRole`, `getByLabel`, `data-testid`).
- [ ] You ran `bun lint`, `bun typecheck`, and `bun test` after editing and all three exit zero. (`CLAUDE.md` is markdown, so they should be unaffected, but the habit is the point.)
- [ ] You committed the change with a message that starts with `docs(claude-md):` and the commit hash is on `HEAD`.

## Checking your work against an agent

Once your file passes the checklist, run the loop end to end at least once:

1. Open Claude Code (or whichever agent you brought) in the Shelf repo.
2. Give it this exact task: _"Add a `lastReadAt` timestamp to the `ShelfEntry` schema and surface it on the shelf page. Follow the rules in CLAUDE.md."_
3. Watch what it does. Specifically watch whether it runs the commands you named in the "what green means" section without you reminding it.

If the agent runs your commands without prompting, your file is doing its job. If you have to remind it, your rules are too easy to skip. Tighten the language. ("You should run X before declaring done" is easier to skip than "Run X. Do not report the task as complete if X exits non-zero.")

## Stretch goals

If you finish early:

- Add a rule that references a file you haven't created yet, then create it. (Shelf has a `tests/fixtures/` directory that's underused—a fixtures convention rule is a good fit.)
- Run the same task against a second agent (Cursor, Codex, Copilot) using the same instruction file translated to that agent's filename. Note where the rules survive the port and where they don't.
- Take the worst rule you _kept_ and try to make it more mechanically checkable. The goal is not perfection; the goal is to feel the difference between a rule the agent can act on and a rule it can't.

## What you should be left with

A `CLAUDE.md` you would actually want the agent to read. Shorter than the one you started with. More opinionated. Every line earns its place by being something the agent does, not something the agent _is_.

We'll come back to this file in almost every module from here on. By the end of the day, it's going to have rules from Module 3 ([Playwright](https://playwright.dev/) locators, waiting), Module 8 (lint, dead code), and Module 9 (the canonical CI command). The rewrite you do today is the spine that the rest of the day hangs on.

## Additional Reading

- [Instructions That Wire the Agent In](instructions-that-wire-the-agent-in.md)
- [The Hypothesis](the-hypothesis.md)
