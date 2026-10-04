---
title: Goals and Loops
description: '/loop repeats work on a schedule while /goal keeps going until a model says the condition is met. Learn which jobs each one covers and which are still yours.'
---

Sooner or later you want the agent to keep going without you. Claude Code ships two commands for that, and people mix them up.

- `/loop` repeats a prompt on a schedule that lives inside your open [session](why-systems.md) (one conversation with the agent, from launch until you exit).
- `/goal` keeps the agent working until an evaluator decides a condition you wrote has been met.

The short version: **`/loop` is for waiting; `/goal` is for working.** Use `/loop` to _notice_ a change, like a deploy finishing. Use `/goal` to move work toward something you can check.

## Four jobs every automated loop needs

A **turn** is one round where the agent responds to a message, running as many commands as it needs before it waits. Some settings count an **agentic turn** instead: one model request plus the tool calls it makes. One turn can contain dozens. Any loop that runs without you has four jobs to get done:

- **Trigger**: What starts the next turn.
- **Target**: What should become true.
- **Oracle**: What decides whether it's true. A good oracle is one the agent being judged can't edit or argue with.
- **Governor**: What forces a stop: caps on time, agentic turns, tokens, spend, or attempts, plus stall detection and a kill switch.

`/loop` only handles the trigger. `/goal` handles the target, and uses a separate evaluator model as the oracle. That's a weaker oracle than a test suite's exit code: it judges only the evidence that gets surfaced, so a persuasive transcript can sway it, and it can't verify files it never read. The governor is on you.

> [!NOTE] Codex's `/goal` is a different pattern
> [Codex](https://developers.openai.com/codex) ships a command with the same name, but the model doing the work audits itself. Its token budget is advisory: when it runs out, the model is told to wrap up (stop new work, summarize, leave a next step), not to stop. And it doesn't exist in `codex exec`, Codex's non-interactive mode, so you can't use it in CI. [Goals and Loops in Practice](goals-and-loops-in-practice.md) has more.

## What a good goal includes

Put all five of these in the goal text:

- **Outcome**: The state you want when it's finished. This is the target.
- **Evidence**: What the agent should show to prove it got there. This is what the oracle looks at.
- **Constraints**: What it must not touch along the way. None of the four jobs covers this one, so it's easy to forget.
- **Budget**: How much time, how many agentic turns, or how much money it may spend.
- **Blocker**: What counts as stuck, and what to do about it.

Budget and blocker are governor inputs, but writing them in the goal text doesn't enforce them. The evaluator can read them. Nothing makes the agent stop at them.

You want three ways for a goal to end: success, blocked, and budget exhausted. The evaluator's verdicts can produce only two of them. "Met" is success, and "impossible" (it judged the condition can never be satisfied) is close to blocked. Budget exhausted isn't a verdict.

Three distinctions help. A checklist is _not_ a goal: it lists steps, while a goal states the end condition. A schedule is _not_ a budget: a `/loop` interval says when to run, not when to stop. And a test is a _proxy_ for an objective, not the objective itself.

## Make the target falsifiable

- **Bad**: "Make this polished."
- **Better**: "The following tests must pass, and the API examples must match the documentation."

The first can never be wrong, so it can never be finished. The second can fail loudly, which is what you want.

## Limits are on you

Set a limit on time, agentic turns, tokens, or spend. Also write a no-progress limit into the condition: "stop after three attempts that don't change the result." That's different from the stall guard below, which only notices the agent going quiet.

There's one catch. `--max-budget-usd` and `--max-turns` (which counts agentic turns) only work in print mode, which is `claude -p`, one non-interactive run. Interactive sessions, `/loop`, and cloud routines have no per-run dollar cap, so you build your own governor. [The Ralph Loop](the-ralph-loop.md) is how you build one.

## How `/goal` works

`/goal` is a `Stop` hook in disguise. A [hook](hooks.md) is a script the harness runs automatically at a lifecycle event, and `Stop` fires when the agent finishes a turn. `/goal` wraps a session-scoped, prompt-based `Stop` hook, one that asks a model to judge instead of running a script. After every turn, a small, fast model (Haiku, by default) reads your condition and the conversation so far, and returns one of three verdicts:

- **Not yet met**: Claude keeps going, using the evaluator's reason as guidance.
- **Met**: The goal clears and is recorded as achieved.
- **Impossible**: The evaluator judged the condition can never be satisfied. The goal clears and is recorded as failed.

A few more things worth knowing:

- **Commands**: `/goal <condition>` sets a goal and starts working. A bare `/goal` shows status and token spend, and `/goal clear` removes it. Resuming a session restores an active goal.
- **Stall guard**: If Claude stops using tools for several turns in a row, Claude Code hands control back to you. The goal stays set, and evaluation resumes after your next message.
- **Permissions don't change**: A goal doesn't change your [permission mode](https://code.claude.com/docs/en/permissions), meaning how much the agent may do without asking. To walk away, use `auto`, where a classifier approves the actions it judges safe. Otherwise the next permission prompt just waits for you.
- **Errors**: Authentication failures, an exhausted credit balance, an unfixable context overflow, and an unavailable model clear the goal. Fix the cause and set it again. Other errors leave it set. Claude Code retries ones that tend to clear on their own (an overloaded server) and pauses after three tries. It pauses at once on ones a retry would only repeat, like a rate limit.
- **Background work**: Evaluation waits while subagents or background shell commands are still running. If they _keep_ running, Claude Code does a check-in at 30 minutes (then an hour, then every two hours). It lists the running tasks and has Claude read their output, keep waiting if they're progressing, and fix or stop any that are stuck.

The [`/goal` documentation](https://code.claude.com/docs/en/goal) has the rest.

## How `/loop` works

What you type decides which machine you get.

- **`/loop 5m …`**: A fixed, recurring cron job (a task that fires on a clock) with an ID.
- **`/loop …` with no interval**: Self-paced. Claude picks a delay of 1 to 60 minutes after each run.
- **A bare `/loop`**: Runs the built-in maintenance prompt (continue unfinished work, tend the current branch's pull request, run cleanup passes when nothing else is pending), or your `loop.md` if you have one. [Goals and Loops in Practice](goals-and-loops-in-practice.md) covers `loop.md`.

Every run is an ordinary turn in the _current_ conversation, so context accumulates. Each run costs a little more than the last until compaction (replacing the conversation so far with a summary) kicks in, and there are no interactive caps on turns, dollars, or iterations.

Some sharp edges:

- **Self-paced loops can die quietly**: If a run forgets to reschedule, Claude Code arms one fallback wakeup about 20 minutes later. If _that_ run forgets too, the loop just ends, without telling you.
- **Stopping is asymmetric**: Esc, or asking Claude to stop, ends a self-paced loop. A fixed-interval cron keeps firing until you delete it by ID.
- **A `/loop` task belongs to its session**: `/clear` empties the conversation and ends it, and `--resume` doesn't bring back a self-paced loop. Recurring tasks also expire after seven days.

A desktop scheduled task or a cloud routine outlives any session. [Routines and Schedules](routines-and-schedules.md) covers them, and the [scheduled tasks documentation](https://code.claude.com/docs/en/scheduled-tasks) covers the scheduler.

A goal you can't fail is just a wish with a token meter running.
