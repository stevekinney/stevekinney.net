---
title: The Operating Model
description: 'Every agent system answers five questions: context, capability, control, state, and evidence. Each one has a natural home in your setup.'
---

When something goes wrong with an agent, the first instinct is to write another instruction. Sometimes that's right. A lot of the time, it's the wrong tool, and the instruction quietly gets ignored three sessions later.

It helps to have a map. Most of the lessons that follow zoom in on one place on this one. A few, like cost and long sessions, are about keeping the whole system healthy.

## Five concerns

A working agent system needs to answer five questions:

- **Context**: What goes into the context? The _context_ is everything the model can see when it decides its next step. So this concern is what you put in front of it about the codebase, the deployment pipeline, and the idioms and conventions your team follows.
- **Capability**: What can it do? Which tools does it have, which command-line programs can it run, and how does it use them?
- **Control**: What's allowed to happen, and when?
- **State**: What survives this session? (A _session_ is one conversation with the agent.) How do we organize and retrieve our notes?
- **Evidence**: What proves that we did the thing? How do we measure success?

You can describe nearly any agent problem as one of these going missing. The convention was never put in front of the agent: context. It had no way to run the tests: capability. It was told not to push to that branch and did anyway: control. It figured something out yesterday and it's gone today: state. It said it was done and wasn't: evidence.

If you've read [Why Systems](why-systems.md), its four additions map onto these. Bounded tools span capability and control. Durable state is state. Verification and the acceptance path are both evidence. Context is the one that list takes for granted.

## Where each concern lives

Each concern has one or more natural homes in the system. These are the places, and the lesson where each one gets its own treatment.

- **Standing rules** go in the instruction file, which is `CLAUDE.md` for Claude Code (or `AGENTS.md` in Codex). The harness (the program wrapped around the model) loads it at the start of every session. It carries the context that's true for the whole project. See [User and Project Instructions](user-and-project-instructions.md).
- **A reusable procedure** goes in a [skill](skills.md): a folder of instructions the agent loads only when the task calls for it.
- **An independent, bounded task** goes to a [subagent](subagents.md): a helper agent with its own working context that reports back when it's finished.
- **A deterministic gate** is a [hook](hooks.md)—a script the harness runs automatically at a set point—or just plain old code. This is where control lives when "usually" isn't good enough.
- **A durable objective** is a goal, a queue, or a tracker: something that outlives any one conversation. That's state. See [Goals and Loops](goals-and-loops.md) and [Where State Lives](where-state-lives.md).
- **A repeatable trigger** is a schedule or an event, so the work starts without you. That's control over _when_ work happens. See [Routines and Schedules](routines-and-schedules.md).
- **A reviewable output** is a file, a diff, a report, or an artifact: something a person or a script can inspect without replaying the whole session. See [Verification and Evidence](verification-and-evidence.md).

Notice that there are seven places for five concerns. The concerns are what you need. The places are how you get them, and they don't line up one-to-one. A skill, for instance, mostly supplies context: how to do a task, including how to use a capability the agent already has. A hook is a control. A tracker is state. A reviewable output is evidence.

## Using the map

Next time something breaks, ask which concern went missing before you reach for a fix. Then put the fix in the place built for that concern.

Three of them look alike from the outside, so here's how to tell them apart:

- **Context**: The information was never in front of the agent. The fix is to put it there, in an instruction file or a skill.
- **Control**: The information _was_ there, and the agent ignored it or lost track of it. A louder sentence won't help. The fix is enforcement: a gate that doesn't depend on the agent remembering.
- **State**: The agent learned something once and then lost it, often because the session ended or the conversation was compacted (replaced with a summary to free up context). The fix is to write it somewhere that survives.

And if you keep re-reading the transcript to find out whether it worked, that's evidence.

The most common mistake is writing a rule when what you needed was a check. The [enforcement ladder](the-enforcement-ladder.md), which ranks ways of keeping a rule from a request the agent can ignore up to a refusal it can't, is how you tell the difference.
