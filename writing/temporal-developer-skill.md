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

Temporal's [Developer Skill](https://temporal.io/blog/introducing-temporal-developer-skill) is a serious attempt to close that gap. I've read through [the `SKILL.md`](https://github.com/temporalio/skill-temporal-developer), explored the reference files, and I think the architecture is genuinely right. To be clear: even as-is, the skill meaningfully improves on what a model produces without it. That's not nothing. But "better than training data alone" is a low bar for a tool that's going to be the default way many developers interact with Temporal through their AI agents. What follows is about closing the gap between what it is and what it could be.

## The foundation is sound

Before anything critical: Temporal deserves real credit for shipping this. The blog post identifies the problem precisely—models haven't internalized Temporal best practices, SDK features ship faster than training data, and documentation traversal is token-expensive. All of that is true.

The decision to use the [Agent Skills open specification](https://agentskills.org) rather than building something proprietary is also the right call. The skill works across Claude Code, Cline, and any future agent that supports the spec. Developers aren't locked into one toolchain to get better Temporal guidance.

The two-tier loading design is smart: roughly 100 tokens of metadata sit in memory at session start, with the full guidance activating only when the agent detects Temporal code. Most of the time, this skill costs you nothing. The reference file organization—splitting content into language-agnostic core concepts and language-specific implementation details—is also sound. Determinism rules are universal; the syntax for expressing them is not.

The History Replay explanation in the `SKILL.md` is genuinely good. It maps Workflow Code to Commands to Events:

| Workflow Code    | Command                       | Event                           |
| ---------------- | ----------------------------- | ------------------------------- |
| Execute activity | `ScheduleActivityTask`        | `ActivityTaskScheduled`         |
| Sleep/timer      | `StartTimer`                  | `TimerStarted`                  |
| Child workflow   | `StartChildWorkflowExecution` | `ChildWorkflowExecutionStarted` |

The reason it works is that it's mechanism-level mapping: exact names, exact relationships, the kind of precise detail that models don't reliably carry from training data. More of the `SKILL.md` should look like this.

With all of that said: here's where the execution falls short.

## When you need guidance, the skill hands you a reading list

The `SKILL.md`'s routing instruction reads:

> 1. First, read the getting started guide for the language you are working in:
>    - Python → `references/python/python.md`
>    - TypeScript → `references/typescript/typescript.md`
>    - Go → `references/go/go.md`
> 2. Second, read appropriate `core` and language-specific references for the task at hand.

Then it lists nine core reference files—`determinism.md`, `patterns.md`, `gotchas.md`, `versioning.md`, `troubleshooting.md`, `error-reference.md`, `interactive-workflows.md`, `dev-management.md`, and `ai-patterns.md`—each with a one-line description. The word "appropriate" is the only routing logic. No conditional instructions. No "if you're doing X, read Y first." Just a list and a suggestion to pick the relevant ones.

For a developer who just wants to know "can I use `setTimeout` in a Temporal workflow?", this is like being handed a library card instead of an answer. The agent will probably load the right file eventually, but it's going to burn tokens and time figuring out which one.

To be clear: this isn't an argument against the two-tier loading design. Conditional routing—"if modifying a workflow, load versioning first"—is still progressive disclosure. The reference files still only load when needed. The difference is specificity: "read appropriate references" is a compass, not a map. A skill for a platform as gotcha-dense as Temporal needs to tell the agent _exactly_ which file to read based on what the developer is trying to do.

Something like "If you're modifying an existing workflow, read `references/core/versioning.md` _before_ reading anything else" would prevent real production incidents. "Read appropriate references" won't.

A more useful form is an explicit diagnostic workflow section: step-by-step conditional instructions that name the reference file, the specific thing to look for, and the next action to take. "For a non-determinism error: read `references/core/determinism.md`, then read `references/{language}/versioning.md` for the patching strategy, then retrieve the full event history and identify where the command sequence diverged." That's a decision tree. The current routing instruction is a card catalog.

The routing problem isn't only internal, either. In a real developer's environment, the Temporal skill's description competes with every other installed skill for the same trigger phrases. "Create a workflow" could plausibly match a GitHub Actions skill, a CI/CD pipeline builder, or a general workflow orchestration tool. The skill needs to win the right routing competitions and lose the wrong ones—which means its description should lean on Temporal-specific language ("deterministic workflow," "activity timeout," "task queue") rather than generic phrases like "durable execution" that could describe half a dozen platforms.

## The critical gotchas are buried

Every new Temporal developer makes the same mistakes. Every LLM generating Temporal code makes the same mistakes: `time.sleep()` instead of the SDK timer, HTTP calls directly from workflow code instead of activities, random values generated non-deterministically, activity timeouts not set.

These are the single highest-value things the skill could communicate. They're the "corrections to mistakes the agent will make without being told otherwise" that the [Agent Skills best practices](https://agentskills.org) identify as often the most valuable content a skill can contain.

In this skill, they live in `references/core/gotchas.md`—one of nine core reference files. The agent can certainly find and read that file. The issue is that it would only do so if it recognized the situation as gotcha-relevant. But `time.sleep(60)` doesn't announce itself as a mistake while you're writing it. It looks like correct Python. The agent won't pre-emptively load `gotchas.md` before writing workflow code unless the skill tells it to—and the skill doesn't. By the time the mistake is recognized, it's already in the code.

And the `gotchas.md` file is substantial. It covers ten categories: non-idempotent activities, side effects and non-determinism in workflow code, deploying multiple workers with different code versions, overly aggressive retry policies, query handler and update validator mistakes, file organization requirements, testing only happy paths, swallowing errors, cancellation handling, and payload size limits. Every one of these is a mistake an LLM will make on the first try. None of them are surfaced in the `SKILL.md` body.

A dozen lines of "NEVER do X in a workflow, ALWAYS do Y instead" in the `SKILL.md` body itself would prevent more bugs than the entire reference directory. These should be front-loaded, not buried.

## It explains things the model already knows

The `SKILL.md` includes this ASCII architecture diagram:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Temporal Cluster                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Event History  │  │   Task Queues   │  │   Visibility   │  │
│  │  (Durable Log)  │  │  (Work Router)  │  │   (Search)     │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Poll / Complete
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Worker                                   │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │   Workflow Definitions  │  │   Activity Implementations   │  │
│  │   (Deterministic)       │  │   (Non-deterministic OK)     │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

Compare that to the History Replay table above. One is mechanism-level: exact command names, exact event names, the precise mapping between them—the kind of specific, correct-by-exact-name knowledge that models don't reliably have. The other is concept-level orientation: "Workers poll task queues, Activities are non-deterministic." That's the kind of general knowledge that's in every Temporal tutorial ever written, and that models have generally absorbed from training data.

The blog post identifies the problem correctly: models haven't internalized _best practices_, and _new SDK features_ ship faster than training data updates. The solution to both of these is mechanism-level, current, practical guidance—not a rehash of the conceptual model the agent already has a reasonable grasp of.

Every token spent re-explaining that Workflows orchestrate Activities is a token not spent on telling the agent that Python's `workflow.defn` decorator requires the class to have exactly one method decorated with `@workflow.run`, or that TypeScript's `proxyActivities` returns a typed proxy that requires you to specify the activity interface as a generic parameter, or that Go's `workflow.ExecuteActivity` returns a `Future` and you need to call `.Get()` on it to block. The skill claims to offer "expert-level knowledge." Experts don't need the architecture diagram. They need the specific, practical, language-level details that trip people up.

And the gaps aren't just about structure—some are about currency. Temporal Schedules have been generally available across all SDKs since November 2023. They're the modern replacement for cron-based workflow scheduling and a pattern that virtually every production Temporal deployment uses. The skill's patterns reference doesn't mention them. Nexus—Temporal's framework for connecting applications across namespace boundaries—is rolling out across SDKs and represents a major shift in how Temporal applications compose with each other. The skill doesn't mention it either. These are platform-level features, not niche SDK additions. They're exactly the kind of thing models are least likely to know from training data and most likely to get wrong by analogy with older patterns. The architecture diagram, by contrast, is the thing the model is most likely to already have right.

## The skill doesn't know what language you're using

The `SKILL.md` says: "If working in Python, read `references/python/python.md`." But the skill has no mechanism to detect what language the developer is actually using. The agent has to infer this from context—file extensions, project structure, conversation history.

This is fine for a coding agent that can see your project. But the skill provides no help with the inference. It doesn't say "check for `package.json` vs `pyproject.toml` vs `go.mod`." It presents three parallel tracks and assumes the agent will figure it out.

More importantly, the blog post says 80% of the skill's content is language-agnostic. If you're a TypeScript developer, 80% of the loaded context applies to all three languages, and the 20% that's TypeScript-specific is in a separate file that may or may not get loaded. A TypeScript developer doesn't want a language-agnostic explanation of determinism followed by a pointer to TypeScript-specific details. They want the TypeScript determinism rules, with TypeScript code examples, using TypeScript SDK APIs, in the first file the agent reads.

## There's nothing you can run

The skill contains zero executable scripts. Every task that requires running a command—installing the CLI, starting a dev server, scaffolding a project—requires the agent to generate those commands from scratch every time.

Scripts carry real maintenance costs—platform-specific handling, keeping up with CLI changes, dependency management. That's a fair objection. But project scaffolding earns those costs. Setting up a working Temporal project the first time—right dependencies, correct structure, a workflow that actually runs, an activity that actually executes—is something every new Temporal developer does and most do wrong on the first try. A `scripts/scaffold-project.sh` that produces a runnable starter project would be used by essentially every developer who installs this skill. That's a different calculation than a convenience wrapper for a one-time CLI install.

The absence of scripts means the skill is a book, not a tool. It can make the agent more knowledgeable, but it can't make the agent more _capable_. For development tasks where the path from "I want to do X" to "X is done" involves running commands, a skill without scripts is leaving half its value on the table. The ceiling is higher still: an MCP server with live cluster access lets the agent skip generated commands entirely—when a workflow is stuck, calling `temporal.workflow.describe` returns the actual pending activities and failure message as structured data, rather than producing a command for the developer to run themselves. That's the difference between reasoning about state and reading it.

## It goes silent the moment you deploy

You built a workflow using the skill's guidance. You deployed it. It's stuck. You're looking at the Temporal Web UI, and the workflow is in `WORKFLOW_EXECUTION_STATUS_TIMED_OUT`. You ask your agent for help.

The skill can tell you what questions to ask. It cannot ask them.

`references/core/troubleshooting.md` has decision trees for RUNNING, FAILED, TIMED_OUT, and COMPLETED (wrong result) statuses—so the triage content exists. But the skill has no connection to a live cluster. The diagnostic sequence looks like this: you describe the symptom to the agent, the agent (if it loads the right reference) tells you to run `temporal workflow show --workflow-id <id>` and look for X, you run it, you paste the output back, and the agent reasons about what it sees. You are the relay. Every step that requires actual cluster data requires a round-trip through you.

That's a meaningful gap. The skill can orient you toward the right questions. But for a stuck workflow in production, orientation isn't the bottleneck—data is. The troubleshooting guide is also oriented around diagnosing code problems—wrong task queue, stale worker code, non-determinism errors—rather than teaching you to read what Temporal is actually telling you. There's no reference mapping event types to operational meaning: `ActivityTaskScheduled` with no subsequent `ActivityTaskStarted` means no worker is polling that task queue; `ActivityTaskFailed` with an attempt count shows how deep into its retry budget an activity is; `MarkerRecorded` with a `patched` marker name tells you which version branch the workflow took. An `operational-patterns.md` that maps event types to what they mean for your code—the operational equivalent of the History Replay table—is exactly what's missing. [temporal-mcp](https://github.com/stevekinney/temporal-mcp) takes this approach, pairing the skill's reference files with 28 read-only cluster inspection tools; the `temporal.workflow.history.summarize` tool, for instance, detects non-determinism errors in the event stream and surfaces guidance pointing directly to the versioning and determinism references.

This points at a broader architectural distinction worth naming. Skills and MCP servers solve different problems and the boundary between them matters. A skill owns knowledge and routing: what patterns to follow, which mistakes to avoid, when to load which reference file. That's static, versioned, portable across agents. An MCP server owns capability and live data: querying cluster state, inspecting event histories, describing running workflows. That requires a running server and authenticated access. The skill is the expert sitting next to you; MCP is the terminal they can type into. One without the other is incomplete—the skill without MCP can teach but can't act, MCP without the skill can act but doesn't know the best practices. The skill should declare that boundary explicitly rather than leaving developers to discover it when they hit a wall.

An operations skill is planned—the blog post says so, and that's genuinely good news. A development skill that focuses on development is a fine scoping decision. The problem isn't the scope: it's that the skill doesn't tell you when you've left it. A developer following this skill walks right up to deployment with no warning that the next step is outside what the skill covers. One sentence—"at this point, you've moved into operations territory; this skill can't help you debug a stuck workflow in production"—would cost nothing and prevent a lot of confusion. The handoff doesn't have to be coverage; it just has to exist.

## Versioning is listed like any other topic

Workflow versioning is one of Temporal's most complex and highest-stakes topics. Here's the failure mode, taken directly from `references/core/versioning.md`:

```
Original Code (recorded in history):
  await activity_a()
  await activity_b()

Updated Code (during replay):
  await activity_a()
  await activity_c()  ← Different! NondeterminismError
```

Deploy updated code while a workflow is mid-execution, and the worker tries to replay the history using the new code. The commands don't match. The workflow blocks. This is not a coding mistake—it happens to correct, reviewed, approved code the moment it gets deployed to workers that are handling running workflows.

It's worth being precise about why versioning warrants special emphasis when other topics—activity timeouts, idempotency, signal handling—don't. Every other gotcha in Temporal is an error of omission: you forgot to set a timeout, you forgot an idempotency key, you missed a configuration. Versioning is an error of action. The developer can do everything right—write correct workflow code, review the PR, get it approved, merge it—and then the deployment itself is what breaks running workflows. There's no moment where the mistake looks like a mistake. It looks like progress right up until production starts throwing non-determinism errors.

But versioning is listed as one of nine reference topics in the `SKILL.md`, with the same routing weight as "patterns" or "interactive workflows." There's no warning in the `SKILL.md` body that deploying code changes to running workflows is the category of mistake most likely to cause a production incident.

An agent using this skill might help a developer write a perfectly correct workflow, then help them modify it for a new requirement, without ever mentioning that the modification will break all currently-running instances unless they use patching or worker versioning. "WARNING: Changing workflow code while workflows are running WILL cause non-determinism errors—read `references/core/versioning.md` BEFORE modifying any workflow that has running executions" in the main `SKILL.md` body would prevent real outages. The current structure requires the agent to independently decide that a code modification task involves "versioning" and load the right reference. That connection doesn't always get made.

## It doesn't tell you what it doesn't know

The skill covers Python, TypeScript, and Go. It does not cover Java, .NET, Ruby, or PHP—all of which have Temporal SDKs. If you're a Java developer and the skill activates, there's nothing in the `SKILL.md` body that says "Java is not yet covered." The agent will load the skill, see guidance for three languages, and either extrapolate from the available languages (risky, since SDK APIs differ significantly) or silently fall back to training data—which is exactly the problem the skill was supposed to solve.

This matters because the skill's description field triggers on generic phrases like "create a Temporal workflow" and "durable execution"—phrases a Java developer would absolutely use. A simple "If working in Java, .NET, Ruby, or PHP: this skill does not yet cover your language" would set correct expectations and prevent the agent from generating confidently wrong code by analogy.

## What would make it great

The foundation is solid. The team clearly understands both Temporal and the Agent Skills format. The problem is real, the distribution model is right, and the reference file structure is the right shape.

What's missing is mostly front-loading and routing specificity:

- Move the top gotchas into the `SKILL.md` body so the agent reads them before writing any code
- Add conditional routing: "If implementing a new workflow, read X. If modifying an existing workflow, read X and Y. If debugging a failure, read Z"
- Add language detection hints so the agent loads language-specific files immediately rather than inferring
- Add scripts for common setup tasks so the skill can _do_ things, not just _know_ things
- Add operational patterns so the skill doesn't abandon developers the moment they deploy
- Warn loudly about versioning in the main skill file—it's the highest-stakes topic
- Declare unsupported languages explicitly so the agent doesn't silently degrade

The History Replay table in the `SKILL.md` is the model for what the rest of the skill body should look like: dense, practical, immediately applicable. More of that, and less re-explaining Temporal's architecture to a model that already has the gist. The goal is expert guidance, and expert guidance looks like a very experienced engineer sitting next to you whispering "oh, and don't forget—if you're modifying a running workflow you need to patch it first"—not a conceptual overview you've already read.

Right now, this is a promising first draft that prioritizes coverage over impact. With these changes, it could be the reference example of what a great vendor-shipped Agent Skill looks like.
