---
title: The Ralph Loop
description: 'A fresh agent for one small task, progress on disk, repeat. Build it as a control loop: the oracle first, then the limits, and the loop itself last.'
---

Long agent sessions rot. The conversation fills up, early decisions get buried, and the agent starts arguing with an earlier version of its own plan. The Ralph loop is the blunt fix: stop trying to keep one session healthy, and throw the session away every time.

The core idea is almost insultingly simple. Start a fresh agent, keep the progress on disk, give it one small task, and repeat. The [original version](https://ghuntley.com/ralph/), from Geoffrey Huntley, is one line of shell:

```sh
while :; do cat PROMPT.md | claude ; done
```

That feeds the same prompt to a brand-new Claude Code process, forever. Real loops run each pass as `claude -p` (print mode: one non-interactive run that exits when it's done), and everything interesting happens in what you build around it.

## A control loop, not a prompting trick

Think of it as a **control loop** where the agent happens to be the part that does the work. A thermostat is a control loop: it measures the temperature, compares it to a target, acts, and measures again. The thermostat doesn't need to be smart. It needs a trustworthy thermometer and a way to shut off.

In [Towards Systems Thinking](why-systems.md), a single agent observes, chooses, acts, and observes again. Here your script takes over most of that: it measures, chooses the task, and decides whether to keep the result. The agent only does the work.

## What it costs you

Every iteration (one pass through the loop, with one fresh agent) runs the same prompt, checks and commits its work, and only then updates the state on disk. Nothing rots, because nothing lives long enough to. The price is that the model's reasoning gets thrown away every time. Files hold state like what's done and what's left perfectly well, but they only hold _reasoning_ if someone writes it down. Have the agent record the _why_ of each decision, or the next fresh agent will cheerfully undo it.

## Set up the guardrails first

Make sure these exist before you press go:

- **Limits**: Maximum attempts, time, tokens, spend, and so on. Together with the next three items, these are your **governor**: whatever forces the loop to stop.
- **Stall detection**: Some way to tell that the loop is spinning its wheels. Progress means the work was kept _and_ the score improved. Anything else is a stall.
- **A repeated-failure stop**: Stop when the same failure shows up again. You choose how many repeats you'll tolerate.
- **A stop file**: The loop checks for it at the start of every iteration and exits cleanly if it exists, so you never have to kill the shell process.
- **A resource lock for shared builds**: Only one build runs at a time. You need this once more than one loop or agent shares a machine or a database, like several loops in separate [worktrees](worktrees.md).
- **Per-attempt logs and diffs**: So you can investigate when something goes wrong.
- **A human integration gate**: The loop can keep or roll back work on its own branch, but a person decides what merges into the main branch.

## The five parts of a loop

Under the one-liner, a real loop has five parts:

- **`measure()`**: Runs the checks and returns facts, like error counts, coverage, and open issues, plus a **score**: one number normalized so higher is better, like the negative of "type errors remaining." Going from five errors (score `-5`) to two (score `-2`) improves the score. These checks are your **oracle**: the thing that decides whether the work is done. A good one is something the agent can't edit or argue with.
- **`pick()`**: Chooses one task from those facts.
- **`run()`**: Calls the agent. This is the _only_ part the agent controls.
- **`accept()`**: Keeps the work only if nothing on your veto list fired (say, the agent touched the test files), the tests and build still pass, and the score didn't drop. Run each attempt in a disposable checkout made from the last accepted snapshot. On rejection, save its logs and diff outside that checkout, then throw the checkout away. That removes tracked edits _and_ new files. Bare `git reset` leaves working files unchanged, and even `--hard` doesn't generally remove new untracked files, so neither is a complete rollback.
- **The governor**: Enforces caps, detects stalls, and checks for the stop file.

Notice how small the agent's part is: one task. It still reads the instruction file, the specs, and the plan, but measuring, choosing, accepting, and stopping all belong to your script.

## Setting it up

Explore the problem with the model interactively first. Then write specs (short documents that each describe one topic of the system's behavior). _Then_ start the loop. A good scope test for a spec: you can describe its topic in one sentence without the word "and."

The files:

- `loop.sh`: The outer script that runs the loop.
- `PROMPT_plan.md` and `PROMPT_build.md`: The planning prompt compares the specs to the code and writes the plan. The building prompt does one task per iteration.
- `AGENTS.md` (or `CLAUDE.md` for Claude Code): How to build and test, in about 60 lines. This is the [instruction file](user-and-project-instructions.md) the harness loads into context at the start of every session.
- `IMPLEMENTATION_PLAN.md`: The task list. Throwaway. Regenerate it whenever it goes stale.
- `specs/*.md`: One file per topic.

Every prompt needs:

- One task per iteration.
- "Search before you build," so the agent doesn't reinvent what already exists.
- Tests the agent can't weaken.
- A defined way to stop when it's stuck.
- No ability to push, merge, close issues, or declare the run finished. Don't just ask in the prompt; enforce it with `--disallowedTools` below.

Keep the prompt _identical_ every iteration within a run, and put the current task in a file instead. Then a fix to the prompt applies to every iteration after it. You can fill that file two ways. In a scripted loop, `pick()` writes one task to it and the script owns the choice. In the simpler plan-file version, `IMPLEMENTATION_PLAN.md` is that file and the agent takes the next unfinished item, so it picks, but only from a list whose scope you set.

The headless flags that matter:

- `--output-format json`: Machine-readable output your script can parse.
- `--max-turns`: Caps how many agentic turns (each model request and the tool calls it makes) a single iteration can take.
- `--max-budget-usd`: Caps how much a single iteration can spend.
- `--allowedTools`: Keep this tightly scoped to what the task needs.
- `--disallowedTools`: Use it for anything irreversible.

> [!WARNING] Check for `ANTHROPIC_API_KEY`
> If `ANTHROPIC_API_KEY` is set in your environment, every iteration bills the API instead of your subscription. [Governors are your problem](#governors-are-your-problem) has the cautionary tale, and it's expensive.

A shell script and a prompt file will get you running in five minutes. What you do in the next five hours decides whether you get a migrated codebase or a very large invoice.

## The oracle is load-bearing

The loop itself is the easy part. What decides whether you get anything useful is everything around it: the **queue** (the tasks still to do), the oracle, the governor, and the **record** (the log of what each iteration did). Of those, the oracle matters most, and it fails _silently_. It keeps returning "fine," and every later iteration builds on nothing.

- **Rank your oracles**: An exit code from `rg -l` (a search that lists matching files, so no output means no matches) beats an error count. That beats a parity harness (a script that compares the new system's behavior to the old one's), which beats a green test suite, which beats a coverage percentage. An LLM referee goes last. That exit code comes from a check you wrote, _not_ from the agent's own process, which can return `0` even when a run failed. [Routines and Schedules](routines-and-schedules.md) explains that trap.
- **Rank who can write "done"**: `touch done` lets the agent write its own approval. A promise string in the output is controlled by the model, and a mere mention can match. A `"passes": true` field in a JSON file is still agent-writable, and a test suite's exit code is too if the agent can edit the tests. Files on disk plus tests the agent can't edit are out of its reach, and a marker written by CI, a hook, or a human is better still. A good marker is at least as hard to satisfy as the work it stands for. The cheapest upgrade is a dual condition: the marker and a deterministic check both have to agree, and a claim the check disagrees with gets logged as premature while the loop keeps going.
- **A small lie rate adds up**: Say each iteration has a chance `p` of really finishing and a chance `q` of claiming done when it hasn't. If the loop trusts the marker alone, needs one real success, and has no governor, the chance it stops on a false "done" is `(1 − p) × q / (p + (1 − p) × q)`. These numbers are illustrative, not measured: with `p` at 0.35, a promise string that lies 15% of the time ends about 22% of runs falsely done. At `q` = 0.05 it's about 8.5%, and at 0.01 about 1.8%. Every iteration is another chance to lie.
- **Fail closed**: If the measurement step throws, stop the loop. A missing `tsc` binary makes "count the type errors" return zero, which looks an awful lot like done.
- **The script closes the issue, never the agent.**
- **Use typed exit codes**: Give each way the loop can end its own exit code so whatever supervises it can tell them apart. One set: success; failure (the oracle said no); blocked (the agent reported it can't proceed); and broken (the loop's own machinery errored, like a missing binary).

## Governors are your problem

The harness gives you per-iteration caps, at best. Total spend, an iteration cap, stall detection, and the kill switch are all on you. Not every one of these runaway loops was a Ralph loop, but none had a governor:

- [A loop that quietly billed the API instead of a subscription](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb): about $858 the first night and $960 the second. That's $1,818 before anyone noticed.
- [An overnight loop](https://www.makeuseof.com/someone-left-claude-code-running-overnight-and-it-cost-6000/) that re-sent a very large conversation every 30 minutes: about $6,000.
- A summarizer that listed the same directory 14,000 times overnight, for $437, reported in [the same roundup](https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb). It stopped only when it ran out of token quota.
- `max_iterations: 0`, which meant "unlimited," produced [1,966 attempts at the same task](https://dev.to/sean8/i-accidentally-made-claude-ask-itself-the-same-question-1966-times-1c5h).

None of these tripped an alarm. They looked like healthy processes doing their jobs, and the stop was whoever ran out of money or quota first.

Budget the first 10 to 15 percent of your total spend for calibration runs that you'll throw away. You're buying information about your own prompt and oracle.

## Anti-patterns

- No spec, or several tasks per iteration.
- Running it on a mature codebase full of unwritten conventions. A fresh agent can't follow rules nobody wrote down.
- Copying someone else's prompt instead of tuning your own.
- Loops that run inside one session long enough to hit compaction (replacing the conversation with a summary). That's the thing the loop was supposed to avoid.

There's one test for whether a task fits: can a script tell whether this iteration was better than the last one? If not, keep a human in charge.

## Advanced techniques

- **Planning and building prompts**: Keep the two separate, and give each branch its own plan. Decide scope when you write the plan, not when the agent picks a task. (This isn't Claude Code's read-only plan mode, just two different prompts.)
- **Subagents**: Fan out reads and searches, but use exactly one worker for shared builds and tests. Ordinary Claude Code subagents default to 20 concurrent workers ([subagent limit](https://code.claude.com/docs/en/sub-agents#concurrent-subagent-limit)); dynamic workflows default to at most 16 and allow a configured limit up to 256 ([workflow limits](https://code.claude.com/docs/en/workflows#behavior-and-limits)). Start small anyway: parallel reads still compete for resources and spend, and shared builds can interfere with each other.
- **A second-model reviewer**: Read-only tools, sees only the task and the diff, and returns a structured verdict. It's advisory, and it only runs after the mechanical checks pass. See [Agent reviewers](verification-and-evidence.md#agent-reviewers).
- **Queues**: Work out whether a task is done from the work itself (the file was ported, the test exists) rather than a separate checklist. Then the loop can find its place even if you delete your state file.
- **Reverse mode**: Generate specs from an existing system, then rebuild from the specs. This raises legal questions, like whether you're allowed to reimplement software you don't own. Check before you try it.

## Where it works, and what it costs

The strongest evidence is for file-by-file ports and migrations, with test-coverage campaigns right behind them. Cost depends heavily on the task. Per line of the existing codebase, a full language port ran roughly $0.17, versus about $0.004 for a test-coverage campaign.

Coverage is cheap and well documented, yet near the bottom of the oracle ranking. A test that runs code without checking anything still raises the percentage, which is why coverage comes last in the "good first loops" under "What to build first" below.

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

Zoom out and there are three ways to run this kind of loop:

| Approach         | Context                  | Who decides it's done                   | Best for                                |
| ---------------- | ------------------------ | --------------------------------------- | --------------------------------------- |
| Bash loop        | Fresh every iteration    | Your script checks a fact on disk       | 10+ iterations, overnight runs          |
| Stop-hook plugin | Builds up in one session | A promise string the model prints       | Short debugging loops                   |
| `/goal`          | Builds up in one session | A separate model (or the worker itself) | Interactive work with a clear end state |

A **Stop-hook plugin** is a plugin that uses a `Stop` hook to feed the same prompt back into one session until the model prints an agreed phrase. That phrase is a **sentinel**, a marker whose presence ends the loop. [Sentinels](sentinels.md) is the whole story.

The rule of thumb: fresh context for long runs, accumulating context for short debugging.

Write the oracle first. Everything else in this lesson is damage control for skipping that step.
