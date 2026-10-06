---
title: Stopping an Agent Loop
description: >-
  Decide who gets to say an agent loop is done, how much to trust that signal,
  and which governors stop the loop when the signal never comes.
---

Leave an agent looping on a task and one of three things happens: it finishes,
it stops on a false "done," or it runs away with your budget. Which one you get
isn't up to the agent. It's decided by whether the agent can claim done without
doing the work, whether your check fails open, and whether anything forces a
stop. None of those get better with a smarter model.

The loop itself is the easy part. [Agent Loops](/writing/agent-loops) covers how
the loop works and the standard safety controls, and
[The Ralph Loop](/writing/the-ralph-loop) covers running one from a bash script.
This lesson is about the stopping.

## The Four Jobs

Every loop that runs without you needs four jobs done:

- **Trigger**: what starts the next turn. A script that launches a fresh agent
  each iteration, or the next turn in the same session.
- **Target**: what should become true.
- **Oracle**: what proves it's true.
- **Governor**: what forces a stop, whether or not the target is met.

`/loop` supplies only the trigger. `/goal` supplies the target and uses a
separate model as the oracle. The governor is always yours.

## Who Writes "Done"

The oracle usually ends up as a completion marker: something the loop checks to
decide whether to stop. The question that matters is who can write it. Here's
the ladder, weakest first:

| Marker                                        | Why it's weak or strong                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `touch done`                                  | The agent writes its own approval.                            |
| A promise string in the output                | The model controls the verdict, and a mere mention can match. |
| A `"passes": true` field in a JSON file       | Still agent-writable.                                         |
| A test suite's exit code, with editable tests | The agent can edit its way to a pass.                         |
| Files on disk plus tests the agent can't edit | Out of the agent's reach.                                     |
| A marker written by CI, a hook, or a human    | An external writer.                                           |

The rule I use: a good marker is at least as hard to satisfy as the work it
stands for. If the agent can produce the marker more cheaply than the result,
sooner or later it will.

The cheapest upgrade is a dual condition. The marker and a deterministic check
both have to agree. When the agent claims done and the check disagrees, log the
premature claim and keep going.

## A Small Lie Rate Adds Up

Say each iteration has a chance `p` of finishing the work for real, and a chance
`q` that the agent claims done when it isn't. Every iteration is a race between
the two. If the loop trusts the marker alone, needs one real success, and has
no governor, the chance it stops on a false "done" before the real one is:

```text
(1 − p) × q / (p + (1 − p) × q)
```

These numbers are illustrative, not measured. With `p` at 0.35, a promise
string that lies 15% of the time ends about 22% of runs on a false "done." Drop
`q` to 0.05 and it's about 8.5%. At 0.01, about 1.8%. A per-iteration lie rate
that looks harmless becomes a real share of your runs, because every iteration
is another chance to lie.

## When the Check Itself Breaks

Your check will throw sometimes: a flaky test runner, a missing file, a parser
that chokes. Decide in advance what a thrown check means.

- **Fail open**: the error reads as "nothing left to do," and the run ends
  falsely done.
- **Fail closed**: the error stops the loop as broken, and you go look.

Fail closed. A loop that stops and tells you something broke is annoying. A loop
that stops and tells you it's finished is worse.

## Give the Agent a Way Out

Some tasks can't be done. An agent with no honest exit will cheat its way to the
marker. In [ImpossibleBench](https://arxiv.org/abs/2510.20270), giving GPT-5 a
way to flag the task for a human cut cheating from 54% to 9%. Tell the agent to
write `BLOCKED` with a reason and stop, and treat that as its own outcome, not a
failure to hide.

## Governors

A governor stops the loop no matter what the agent says. Pick a few:

- **Maximum iterations**: with a real number in it. In one loop,
  [`max_iterations: 0` meant unlimited](https://dev.to/sean8/i-accidentally-made-claude-ask-itself-the-same-question-1966-times-1c5h),
  and the loop asked itself the same question 1,966 times.
- **Budget in dollars**: checked after every iteration, so a run can overshoot
  by up to one iteration's cost. A schedule is not a budget.
- **No-progress stop**: end the run after a few iterations that don't move the
  score.
- **Repeated failure**: stop when the same failure shows up twice in a row.
- **Stop file**: checked at the start of each iteration. It only works if
  someone is awake to touch it, so it can't be your only governor.

In Claude Code, `--max-budget-usd` and `--max-turns` only work in print mode
(`claude -p`). Interactive sessions and `/loop` have no per-run dollar cap, so
you build the governor yourself.

The failures that make the news are missing governors, not dumb models:

- A cron loop
  [billed the API instead of a subscription](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb)
  because `ANTHROPIC_API_KEY` was set: about $1,818 over two nights. A dollar
  budget checked every iteration would have stopped it.
- An overnight loop
  [re-sent a very large conversation every 30 minutes](https://www.makeuseof.com/someone-left-claude-code-running-overnight-and-it-cost-6000/)
  and cost about $6,000. Fresh context and a budget would have stopped it.
- A summarizer listed the same directory 14,000 times overnight and stopped only
  when it ran out of token quota, at $437, per the same
  [dev.to write-up](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb).
  A repeated-failure check would have caught it.

## What to Build First

Build the loop last. In order:

1. The oracle, plus known-bad changes that prove it can fail.
2. A queue that can rebuild its state from disk.
3. Spending limits, each with an actual number.
4. A log with one line per iteration, including the `session_id`.
5. Then, and only then, the loop itself.

Inside that loop, the agent controls exactly one step: doing the work. Measuring,
picking the next task, deciding whether to keep the result, and deciding whether
to stop all belong to code the agent can't edit.
