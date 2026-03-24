---
title: "Temporal's Developer Skill Is a Promising First Draft"
description: >-
  Temporal shipped one of the first major infrastructure vendor agent skills. The diagnosis is right and the architecture is sound. The execution has some fixable gaps.
date: 2026-03-24
modified: 2026-03-24
tags:
  - ai
  - temporal
  - tooling
---

If you've ever watched a coding agent confidently write `time.sleep(60)` inside a Temporal workflow, you already understand the problem this skill is trying to solve. The model has seen the Temporal docs. It understands what determinism means in the abstract. It still reaches for the platform-agnostic sleep function because that's what training data for "pause for 60 seconds" looks like. The correct version—`workflow.sleep()` in Python, `workflow.Sleep()` in Go, the SDK's timer in TypeScript—requires the kind of specific, internalized, current knowledge that no general-purpose model reliably has.

Temporal's [Developer Skill](https://temporal.io/blog/introducing-temporal-developer-skill) is a serious attempt to close that gap. I've read through [the SKILL.md](https://github.com/temporalio/skill-temporal-developer), explored the reference files, and I think the architecture is genuinely right. To be clear: even as-is, the skill meaningfully improves on what a model produces without it. That's not nothing. But "better than training data alone" is a low bar for a tool that's going to be the default way many developers interact with Temporal through their AI agents. What follows is about closing the gap between what it is and what it could be.

## The foundation is sound

Before anything critical: Temporal deserves real credit for shipping this. The blog post identifies the problem precisely—models haven't internalized Temporal best practices, SDK features ship faster than training data, and documentation traversal is token-expensive. All of that is true.

The decision to use the [Agent Skills open specification](https://agentskills.org) rather than building something proprietary is also the right call. The skill works across Claude Code, Cline, and any future agent that supports the spec. Developers aren't locked into one toolchain to get better Temporal guidance.

The two-tier loading design is smart: roughly 100 tokens of metadata sit in memory at session start, with the full guidance activating only when the agent detects Temporal code. Most of the time, this skill costs you nothing. The reference file organization—splitting content into language-agnostic core concepts and language-specific implementation details—is also sound. Determinism rules are universal; the syntax for expressing them is not.

The History Replay explanation in the SKILL.md is genuinely good. It's a table mapping Workflow Code to Commands to Events—concise, precise, and exactly the kind of thing an agent needs to internalize before touching workflow code. The reason it works is that it's mechanism-level mapping: exact names (`ScheduleActivityTask`, `ActivityTaskScheduled`), exact relationships, the kind of precise detail that models don't reliably carry from training data. More of the SKILL.md should look like this.

With all of that said: here's where the execution falls short.

## The first thing the skill does is run an ad

You install the skill. You start working on Temporal code. The skill activates. And before your agent helps you with anything, it outputs:

> "Thank you for trying out the public preview of the Temporal development skill! We would love to hear your feedback—positive or negative—over in the Community Slack, in the #topic-ai channel."

Every. Single. Session. (To be precise: once per conversation. But most developers open a new conversation to start a new work session, so in practice that's every time you sit down to write Temporal code.)

The SKILL.md explicitly instructs the agent to print this message the first time the skill loads in a conversation. The instruction even acknowledges the friction: "Do not output this message multiple times in the same conversation." So at least the frequency is throttled.

The problem isn't the ask itself. This is a public preview and feedback genuinely shapes the roadmap. The problem is the sequencing: the skill asks for something before it has given you anything. A feedback prompt that fires after a successful workflow implementation would accomplish exactly the same goal. Instead, the skill's first act is about Temporal's needs, not yours. For a tool whose entire purpose is developer productivity, that's a category error regardless of intent.

## When you need guidance, the skill hands you a reading list

The SKILL.md tells you: "First, read the getting started guide for the language you are working in. Second, read appropriate core and language-specific references for the task at hand."

Then it lists seven core reference files. The word "appropriate" is the only routing logic.

For a developer who just wants to know "can I use `setTimeout` in a Temporal workflow?", this is like being handed a library card instead of an answer. The agent will probably load the right file eventually, but it's going to burn tokens and time figuring out which one.

To be clear: this isn't an argument against the two-tier loading design. Conditional routing—"if modifying a workflow, load versioning first"—is still progressive disclosure. The reference files still only load when needed. The difference is specificity: "read appropriate references" is a compass, not a map. A skill for a platform as gotcha-dense as Temporal needs to tell the agent _exactly_ which file to read based on what the developer is trying to do.

Something like "If you're modifying an existing workflow, read `references/core/versioning.md` _before_ reading anything else" would prevent real production incidents. "Read appropriate references" won't.

## The critical gotchas are buried

Every new Temporal developer makes the same mistakes. Every LLM generating Temporal code makes the same mistakes: `time.sleep()` instead of the SDK timer, HTTP calls directly from workflow code instead of activities, random values generated non-deterministically, activity timeouts not set.

These are the single highest-value things the skill could communicate. They're the "corrections to mistakes the agent will make without being told otherwise" that the [Agent Skills best practices](https://agentskills.org) identify as often the most valuable content a skill can contain.

In this skill, they live in `references/core/gotchas.md`—the seventh file in a list of seven. The agent can certainly find and read that file. The issue is that it would only do so if it recognized the situation as gotcha-relevant. But `time.sleep(60)` doesn't announce itself as a mistake while you're writing it. It looks like correct Python. The agent won't pre-emptively load gotchas.md before writing workflow code unless the skill tells it to—and the skill doesn't. By the time the mistake is recognized, it's already in the code.

A dozen lines of "NEVER do X in a workflow, ALWAYS do Y instead" in the SKILL.md body itself would prevent more bugs than the entire reference directory. These should be front-loaded, not buried.

## It explains things the model already knows

The SKILL.md includes an ASCII architecture diagram showing the relationship between the Temporal Cluster, Workers, Workflows, and Activities. It explains that Workflows are deterministic, Activities are not, Workers poll task queues.

This is concept-level orientation—the kind of general knowledge that's in every Temporal tutorial ever written, and that models have generally absorbed from training data. It's the opposite of the History Replay table we just praised. That table works because it's mechanism-level: exact command names, exact event names, the precise mapping between them. Models don't reliably carry that. The architecture diagram restates things models broadly already know.

The blog post identifies the problem correctly: models haven't internalized _best practices_, and _new SDK features_ ship faster than training data updates. The solution to both of these is mechanism-level, current, practical guidance—not a rehash of the conceptual model the agent already has a reasonable grasp of.

Every token spent re-explaining that Workflows orchestrate Activities is a token not spent on telling the agent that Python's `workflow.defn` decorator requires the class to have exactly one method decorated with `@workflow.run`, or that TypeScript's `proxyActivities` returns a typed proxy that requires you to specify the activity interface as a generic parameter, or that Go's `workflow.ExecuteActivity` returns a `Future` and you need to call `.Get()` on it to block. The skill claims to offer "expert-level knowledge." Experts don't need the architecture diagram. They need the specific, practical, language-level details that trip people up.

## The skill doesn't know what language you're using

The SKILL.md says: "If working in Python, read `references/python/python.md`." But the skill has no mechanism to detect what language the developer is actually using. The agent has to infer this from context—file extensions, project structure, conversation history.

This is fine for a coding agent that can see your project. But the skill provides no help with the inference. It doesn't say "check for `package.json` vs `pyproject.toml` vs `go.mod`." It presents three parallel tracks and assumes the agent will figure it out.

More importantly, the blog post says 80% of the skill's content is language-agnostic. If you're a TypeScript developer, 80% of the loaded context applies to all three languages, and the 20% that's TypeScript-specific is in a separate file that may or may not get loaded. A TypeScript developer doesn't want a language-agnostic explanation of determinism followed by a pointer to TypeScript-specific details. They want the TypeScript determinism rules, with TypeScript code examples, using TypeScript SDK APIs, in the first file the agent reads.

## There's nothing you can run

The skill contains zero executable scripts. Every task that requires running a command—installing the CLI, starting a dev server, scaffolding a project—requires the agent to generate those commands from scratch every time.

Scripts carry real maintenance costs—platform-specific handling, keeping up with CLI changes, dependency management. That's a fair objection. But project scaffolding earns those costs. Setting up a working Temporal project the first time—right dependencies, correct structure, a workflow that actually runs, an activity that actually executes—is something every new Temporal developer does and most do wrong on the first try. A `scripts/scaffold-project.sh` that produces a runnable starter project would be used by essentially every developer who installs this skill. That's a different calculation than a convenience wrapper for a one-time CLI install.

The absence of scripts means the skill is a book, not a tool. It can make the agent more knowledgeable, but it can't make the agent more _capable_. For development tasks where the path from "I want to do X" to "X is done" involves running commands, a skill without scripts is leaving half its value on the table.

## It goes silent the moment you deploy

You built a workflow using the skill's guidance. You deployed it. It's stuck. You're looking at the Temporal Web UI, and the workflow is in `WORKFLOW_EXECUTION_STATUS_TIMED_OUT`. You ask your agent for help.

The skill has nothing for you.

There's a `references/core/troubleshooting.md`, but it's framed entirely around development-time debugging. There's no guidance on how to read an event history, no explanation of what the different workflow statuses mean operationally, no "if you see this status it usually means that" patterns.

An operations skill is planned—the blog post says so, and that's genuinely good news. A development skill that focuses on development is a fine scoping decision. The problem isn't the scope: it's that the skill doesn't tell you when you've left it. A developer following this skill walks right up to deployment with no warning that the next step is outside what the skill covers. One sentence—"at this point, you've moved into operations territory; this skill can't help you debug a stuck workflow in production"—would cost nothing and prevent a lot of confusion. The handoff doesn't have to be coverage; it just has to exist.

## Versioning is listed like any other topic

Workflow versioning is one of Temporal's most complex and highest-stakes topics. Deploy the wrong code change to a running workflow and you get a non-determinism error that blocks the workflow entirely. The skill has both `core/versioning.md` and language-specific versioning files.

It's worth being precise about why versioning warrants special emphasis when other topics—activity timeouts, idempotency, signal handling—don't. Every other gotcha in Temporal is an error of omission: you forgot to set a timeout, you forgot an idempotency key, you missed a configuration. Versioning is an error of action. The developer can do everything right—write correct workflow code, review the PR, get it approved, merge it—and then the deployment itself is what breaks running workflows. There's no moment where the mistake looks like a mistake. It looks like progress right up until production starts throwing non-determinism errors.

But versioning is listed as one of seven reference topics, with the same routing weight as "patterns" or "interactive workflows." There's no warning in the SKILL.md body that deploying code changes to running workflows is the category of mistake most likely to cause a production incident.

An agent using this skill might help a developer write a perfectly correct workflow, then help them modify it for a new requirement, without ever mentioning that the modification will break all currently-running instances unless they use patching or worker versioning. "WARNING: Changing workflow code while workflows are running WILL cause non-determinism errors—read `references/core/versioning.md` BEFORE modifying any workflow that has running executions" in the main SKILL.md body would prevent real outages. The current structure requires the agent to independently decide that a code modification task involves "versioning" and load the right reference. That connection doesn't always get made.

## It doesn't tell you what it doesn't know

The skill covers Python, TypeScript, and Go. It does not cover Java, .NET, Ruby, or PHP—all of which have Temporal SDKs. If you're a Java developer and the skill activates, there's nothing in the SKILL.md body that says "Java is not yet covered." The agent will load the skill, see guidance for three languages, and either extrapolate from the available languages (risky, since SDK APIs differ significantly) or silently fall back to training data—which is exactly the problem the skill was supposed to solve.

This matters because the skill's description field triggers on generic phrases like "create a Temporal workflow" and "durable execution"—phrases a Java developer would absolutely use. A simple "If working in Java, .NET, Ruby, or PHP: this skill does not yet cover your language" would set correct expectations and prevent the agent from generating confidently wrong code by analogy.

## What would make it great

The foundation is solid. The team clearly understands both Temporal and the Agent Skills format. The problem is real, the distribution model is right, and the reference file structure is the right shape.

What's missing is mostly front-loading and routing specificity:

- Move the top gotchas into the SKILL.md body so the agent reads them before writing any code
- Add conditional routing: "If implementing a new workflow, read X. If modifying an existing workflow, read X and Y. If debugging a failure, read Z"
- Add language detection hints so the agent loads language-specific files immediately rather than inferring
- Add scripts for common setup tasks so the skill can _do_ things, not just _know_ things
- Add operational patterns so the skill doesn't abandon developers the moment they deploy
- Warn loudly about versioning in the main skill file—it's the highest-stakes topic
- Declare unsupported languages explicitly so the agent doesn't silently degrade
- Remove the startup advertisement

The History Replay table in the SKILL.md is the model for what the rest of the skill body should look like: dense, practical, immediately applicable. More of that, and less re-explaining Temporal's architecture to a model that already has the gist. The goal is expert guidance, and expert guidance looks like a very experienced engineer sitting next to you whispering "oh, and don't forget—if you're modifying a running workflow you need to patch it first"—not a conceptual overview you've already read.

Right now, this is a promising first draft that prioritizes coverage over impact. With these changes, it could be the reference example of what a great vendor-shipped Agent Skill looks like.
