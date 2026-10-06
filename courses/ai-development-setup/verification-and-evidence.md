---
title: Verification and Evidence
description: "A green check only counts if the agent can't reach it. How evidence lies, how to protect your oracle, and how to review an agent's diff."
---

An agent tells you the feature works. The tests pass. There's even a screenshot. Then you open the app, and the button does nothing.

Nobody lied, exactly. The agent reported evidence that couldn't have failed. The trick is telling the difference between a check that measures something and a check that merely agrees with the agent.

## The ideal

Start with the **oracle**: whatever decides that the work is done. It might be a test suite, a linter, a script, or a person. What matters is that the answer comes from somewhere other than the agent's opinion of its own work.

Ideally, the agent being judged can't reach the oracle. That can be as simple as:

- Tests, linters, or static analysis (tools that inspect code without running it), as long as the agent can't edit them. [Protecting the oracle](#protecting-the-oracle) covers how.
- Continuous integration (CI), a service that runs your checks on every push, running on a system the agent can't touch.

It's not lost on me that this isn't always possible. When it isn't, the oracle is _you_. Your review is incredibly valuable, but only _sometimes_. It's worth a lot less when all it produces is "nope, that button still isn't aligned correctly," pasted back one round at a time. That's the [meat proxy](why-systems.md) problem again. [Reviewing agent work](#reviewing-agent-work), below, covers how to make your review count.

## The definition of done

A **definition of done** is the evidence half of a [task contract](planning-and-task-contracts.md): what "done" means, written in the task prompt, the spec, or the ticket before the agent starts. Each _acceptance criterion_ in it names:

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

The common thread: distrust any evidence whose author and judge are the same process. In the second and third examples that's literal: the agent writes what's being checked, and the check writes its own expected value. In the first, the pipeline's status stands in for the checker's.

## Protecting the oracle

An agent has two routes to a green suite. It can fix the code, or it can change the test. The second one has a sneaky cousin: change the _configuration_. That might be a `jest.config` exclusion that skips a failing file, a lowered coverage floor, or an `eslint-disable` comment that silences a rule.

Here's how to close those routes:

- **Freeze the tests**: Deny edits to test files and snapshot baselines with permission rules (settings that allow or deny specific tool calls), not just an instruction. An instruction is a request. The harness enforces a permission rule whatever the model decides. It still isn't airtight: a deny on `Edit` alone doesn't stop a script or shell command from writing the same file. For anything that must hold, add a [hook](hooks.md) or the sandbox.
- **Watch the protected paths**: In CI, flag any pull request that changes tests, baselines, or test configuration alongside the implementation.
- **Ratchet the suppressions**: Count `eslint-disable`, `@ts-expect-error`, skipped tests, and assertions. The number of escape hatches shouldn't go up. The number of assertions shouldn't go down.
- **Gate on diff-scoped coverage**: Coverage normally measures how much of the whole codebase your tests execute. _Diff-scoped_ coverage asks whether any test ran the lines this change touched. [Across 4,882 agent-authored pull requests](https://arxiv.org/abs/2607.18057), 64.8% of the Python ones had no changed line executed by _any_ existing test. In the Java pull requests that didn't improve test coverage, agents deleted tests 2.6× as often as they added them. A green suite that never runs the changed lines is no evidence at all.
- **Test the judge**: Feed your oracle deliberately broken code. Any broken variant (a _mutant_) that still passes is a blind spot. Do the same for a model-based grader: give it one wrong answer, and one right answer phrased three different ways.

Freezing is a [permissions](https://code.claude.com/docs/en/permissions) job, and some of the watching is a hook job. We'll sort out which rule needs which tool in [The Enforcement Ladder](the-enforcement-ladder.md).

## Match the evidence to the claim

Different claims need different proof:

| Claim           | Weak evidence              | Better evidence                                                                                         |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| It renders      | The agent says so          | A screenshot that a person or tool inspects                                                             |
| It looks right  | A screenshot               | A diff against a baseline written by a _different_ run                                                  |
| It works        | A screenshot               | Role, name, and state assertions (the Save button exists and is disabled)                               |
| Tests pass      | A run from ten minutes ago | Test output with zero failures from after the final edit                                                |
| It's done       | Tests pass                 | Each acceptance criterion mapped to evidence, re-run after the final edit, and the final diff inspected |
| Agent completed | The subagent's own report  | A diff, or a [referee](exemplar-subagents.md#referee)'s verdict                                         |
| It's delivered  | It merged                  | Merged, CI green on `main` after the merge, review threads resolved                                     |

I didn't invent this table. Superpowers' [verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) skill includes one, and it makes the agent identify the command that would prove the claim, run it _in full_, and confirm the output says what the agent is about to claim. The [verification gate skill](exemplar-skills.md#verification-gate) covers it.

A screenshot proves that a render happened, not that the change is correct, accessible, or responsive. Put role-and-state assertions (checks on what the page exposes, like a button's accessible name) in the agent's inner loop, the edit-run-check cycle it repeats while it works. Save the pixel diffs for the merge boundary, where a change is about to land on `main`, and leave comparing two images to a pixel-diff tool or a person, not the model.

## Reviewing agent work

When the oracle is you, the job gets harder. I keep saying your job is _taste_ and _judgment_. Most of the time, that cashes out as reading a diff an agent wrote and deciding whether it should exist.

That's a different skill from reviewing a colleague's pull request. Agent diffs tend to look _more_ finished than they are: clean formatting, fluent comments, green tests. None of that tells you whether the change is right.

### Six tells in an agent's diff

- **The duplicated helper**: It wrote a new function that already exists three directories over. Grep before you approve.
- **The test that asserts the implementation**: It checks what the code does, not what the requirement demands. Ask for a test that fails on the pre-change behavior. ([The test that tests nothing](#three-ways-evidence-lies) is the longer version of this problem.)
- **The swallowed error**: A `try`/`catch` that turns a failure into a quiet `null`. Read the contract, not just the happy path.
- **The confident comment**: A beautifully written comment describing behavior the code doesn't have. Read the code as if the comment didn't exist.
- **The plausible call to something that doesn't exist**: A method, flag, or package that _sounds_ right.
- **Scope creep**: A bunch of files the task never mentioned, or a pull request whose purpose you can't state in one sentence.

### You are a load-sensitive component

Over the last year and a half, I've noticed something incredibly important: I review more carefully in the morning than at the end of a long day. Back when I wrote all of the code, this worked out conveniently. I'd run out of good judgment at around the same time I ran out of the ability to write any code at all.

Now, I can make poor choices while an agent is more than happy to go off and implement them on my behalf.

There's no technical advice here, just something for _you_ to be aware of. And it's not _just_ you and me. The human gate, meaning you reading and approving, degrades in well-documented, predictable ways:

- **Approval fatigue**: [Claude Code's own documentation](https://code.claude.com/docs/en/best-practices) puts it bluntly: "After the tenth approval you're clicking through rather than reviewing."
- **Review fatigue**: A [large case study at Cisco](https://static1.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf) found defect detection peaks around 200–400 lines of code reviewed per sitting and falls off after 60–90 minutes of continuous review. Generating 300 lines costs an agent nothing extra.
- **Reading atrophy**: Delegation removes the practice that kept the reading skill sharp in the first place.

If you notice you're approving without reading, stop. Come back in the morning, or hand the first pass to a reviewer that doesn't get tired.

### Make the history reviewable

One long session needs to become a history that reviewers, `git revert` (which undoes a commit), and `git bisect` (which hunts for the commit that introduced a bug) can actually use. The unit of history should match the unit of change.

`git add -p`, which stages changes piece by piece, is interactive, so the agent can't use it. But you can split a commit after the fact yourself, with `git reset` and then `git add -p`. And agent-written commit messages tend to get the _what_ right while inventing a plausible _why_. Make sure the why is yours.

### Agent reviewers

Agents make great reviewers, if you set them up to disagree with the author instead of agreeing with it.

- **Use a fresh context**: A reviewer that shares the implementer's conversation inherits its blind spots. (Context is everything the model can see when it decides its next step.) A new agent _name_ isn't a clean context. The author knows what it meant and reads that into what it wrote. A reviewer with only the requirements and the diff has to check what's actually there.
- **Give it the requirements, the diff, and the test results, not the transcript**: Otherwise, it rubber-stamps the implementer's reasoning. My own advisor setup (a stronger reviewer model I consult mid-task) forwards the entire transcript by design. That's me ignoring my own advice, so don't copy it for reviews.
- **A second model buys you uncorrelated errors**: My [committee-review skill](committee-review.md) (which has a second model, often Codex, review Claude's diff) ran in 465 sessions. Calling `codex exec` from another agent has a few traps, like waiting on stdin and exiting `0` without reviewing anything; [Calling Codex from Claude Code](claude-code-and-codex-together.md#calling-codex-from-claude-code) has the safe version.
- **Ask for findings with evidence**: The location, the input that triggers the problem, and the expected and actual results. "This might have edge cases" isn't a finding.
- **Zero findings is a valid result**: A reviewer told to find problems will find problems. Give it permission to say there aren't any.
- **Cap the rounds and make nits non-blocking**: Otherwise, you end up with my favorite self-inflicted anti-pattern: a reviewing agent rejecting a pull request for the fourteenth time because it doesn't like the prose in a JSDoc comment.
- **An agent's approval is not a human's**: My `address-pr` skill (which works through unresolved pull request review comments) was resolving merge conflicts and merging on an agent's approval, posted through my own GitHub account and indistinguishable from mine. Don't let an agent's approval count as yours, and don't let agent actions post under your own account.

The review subagents in [Exemplar Subagents](exemplar-subagents.md) are a good starting set, and [Getting reports you can trust](subagents.md#getting-reports-you-can-trust) covers why a worker's report is a claim you still have to check.

A claim without a check that could have failed isn't a claim yet. It's a hope. Review in the morning, with a fresh reviewer, and keep the final yes for yourself.
