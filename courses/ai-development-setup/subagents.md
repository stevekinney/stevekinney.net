---
title: Subagents
description: 'A subagent is a worker with its own context, not just another set of instructions. Learn what it starts with, what it reports, and when delegating pays.'
---

Your main session is three hours deep. The agent has read forty files, tried two approaches, and is now being asked to review a diff. Its context is full of everything _except_ a fresh set of eyes.

That's the problem a subagent solves. It also introduces new ones, which is what the next four lessons are about.

## Knowledge versus worker

- A [skill](skills.md) is **knowledge**.
- A **subagent** is a **worker**.

A subagent is a helper agent that the main agent (the one you're talking to) starts with its own fresh context and a written brief, and it returns only a final report. (A _context_ is everything the model can see when it decides its next step.) In a sense, subagents are our first primitive for parallelization in agentic workflows. Use one when you can delegate a _bounded outcome_, not merely split the task into more steps.

Here's the cleanest way to keep the three things straight. A **prompt** describes a task. A **skill** packages a reusable way of doing a task. A **subagent** creates a separate execution and context boundary in which a task is performed.

The basics:

- Subagents get their own context, separate from the main agent.
- The main agent can spin up multiple subagents in parallel.
- They do their thing and then report back.
- You can custom-tailor each one with its own skills and permissions.

In practice, that gets you a separate working context, independent investigation, and parallel execution.

It's tempting to design a complete organization chart right out of a [Richard Scarry](https://en.wikipedia.org/wiki/Richard_Scarry) book. My advice is to start with a few narrowly scoped agents.

## What a subagent starts with, never gets, and reports

A subagent isn't a clone of the main agent. What it knows is precisely what it's handed.

It _starts with_:

- Its own system prompt and environment details.
- The task message the main agent writes for it.
- Your `CLAUDE.md` or `AGENTS.md` (the instruction files the harness loads each session), unless it's an `Explore` or `Plan` agent (two built-in read-only subagents) or has `omitClaudeMd: true` (a setting that skips loading those files).
- A git status snapshot, unless it's `Explore` or `Plan`.
- The full text of any preloaded skills, meaning the ones listed in its `skills:` field, loaded in full when it starts.

It _never gets_:

- Your conversation with the main agent.
- Skills you already invoked in the main conversation.
- Files you and the main agent already read.

It _reports back with_:

- Only the final report. The main agent does _not_ see the subagent's conversation.
- Whether it completed its mission. If it hit its `maxTurns` limit (a cap on agentic turns, each of which is one request to the model plus the tool calls it makes in that step), its work might be marked `partial`.

A subagent's final report is its return value to the main agent that started it. While it runs, it can also exchange messages with that main agent through `SendMessage` (a tool that sends a message to another agent), and the main agent can resume a finished subagent the same way (except `Explore` and `Plan`, which are one-shot). By default, subagents you dispatch from a session report to the main agent and don't talk to each other. A worker that's been given `SendMessage`, in a workflow for example, can message other agents. [Agent teams](agent-teams.md) go further: teammates share a task list, claim work from it, and message each other directly.

Everything in "never gets" is why the brief matters so much. If the main agent forgets to mention a constraint, the subagent will never find out. [Delegating Well](delegating-well.md) is about writing that brief.

## How many subagents

Aim for about 5–7 well-scoped agent definitions, meaning saved roles Claude can pick from. That's how many you keep, not how many run at once. Claude Code caps concurrent runs separately, which [Configuring Subagents](subagent-configuration.md) covers. Here's [Anthropic](https://claude.com/blog/subagents-in-claude-code) on why:

> "Flooding Claude with options makes automatic delegation less reliable."

More agents means more descriptions to choose between, and the main agent starts picking wrong. The per-agent settings are in [Configuring Subagents](subagent-configuration.md), and [Exemplar Subagents](exemplar-subagents.md) has ideas for which few to start with.

## When to delegate

[Anthropic's rough signal](https://claude.com/blog/subagents-in-claude-code): ten or more files to explore, or three or more independent pieces of work. If you already know which file it is, just do it yourself.

Two questions that don't get asked enough:

- Can its changes actually be isolated?
- Will its result arrive in time to matter?

And remember that parallelism can't remove serial work. If 40% of the job is serial, four workers finish about 1.8× faster than one, at best. ([Amdahl's law](https://en.wikipedia.org/wiki/Amdahl%27s_law): still undefeated.)

### Fork or fresh

You have two ways to start a worker. A _fork_ copies your current conversation, so the worker inherits everything you've discussed. A _fresh_ subagent starts from only the brief.

Only fork (the `/subtask` command) when the task depends on decisions you can't restate compactly. Otherwise, write a brief and send a fresh subagent. It can run on a cheaper model, and it doesn't inherit your assumptions.

## Invoking a subagent

There are four ways, from least to most explicit:

- **Automatic**: The main agent happens to pick this particular subagent.
- **By name** (for example, "Use the code reviewer agent"): A strong hint, but _not_ a guarantee.
- **@-mention**: You type `@` and the agent's name. The agent is invoked, and the main agent writes the brief.
- **`claude --agent`**: The main agent _is_ this particular agent for the whole session.

Both of these are true. A subagent's `description` is what automatic delegation reads, so write it well. But whenever delegation actually matters, use the by-name or @-mention rung. Don't leave it to automatic routing, which has failed outright in some releases. As in, agents that never got picked at all.

## The cost of context

Yes, subagents use their own context window. They don't inherit the noise from their parent, and they keep their own noise isolated. In a perfect world, the main agent gives the subagent just what it needs to do its job, and the subagent reports back just what the main agent needs.

But if you're using subagents for parallelism and each one has to do the same work, you're multiplying the token costs. It's worth sitting down and thinking about how information gets passed around in your workflow.

And spawning isn't free, either. A subagent costs somewhere around 7.5k–44k tokens before it does anything at all.

### Context isolation is not environment isolation

One more thing. A fresh conversation does _not_ get its own files, databases, ports, credentials, or browser profiles. Two subagents editing the same working directory are still editing the same working directory. [Worktrees](worktrees.md) (extra checkouts of the same Git repository, each in its own directory with its own files and branch) are how you fix that, and they're a deep rabbit hole.

A subagent buys you a clean head. It doesn't buy you a clean desk.
