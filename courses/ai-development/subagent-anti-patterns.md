---
title: Subagent Anti-Patterns
description: >-
  Avoid over-splitting work across subagents, losing ownership, duplicating
  context, and accepting unaudited parallel output.
---

Subagents are useful when they reduce context pressure. They are harmful when
they create an illusion of rigor without a clear owner.

## Anti-Pattern: Splitting Tiny Work

Do not create a subagent to rename a function, update one test, or read one file.
The overhead is larger than the task.

Use a subagent when the work has a natural boundary: security review, test audit,
repository orientation, browser reproduction, or release checklist.

## Anti-Pattern: No Return Contract

Bad:

```text
Have a subagent look into this.
```

Better:

```text
Ask a read-only subagent to inspect authentication tests. Return confirmed gaps
only, with file references and the exact regression each test should cover.
```

Subagent output should be easy to accept, reject, or turn into a task.

## Anti-Pattern: Parallelizing Shared State

Two agents editing the same files at once will often fight. Parallelize research,
not overlapping writes. If multiple agents need to edit, give each one exclusive
files or sequence the work.

## Anti-Pattern: Treating Subagents as Review

A subagent can help review, but the main agent or human still owns the decision.
Run the tests, inspect the diff, and resolve conflicts in one place.

## Anti-Pattern: Waiting at Every Stage

When you fan a list of items out through several stages, the obvious version
runs each stage across every item, waits for all of them, then starts the next
stage. That wait is a barrier, and every item pays for the slowest item in the
stage before it.

Here's a made-up run with three items and two stages, enough agents to run them
all at once, and durations in minutes:

| Item | Stage 1 | Stage 2 | Its own path |
| ---- | ------- | ------- | ------------ |
| A    | 1       | 10      | 11           |
| B    | 1       | 1       | 2            |
| C    | 10      | 1       | 11           |

With a barrier, stage 2 can't start until C finishes stage 1, so the run takes
10 + 10 = 20 minutes. Pass each item to the next stage as soon as it's ready,
and the run takes as long as the slowest single path: 11 minutes. Same work,
almost half the time. The more item durations vary, the bigger the gap.

Claude Code [workflow scripts](https://code.claude.com/docs/en/workflows), which
are JavaScript files that orchestrate many agents, have both shapes built in.
`pipeline(items, ...stages)` sends each item through every stage on its own.
Calling `parallel()` once per stage puts a barrier between stages. The same
thing happens with `Promise.all` per stage in your own code. Keep the barrier
only when a stage needs every result from the one before.

The win has a ceiling. Workflows run up to 16 agents at once by default, and
past that, work queues. The [delegation economics
experiment](/experiments/delegation-economics) lets you play with the numbers.

## Anti-Pattern: Filtering Out Failures

In a workflow, an agent that gets stopped or hits an unrecoverable API error
resolves to `null`. That item skips its remaining stages, and `pipeline()`
keeps the `null` in its results. The tempting cleanup looks like this:

```js
const reviews = (await pipeline(files, review)).filter(Boolean);
```

Now the run reports success with fewer results than it started with, and
nothing tells you which items it lost. Count the nulls and report them instead:

```js
const results = await pipeline(files, review);
const failed = files.filter((_, index) => results[index] === null);

return { reviewed: files.length - failed.length, total: files.length, failed };
```

Structured output that still fails validation after its retries is a different
failure: it throws an error instead of becoming `null`. Handle both.

## When Not to Fan Out

| Skip the fan-out when...                                   | Do this instead                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| You're making one edit.                                    | Make the edit in the session.                                       |
| The shape of the work is unknown, or the plan will change. | Work it out in the session, or with one subagent, until it settles. |
| You need a person's approval partway through.              | Run the first half, review it yourself, then start the second.      |
| Agents would change the same files.                        | Give each agent its own worktree, or keep the edits in one agent.   |
| Checking the results costs more than the fan-out saves.    | Do the work serially, where each step is easy to verify.            |

The best subagent output is narrow enough that it improves the main workflow
instead of becoming a second workflow.
