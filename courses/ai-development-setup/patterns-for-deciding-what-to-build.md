---
title: 'Patterns: Deciding What to Build'
description: 'Three patterns for settling the problem before an agent writes code: research, plan, implement; interview to spec; and fault localization first.'
---

A wrong approach is cheapest to fix before any code exists. Once it's a two-thousand-line diff, you're either reviewing your way out of it or throwing it away. These three patterns put the expensive thinking up front, where a mistake is still a paragraph in a document.

Each answers a different question: how the change should go, what you actually want, and where the bug is before anyone asks how to fix it.

## Research, plan, implement

**What it is:** Three phases, each producing a written artifact. Research the code without changing it, write a plan with exact files and checks, then implement one phase at a time against the plan.

**How it works:** Each phase starts fresh with the previous phase's document as its only handoff, and you review those short documents instead of the long diff. [Research, plan, implement](planning-and-task-contracts.md#research-plan-implement) walks through the phases and what each document should contain.

**When to use it:** For changes in large or unfamiliar code where a wrong approach is expensive: cross-cutting features, removals that touch many files, bug fixes in code you don't know. Also when code review is your bottleneck, because reading a plan is much faster than reading the diff it would have produced.

**When not to use it:** For small changes in code you know well. [Plan mode](https://code.claude.com/docs/en/permission-modes), where the agent can read but not edit until you approve its plan, is plenty there, and three review stops are pure overhead. It also won't crack a hard problem: it organizes the work, it doesn't make the work easier. And don't run it unattended. The leverage comes from a person reading the research and the plan. If nobody does, you've just added steps.

The [plan writer skill](exemplar-skills.md#plan-writer) runs the first two phases and stops for your review after each. For research, a few [scouts](exemplar-subagents.md#scout) running in parallel cover the code, and the [ticket dossier skill](exemplar-skills.md#ticket-dossier) covers everything around it: the Slack threads, the meeting where it was decided, the ticket it duplicates. Before you approve the plan, have a [junior engineer](exemplar-subagents.md#junior-engineer) read it cold and list everything it would have to guess. If it's expensive to reverse, ask the [advisor](exemplar-subagents.md#advisor) too. Once it's approved, an [orchestrator](exemplar-subagents.md#orchestrator) can hand each phase to a [line cook](exemplar-subagents.md#line-cook) and move on only when a [referee](exemplar-subagents.md#referee) says the phase is done.

## Interview to spec

**What it is:** Before planning anything, have the agent interview you until the hard questions are answered. It writes a self-contained spec, and you implement it in a fresh session.

**How it works:** The agent asks, you answer, and what you keep is a self-contained spec, not the interview. [Let the agent interview you](planning-and-task-contracts.md#let-the-agent-interview-you) has the prompt, what the spec should contain, and why you build it in a fresh session.

**When to use it:** When you haven't fully thought the feature through yet, which is more often than any of us admits. The questions do work a plan can't, because a plan assumes the requirements are settled. It also helps when several people disagree about what you're building, since the interview surfaces that before the code does.

**When not to use it:** For small, clear tasks, where the interview takes longer than the work. When the requirements are already written down, hand over the document instead. And when you can't actually answer the questions. An interview answered with "you decide" produces a spec full of the agent's guesses with your name on it, which is worse than no spec.

The [interview-to-spec skill](exemplar-skills.md#interview-to-spec) packages it. Run the [ticket dossier skill](exemplar-skills.md#ticket-dossier) first, so the interview doesn't ask you things your team already decided. Before the fresh session starts building, have a [junior engineer](exemplar-subagents.md#junior-engineer) read the spec and report anything it would still have to guess.

## Fault localization first

**What it is:** For a bug, treat "where is it?" as its own deliverable, finished before anyone writes a patch.

**How it works:** Reproduce the bug, ideally as a failing test. Then narrow down where it lives: search the code by structure, follow the stack trace, and, if you have tests, check which lines the failing tests run that the passing ones don't. That last technique is called _spectrum-based fault localization_: code that only the failing tests touch is the most suspicious. It can turn "which of 400 files" into "which of 12 lines." Research tools like [AutoCodeRover](https://arxiv.org/abs/2404.05427) separate these two steps explicitly: find the location first, then generate the patch with that context.

The failing test does two jobs. Its stack trace points at the fault, and later it proves the fix worked. Keep the exploration in a [subagent](subagents.md), like the [scout](exemplar-subagents.md#scout), so the pile of files it reads stays out of the context that writes the fix.

**When to use it:** For bug reports in code the agent hasn't seen yet, and anywhere the symptom is far from the cause, like a UI error that's really a serializer problem. In large repositories, an agent that skips this step reads the wrong files first and anchors on them. If the first guess has been wrong before, look at several candidate locations at once instead of one.

**When not to use it:** When the issue already names the file and line, or you could describe the diff in one sentence. Skip straight to the fix. Don't lean on the coverage trick when the suite is small or the failing test runs everything. The ranking won't tell you anything. And don't let "localize" turn into unbounded exploration. Give the search a scope and a budget.

The [reenactor](exemplar-subagents.md#reenactor) subagent does the first half of this. When there are several plausible causes, run one [conspiracy theorist](exemplar-subagents.md#conspiracy-theorist) per theory. The [debugging protocol skill](exemplar-skills.md#debugging-protocol) keeps the main agent from guessing. If two fixes have already failed, bring in the [advisor](exemplar-subagents.md#advisor) before trying a third.

I'd rather spend twenty minutes reading a plan than two hours reviewing the diff it would have prevented. But that trade only pays when the thing you're deciding is uncertain. When it isn't, skip the ceremony and start building.
