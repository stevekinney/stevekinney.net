---
title: Running a Ralph Loop
description: 'A Ralph loop is only as good as its oracle and its limits. Rank your oracles, set spend caps yourself, and build the check before the loop.'
---

[The Ralph Loop](the-ralph-loop.md) is easy to start. A shell script and a prompt file will get you running in five minutes. What you do in the next five hours decides whether you get a migrated codebase or a very large invoice.

## The oracle is load-bearing

The loop itself is the easy part. What decides whether you get anything useful out of it is everything around it: the **queue** (the list of tasks still to do), the oracle (the check that decides whether an iteration worked), the governor (whatever forces a stop), and the **record** (the log of what each iteration did).

And the oracle fails _silently_. It keeps returning "fine," and every later iteration builds on nothing.

- **Rank your oracles**: An exit code from `rg -l` (a search that lists matching files, so no output means no matches) beats an error count. That beats a parity harness (a script that compares the new system's behavior to the old one's), which beats a green test suite, which beats a coverage percentage. An LLM referee goes last. "Exit code" here means the exit code of a check you wrote. It does _not_ mean the exit code of the agent's own process, which can be `0` even when a run failed. ([Routines and Schedules](routines-and-schedules.md) explains that trap.)
- **Fail closed**: If the measurement step throws, stop the loop. A missing `tsc` binary makes "count the type errors" return zero, which looks an awful lot like done.
- **The script closes the issue, never the agent.**
- **Use typed exit codes**: Give each way the loop can end its own exit code, so the outer script, or whatever supervises it, can tell them apart. One set: success; failure (the oracle said no); blocked (the agent reported it can't proceed); and broken (the loop's own machinery errored, like a missing binary).

## Governors are your problem

The harness gives you per-iteration caps, at best. Total spend, an iteration cap, stall detection, and the kill switch are all on you. These are runaway unattended agent loops. Not every one was a Ralph loop, but every one had no governor:

- [A loop that quietly billed the API instead of a subscription](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb): about $858 the first night and $960 the second. That's $1,818 before anyone noticed.
- [An overnight loop](https://www.makeuseof.com/someone-left-claude-code-running-overnight-and-it-cost-6000/) that re-sent a very large conversation every 30 minutes: about $6,000.
- A summarizer that listed the same directory 14,000 times overnight, for $437. [The same roundup](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb) that reports the first story reports this one too. It stopped only when it ran out of token quota.
- `max_iterations: 0`, which meant "unlimited," produced [1,966 attempts at the same task](https://dev.to/sean8/i-accidentally-made-claude-ask-itself-the-same-question-1966-times-1c5h).

Notice that none of these tripped an alarm. They looked like healthy processes doing their jobs, and the cheapest stop was whoever ran out of money or quota first.

Budget the first 10 to 15 percent of your total spend for calibration runs that you'll throw away. You're buying information about your own prompt and oracle.

## Anti-patterns

- No spec, or several tasks per iteration.
- Running it on a mature codebase full of unwritten conventions. A fresh agent can't follow rules nobody wrote down.
- Copying someone else's prompt instead of tuning your own.
- Very long sessions that hit compaction (replacing the conversation with a summary). That's the thing the loop was supposed to avoid, and it's a risk with loops that run inside one session.

There's one test for whether a task fits: **Can a script tell whether this iteration was better than the last one?** If not, keep a human in charge.

## Advanced techniques

- **Planning and building prompts**: Keep the two separate, and give each branch its own plan. Decide scope (which tasks belong on this branch) when you write the plan, not when the agent picks a task. (This isn't Claude Code's read-only plan mode. It's just two different prompts.)
- **Subagents**: Up to 500 in parallel for reading and searching, and exactly one for build and tests. Reads parallelize safely. Builds fight each other.
- **A second-model reviewer**: Read-only tools, sees only the task and the diff, and returns a structured verdict. It's advisory, and it only runs after the mechanical checks pass. See [Reviewing Agent Work](reviewing-agent-work.md).
- **Queues**: Work out whether a task is done from the work itself (the file was ported, the test exists) rather than from a separate checklist. Then if you delete your state file, the loop can still figure out where it was.
- **Reverse mode**: Generate specs from an existing system, then rebuild from the specs. This raises legal questions as well as technical ones, like whether you're allowed to reimplement software you don't own. Check before you try it.

## Where it works, and what it costs

The strongest evidence is for file-by-file ports and migrations, with test-coverage campaigns right behind them. Cost depends heavily on the kind of task. Per line of the existing codebase, a full language port ran roughly $0.17, versus about $0.004 for a test-coverage campaign.

Coverage is cheap and well documented, yet near the bottom of the oracle ranking above. A test that runs code without checking anything still raises the percentage. That's why coverage comes last in the "good first loops" order under "What to build first" below.

And don't count on [prompt caching](caching-and-cost.md) to cut costs between iterations. Whether a fresh process reuses the previous one's cache is unverified.

## What to build first

Build these in order:

1. The oracle, plus the known-bad changes that prove it can fail.
2. A queue that can rebuild its state from disk.
3. Spending limits, each with an actual number.
4. A one-line-per-iteration log that includes the `session_id`: the ID Claude Code returns in the JSON result of each `claude -p` run, which ties your log line to that run's transcript.
5. _Then_ the loop itself.

Good first loops, in order: a mechanical migration across many files, then driving type errors to zero, then coverage, if at all.

## Ralph loop versus `/goal`

| Property      | `/goal`                                                                         | External loop                      |
| ------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| Context       | Continuing thread                                                               | Fresh context for each attempt     |
| Judge         | A separate model (Claude Code) or the worker itself (Codex)                     | A deterministic script verifies it |
| Governor      | A budget or condition you write into the goal, which nothing enforces by itself | Deterministic part of the script   |
| Durable state | The continuing thread                                                           | Git, files, logs                   |

Zoom out and there are really three ways to run this kind of loop:

| Approach         | Context                  | Who decides it's done                   | Best for                                |
| ---------------- | ------------------------ | --------------------------------------- | --------------------------------------- |
| Bash loop        | Fresh every iteration    | Your script checks a fact on disk       | 10+ iterations, overnight runs          |
| Stop-hook plugin | Builds up in one session | A promise string the model prints       | Short debugging loops                   |
| `/goal`          | Builds up in one session | A separate model (or the worker itself) | Interactive work with a clear end state |

A **Stop-hook plugin** is a plugin that uses a `Stop` hook to feed the same prompt back into one session until the model prints an agreed phrase. That phrase is a **sentinel**, a marker whose presence ends the loop. [Sentinels](sentinels.md) is the whole story.

The rule of thumb: fresh context for long runs, accumulating context for short debugging.

Write the oracle first. Everything else in this lesson is damage control for skipping that step.
