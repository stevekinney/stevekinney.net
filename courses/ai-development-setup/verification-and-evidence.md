---
title: Verification and Evidence
description: "A green check only counts if the agent can't reach it. Learn the ways evidence lies, how to protect your oracle, and how to match proof to the claim."
---

An agent tells you the feature works. The tests pass. There's even a screenshot. Then you open the app, and the button does nothing.

Nobody lied, exactly. The agent reported evidence that couldn't have failed. The trick is telling the difference between a check that measures something and a check that merely agrees with the agent.

## The ideal

Start with the **oracle**: whatever decides that the work is done. It might be a test suite, a linter, a script, or a person. What matters is that the answer comes from somewhere other than the agent's opinion of its own work.

The ideal is that the oracle isn't something the agent being judged can reach. That can be as simple as:

- Tests, linters, or static analysis (tools that inspect code without running it), as long as the agent can't edit them. [Protecting the oracle](#protecting-the-oracle) covers how.
- Continuous integration (CI), a service that runs your checks on every push, running on a system the agent can't touch.

It's not lost on me that this isn't always possible. In that case, the default option is going to be _you_. Your review is incredibly valuable, but only _sometimes_. It's a lot less valuable when all it produces is "nope, that button still isn't aligned correctly," pasted back one round at a time. That's the [meat proxy](why-systems.md) problem again.

## The definition of done

Before the agent starts, write down what "done" means. A **definition of done** is the evidence half of a [task contract](planning-and-task-contracts.md): you write it in the task prompt, the spec, or the ticket before the agent starts. Each _acceptance criterion_ in it is one behavior claim plus the check that would disprove it. A definition of done names:

- A behavior claim.
- A command, inspection, or observation that could disprove it.
- What a failure looks like.
- What evidence to keep.
- Who owns changing the check.

That last item matters more than it looks. Whoever can change the check can make it pass.

## Three ways evidence lies

- **The false green**: `./check.sh 2>&1 | head` exits `0` even when `check.sh` exits `7`, because a pipeline reports the exit status of its last command, and that's `head`. In bash, `echo ${PIPESTATUS[@]}` prints `7 0`: the truth and the lie, side by side. No model required.
- **The test that tests nothing**: Give an agent a buggy `slugify` function and three visible tests, and a special-cased solution (one that hard-codes the answers to exactly those three inputs) scores 3/3. Run the held-out suite, a different set of tests you wrote _before_ the agent started and never showed it, and the same solution scores 0/3. If the agent can reach the stop condition, it's a target, not a measurement.
- **The plausible screenshot**: A grey, clickable button photographs beautifully. And Playwright's `toHaveScreenshot` assertion goes green on its second run with no product change at all, because the first run wrote the baseline. A check that writes its own expected value can't fail.

The common thread: distrust any evidence whose author and judge are the same process. In the second and third examples that's literal. The agent can write what's being checked, and the check writes its own expected value. In the first, the pipeline reports on itself, and its status stands in for the checker's.

## Protecting the oracle

An agent has two routes to a green suite. It can fix the code, or it can change the test. The second one has a sneaky cousin: change the _configuration_. That might be a `jest.config` exclusion that skips a failing file, a lowered coverage floor, or an `eslint-disable` comment that silences a rule.

Here's how to close those routes:

- **Freeze the tests**: Deny edits to test files and snapshot baselines with permission rules (settings that allow or deny specific tool calls), not just with an instruction. An instruction is a request. A permission rule is much stronger, because the harness enforces it whatever the model decides. But it isn't airtight: a deny on `Edit` alone doesn't stop a script or shell command from writing the same file. For anything that must hold, add a [hook](hooks.md) or the sandbox.
- **Watch the protected paths**: In CI, flag any pull request that changes tests, baselines, or test configuration alongside the implementation.
- **Ratchet the suppressions**: Count `eslint-disable`, `@ts-expect-error`, skipped tests, and assertions. The number of escape hatches shouldn't go up. The number of assertions shouldn't go down.
- **Gate on diff-scoped coverage**: Coverage normally tells you how much of the whole codebase your tests execute. _Diff-scoped_ coverage asks a narrower question: did any test run the lines this change touched? [Across 4,882 agent-authored pull requests](https://arxiv.org/abs/2607.18057), 64.8% of the Python ones had no changed line executed by _any_ existing test. In the Java pull requests that didn't improve test coverage, agents deleted tests 2.6× as often as they added them. A green suite that never runs the changed lines is no evidence at all.
- **Test the judge**: Feed your oracle deliberately broken code. Any broken variant (a _mutant_) that still passes is a blind spot. Do the same for a model-based grader: give it one wrong answer, and one right answer phrased three different ways.

Freezing is a [permissions](https://code.claude.com/docs/en/permissions) job, and some of the watching is a hook job. We'll sort out which rule needs which tool in [The Enforcement Ladder](the-enforcement-ladder.md).

## Match the evidence to the claim

Different claims need different proof:

| Claim          | Weak evidence     | Better evidence                                                           |
| -------------- | ----------------- | ------------------------------------------------------------------------- |
| It renders     | The agent says so | A screenshot that a person or tool inspects                               |
| It looks right | A screenshot      | A diff against a baseline written by a _different_ run                    |
| It works       | A screenshot      | Role, name, and state assertions (the Save button exists and is disabled) |
| It's done      | Tests pass        | Each acceptance criterion mapped to evidence, re-run after the final edit |
| It's delivered | It merged         | Merged, CI green on `main` after the merge, review threads resolved       |

A screenshot proves that a render happened. It doesn't prove the change is correct, accessible, or responsive. Put role-and-state assertions (checks on what the page exposes, like a button's accessible name and whether it's disabled) in the agent's inner loop, the edit-run-check cycle it repeats while it works. Save the pixel diffs for the merge boundary, the point where a change is about to land on `main`. And leave comparing two images to a pixel-diff tool or a person, not the model.

A claim without a check that could have failed isn't a claim yet. It's a hope.
