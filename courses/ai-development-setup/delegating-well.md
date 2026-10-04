---
title: Delegating Well
description: 'Write a worker contract, treat every report as a claim, and learn the failure modes that make subagents cost more than the work they replace.'
---

Most subagent failures aren't model failures. The brief was vague, nobody owned the result, or the worker's report said "done" and nobody checked. In all three cases, the delegation was the problem, not the delegate.

Here's how to hand work off so that you can trust what comes back. It builds on [Subagents](subagents.md) and [Configuring Subagents](subagent-configuration.md).

## Best practices

- **Add a non-use case when two agents would compete for the same task**: In each agent's `description`, say what it's _not_ for. Otherwise the main agent has to guess between them.
- **Never write "always use" everywhere**: Routing becomes a contest between instructions, and the loudest one wins.
- **Keep changing facts in the assignment**: The assignment is the task message you hand a worker each time. Commits, branches, and paths don't belong in a reusable definition. They go stale. Put them in the assignment.
- **Fill in the worker contract**: A worker contract is the task contract (outcome, how far the agent may go, and what proves it) plus the delegation details: inputs, ownership, authority, output, and what to do when blocked. Every assignment should say each of these things, and a blank field is unfinished planning:
  - _Objective_: One deliverable, and why you need it.
  - _Input revision_: The exact commit the worker starts from.
  - _Inputs_: The files, decisions, and reproducible failure it needs.
  - _Ownership_: Which paths it may write, and which belong to someone else.
  - _Authority_: Whether it may edit, run commands, commit, or contact external systems.
  - _Acceptance commands_: The exact commands whose results count as proof.
  - _Output_: Where the findings go and what shape they take.
  - _Bounds_: How many attempts, how much budget, and whether it may delegate further.
  - _What to do when blocked_: Stop, keep the evidence, and report what's missing.
- **Allow three honest outcomes**: Supported findings, no supported findings, or insufficient evidence. Never set a quota of findings. That's how you get findings.
- **Add a role only after you've written the same brief by hand three times**: Until then, you don't know what the role is.
- **One owner accepts the results**: Workers return evidence. The coordinator (the main agent, or a script that hands out the work) collects it and proposes what to accept. Final acceptance of anything consequential is yours. The root cause of most multi-agent failures is work that nobody owns.

## Getting reports you can trust

A worker's report is a claim, not evidence. Subagents report success confidently, even when they're wrong. That's the same rule from [Verification and Evidence](verification-and-evidence.md): distrust any evidence whose author and judge are the same process. The worker wrote the report, and it's also the one who'd be embarrassed if the report were bad.

So make the claim checkable:

- **Enforce the shape while the worker still has context**: Have the worker write its report to a file and validate that file with a script. Then add a `SubagentStop` [hook](hooks.md), a script the harness runs when a subagent is about to finish. The hook runs your validation script, and if the report is bad, it blocks the stop and tells the worker why. Blocking keeps the _same_ worker running, so it fixes its own report. Alternatively, use the `--json-schema` option of headless runs or the SDK's structured outputs (the SDK is Claude's library for running agents from your own code). Both make a whole run return data that matches a schema instead of prose, so they suit a script that coordinates workers.
- **Verify at four levels**: Check each worker's output on its own. Check the integrated result, where the pieces meet. Check the delivery, meaning that what you shipped is what you claimed. And check the workflow as a whole, meaning nothing got skipped along the way. Passing worker checks don't mean the combination passes.
- **Send a skeptic for the findings that drive decisions**: Another agent, with fresh context, whose job is to disprove the claim. [Reviewing Agent Work](reviewing-agent-work.md) covers how to set up a reviewer who disagrees instead of agreeing.

## Failure modes and anti-patterns

- **Hidden authority**: Telling an agent it shouldn't edit files doesn't make it a read-only agent. Permissions do. A worker can inherit shell access, network access, or credentials that it shouldn't have.
- **Vague delegation**: "Investigate everything" creates sprawling research and unclear results. Narrow the question. A vague "senior engineer" agent causes a lot of overlap and confusion for the same reason.
- **Duplicate effort**: Two workers exploring the same path can double the cost for no good reason. If every instance is expected to read the same files or do the same research, you're paying for that over and over.
- **Premature fan-out**: Your subagents are off implementing against an imagined interface, and then the main agent ends up rewriting everything. Resolve the shared decisions first.
- **A long persona instead of a worker contract**: Great, now you've spent a bunch of time dictating its tone. Focus on purpose, method, authority, shape, and a stopping condition.
- **The security expert with decades of experience**: The fictional résumé doesn't do as much as you think. Name the trigger and the deliverable.
- **Routing around a denial**: Spawning a new agent to get past something that was just denied. If the denial was right, you've bypassed it. If it was wrong, fix the rule.

## When not to delegate

Skip the subagent when:

- The task is smaller than the handoff.
- Every worker needs the same changing context.
- The shared interface is unresolved.
- Integration costs exceed the parallel savings.
- No independent acceptance check exists.

If four different subagents have to read the same file independently, you've paid the same cost four times. And if you spin up one agent to decide which tests should be written at the same time as another agent is doing the implementation, how do you expect that to go? (Tests derived from the requirements, by someone who hasn't seen the implementation, are a different and good idea. [Exemplar Subagents](exemplar-subagents.md) has a few.)

If you can't say how you'd check the result, don't delegate the task. For code, that's an acceptance command. For a research worker, it's a report whose claims you can open and verify, with file and line citations. Otherwise you can only hope.
