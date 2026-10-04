---
title: The Ralph Loop
description: 'The Ralph loop starts a fresh agent for one small task, keeps progress on disk, and repeats. Treat it as a control loop with five parts and real limits.'
---

Long agent sessions rot. The conversation fills up, early decisions get buried, and the agent starts arguing with an earlier version of its own plan. The Ralph loop is the blunt fix: stop trying to keep one session healthy, and throw the session away every time.

The core idea is almost insultingly simple. Start a fresh agent, keep the progress on disk, give it one small task, and repeat. The [original version](https://ghuntley.com/ralph/), from Geoffrey Huntley, is one line of shell:

```sh
while :; do cat PROMPT.md | claude ; done
```

That feeds the same prompt file to a brand-new Claude Code process, over and over, forever. It's the idea in its purest form. Real loops run each pass as `claude -p` (print mode, one non-interactive run that exits when it's done), and everything interesting happens in what you build around that.

## A control loop, not a prompting trick

The right way to think about it is as a **control loop** where the agent happens to be the part that does the work. A thermostat is a control loop: it measures the temperature, compares it to a target, acts, and measures again. The thermostat doesn't need to be smart. It needs a trustworthy thermometer and a way to shut off.

In [Why Systems](why-systems.md), a single agent observes, chooses, acts, and observes again. Here your script takes over most of that. The script measures and chooses the task, and it decides whether to keep the result. The agent only does the work.

## What it costs you

The model's reasoning gets thrown away every iteration (one pass through the loop, with one fresh agent). Files hold state, like what's done and what's left, perfectly well. They only hold _reasoning_ if someone writes it down. So have the agent write down the _why_ of each decision, not just the what, or the next fresh agent will cheerfully undo it.

## Set up the guardrails first

Make sure these exist before you press go:

- **Limits**: Maximum attempts, time, tokens, spend, and so on. Together with the next three items, these are your **governor**: whatever forces the loop to stop.
- **Stall detection**: Some way to tell that the loop is just spinning its wheels. Progress means the work was kept _and_ the score improved. Anything else is a stall.
- **A repeated-failure stop**: Stop when the same failure shows up again. You choose how many repeats you'll tolerate.
- **A stop file**: A file the loop checks at the start of every iteration. Create it and the loop exits cleanly at the next iteration, so you can stop the loop without killing the shell process around it.
- **A resource lock for shared builds**: Only one build runs at a time. You need this once more than one loop or agent shares a machine or a database, like several loops in separate [worktrees](worktrees.md).
- **Per-attempt logs and diffs**: You'll want to investigate what happened if something goes wrong.
- **A human integration gate**: A person decides what gets merged. The loop can keep or roll back work on its own branch, but merging into the main branch is the human's call.

## The five parts of a loop

Under the one-liner, a real loop has five parts:

- **`measure()`**: Runs the checks and returns facts, like error counts, coverage, and open issues, plus a **score**: one number normalized so higher is better, like the negative of "type errors remaining." Going from five errors (score `-5`) to two (score `-2`) improves the score; going from five to six lowers it. The checks in this step are your **oracle**: the thing that decides whether the work is done. A good oracle is one the agent can't edit or argue with.
- **`pick()`**: Chooses one task from those facts.
- **`run()`**: Calls the agent. This is the _only_ part the agent controls.
- **`accept()`**: Keeps the work, or rolls it back with `git reset`. It keeps the work only if nothing on your veto list fired (for example, the agent touched the test files), the tests and build still pass, and the score didn't drop.
- **The governor**: Enforces caps, detects stalls, and checks for the stop file.

Notice how small the agent's part is. It gets one task to do. It still reads the instruction file, the specs, and the plan as reference, but measuring, choosing, accepting, and stopping all belong to your script.

## Setting it up

Explore the problem with the model interactively first. Then write specs (short documents that each describe one topic of the system's behavior). _Then_ start the loop. Here's a good scope test for a spec: you should be able to describe its topic in one sentence without using the word "and."

The files:

- `loop.sh`: The outer script that runs the loop.
- `PROMPT_plan.md` and `PROMPT_build.md`: The planning prompt compares the specs to the code and writes the plan. The building prompt does one task per iteration. How it learns which task is covered below.
- `AGENTS.md` (or `CLAUDE.md` for Claude Code): How to build and test, in about 60 lines. This is the [instruction file](user-and-project-instructions.md) the harness loads into context at the start of every session.
- `IMPLEMENTATION_PLAN.md`: The task list. Throwaway. Regenerate it whenever it goes stale.
- `specs/*.md`: One file per topic.

Every prompt needs:

- One task per iteration.
- "Search before you build," so the agent doesn't reinvent what already exists.
- Tests the agent can't weaken.
- A defined way to stop when it's stuck.
- No ability to push, merge, close issues, or declare the run finished. Don't only ask for that in the prompt. Enforce it with `--disallowedTools` below.

Keep the prompt _identical_ every iteration within a run, and put the current task in a file instead. That way, when you do fix the prompt, the fix applies to every iteration after it. There are two ways to fill that file. In a scripted loop, `pick()` chooses one task from the measured facts and writes it to the file, and the prompt tells the agent to read it. The script owns the choice. In the simpler plan-file version, `IMPLEMENTATION_PLAN.md` is that file, and the building prompt tells the agent to take the next unfinished item. There the agent picks, but only from a list whose scope you set when you wrote the plan.

The headless flags that matter:

- `--output-format json`: Machine-readable output your script can parse.
- `--max-turns`: Caps how many agentic turns (each model request and the tool calls it makes) a single iteration can take.
- `--max-budget-usd`: Caps how much a single iteration can spend.
- `--allowedTools`: Keep this tightly scoped to what the task needs.
- `--disallowedTools`: Use it for anything irreversible.

> [!WARNING] Check for `ANTHROPIC_API_KEY`
> If `ANTHROPIC_API_KEY` is set in your environment, every iteration bills the API instead of your subscription. [Running a Ralph Loop](running-a-ralph-loop.md#governors-are-your-problem) has the first cautionary tale, and it's expensive.

The loop is the easy part. The oracle inside `measure()` decides whether the loop is any good.
