---
title: Building the System
description: 'Start with a blank canvas, add only what you keep repeating, and fix the shell the agent stands on before you blame the model.'
---

Most people build their agent setup by installing things. A plugin (a bundle of skills, hooks, and other pieces you install in one go) here, a pile of rules there, a skill someone posted last week. Six months later, nobody can say which piece is doing what, and the agent is following three instructions that contradict each other.

Boris Cherny, the creator of Claude Code, put the alternative bluntly in a talk at [Y Combinator Startup School in 2026](https://www.ycombinator.com/library/UN-boris-cherny-building-claude-code):

> For people who aren't building agentic products but are using Claude Code, every six months, delete your `CLAUDE.md` file, delete your skills, and delete your hooks. Then see what the model does. It might surprise you.
>
> For Opus 5, we strongly recommend trying to delete all of these things because the model may no longer need the extensive instructions that were necessary for previous models.

That's the crux of this course. The tools keep growing, changing, and improving (and, occasionally, regressing), while the principles have held steady for a hot minute now. So instead of memorizing one tool's settings, learn to build your own light saber: a small system you assembled yourself and understand completely. Then you can carry it from one tool to the next, or through an upgrade of the one you have.

## Start with a blank canvas

The high-level approach is _very_ simple:

- **Start empty**: No plugins, no borrowed rules. Just the harness (the program wrapped around the model) and your project.
- **Notice what you repeat**: Pay attention to the instructions you type over and over. Those are your candidates. Standing rules go in an instruction file, which is `CLAUDE.md` for Claude Code (or `AGENTS.md` in Codex) and which the harness loads according to its directory scope. In Claude Code, working-directory and ancestor instructions load at launch; descendant `CLAUDE.md` files load only when Claude reads files in that subtree. Put rules needed for initial planning in a launch-loaded file, and explicitly read subtree instructions before planning there. A _session_ is one conversation with the agent. Repeatable procedures go in a [skill](skills.md), a folder of instructions the agent loads only when it needs them.

A small system you understand really well, and know how to tweak, will almost always beat seven plugins full of conflicting skills and instructions and a hopeful shrug.

## Fix the floor first

Before this course, I had agents audit nearly 13,000 of my own sessions. A surprising amount of the failure had _nothing_ to do with the model. It was the environment the agent was standing on:

- A broken `asdf` Python shim (a small launcher script that picks which Python version runs) broke 252 sessions until I pinned a version. Then it broke zero.
- Bun's TypeScript type definitions (`@types/bun`) weren't being found, which broke type checking in 131 sessions. It vanished the moment I fixed the TypeScript configuration.
- Agents kept guessing at `gh --json` fields that the installed GitHub command-line tool rejects.
- macOS doesn't ship a `timeout` command, non-interactive zsh didn't have my `PATH`, and zsh's `nomatch` option aborted any command containing a SvelteKit route like `[slug]`.

None of those get better with a smarter model. They get better when you fix the shell. It's worth asking yourself how many of these you've been blaming on the model.

We'll come back to how to run an audit like this in [Measuring Whether It Works](measuring-whether-it-works.md).

## Three things that help

These are things I've recently added to my own workflow, and they all make the starting state of a session less of a guess. They're examples of the method, not a starter kit. Add one only when you notice you keep fixing the same start-of-session problem by hand.

- **A `SessionStart` bootstrapper**: A [hook](hooks.md) is a script the harness runs automatically at a set point. A `SessionStart` hook runs when a session begins, so it can inject the branch, worktree (an extra checkout of the same Git repository, in its own directory), ticket, and which local services (a dev server, a database) are running. The agent doesn't have to go looking. [Writing Good Hooks](writing-good-hooks.md) has a table of example hooks, including a context bootstrapper like this one.
- **A smoke test on entry**: Before touching anything, the agent runs the app and the test suite to establish a baseline. If the baseline is already red, that's the first finding. It's not something you discover after your change.
- **An initializer session for long-running work**: Session zero doesn't build anything. It writes an `init.sh` that starts the project, a feature list (a JSON file with one entry per feature to build, each with a `passes` field set to false), an empty progress file, and a baseline commit to roll back to. It writes _no_ feature code. Only `passes` is writable, and that's a rule you set up, so "done" is a fact in a file instead of the agent's opinion. Claude Code won't enforce edits to one field of a file by itself. In the setup this pattern comes from, Anthropic's long-running-agent harness, the rule is stated in the initializer's prompt ("it is unacceptable to remove or edit tests"), and the sources I have don't say what else backs it. To make it hold, enforce it yourself with a [hook](hooks.md) that rejects edits touching anything but `passes`, a script that validates the diff, or a script that is the only thing allowed to flip `passes`. Every session after that starts by reading the progress file and the git log.

That last one makes a lot more sense once you've seen how state survives between sessions. We'll get there in [Where State Lives](where-state-lives.md).

## What to do next

The next lesson, [The Operating Model](the-operating-model.md), gives you a short list of the five things any agent system needs. Use it to decide where each fix from this lesson belongs.

Build small. Delete often. And before you ask for a smarter model, fix the floor.
