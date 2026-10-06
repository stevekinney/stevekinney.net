---
title: Subagents
description: 'A subagent is a worker with its own context. What it starts with, when delegating pays, how to write the brief, and when a skill is enough.'
---

Your main session is three hours deep. The agent has read forty files, tried two approaches, and is now being asked to review a diff. Its context is full of everything _except_ a fresh set of eyes.

That's the problem a subagent solves. It also creates a few new ones.

## Knowledge versus worker

- A [skill](skills.md) is **knowledge**.
- A **subagent** is a **worker**.

A subagent is a helper that the main agent (the one you're talking to) starts with a fresh context and a written brief. It returns only a final report. (A _context_ is everything the model can see when it decides its next step.) Subagents are our first primitive for parallelization. Use one when you can delegate a _bounded outcome_, not merely split the task into more steps.

The cleanest way to keep the three straight: a **prompt** describes a task. A **skill** packages a reusable way of doing a task. A **subagent** creates a separate execution and context boundary in which a task is performed.

The basics:

- Subagents get their own context, separate from the main agent.
- The main agent can spin up several in parallel.
- They do their thing and report back.
- You can tailor each one with its own skills and permissions.

It's tempting to design a complete organization chart right out of a [Richard Scarry](https://en.wikipedia.org/wiki/Richard_Scarry) book. My advice is to start with a few narrowly scoped agents.

## What a subagent starts with, never gets, and reports

A subagent isn't a clone of the main agent. It knows exactly what it's handed.

It _starts with_:

- Its own system prompt and environment details.
- The task message the main agent writes for it.
- Your `CLAUDE.md` or `AGENTS.md` (the instruction files the harness loads each session), unless it's an `Explore` or `Plan` agent (two built-in read-only subagents) or has `omitClaudeMd: true` (a setting that skips loading those files).
- A git status snapshot, unless it's `Explore` or `Plan`.
- The full text of any preloaded skills, meaning the ones listed in its `skills:` field.

It _never gets_:

- Your conversation with the main agent.
- Skills you already invoked in the main conversation.
- Files you and the main agent already read.

It _reports back with_:

- Only the final report. The main agent does _not_ see the subagent's conversation.
- Whether it completed its mission. If it hit its `maxTurns` limit (a cap on agentic turns, each one a model request plus its tool calls), its work might be marked `partial`.

The final report is the subagent's return value. While it runs, it can also exchange messages with the main agent through `SendMessage` (a tool that sends a message to another agent), and the main agent can resume a finished subagent the same way (except `Explore` and `Plan`, which are one-shot). By default, subagents report to the main agent and don't talk to each other, though a worker given `SendMessage`, in a workflow for example, can message other agents. [Agent teams](agent-teams.md) go further: teammates share a task list, claim work from it, and message each other directly.

Everything in "never gets" is why the brief matters. If the main agent forgets a constraint, the subagent never finds out. [Delegating well](#delegating-well) covers writing that brief.

## How many subagents

Aim for about 5–7 well-scoped agent definitions, meaning saved roles Claude can pick from. That's how many you keep, not how many run at once; Claude Code caps concurrent runs separately. Here's [Anthropic](https://claude.com/blog/subagents-in-claude-code) on why:

> "Flooding Claude with options makes automatic delegation less reliable."

More agents means more descriptions to choose between, and the main agent starts picking wrong. [Configuring Subagents](subagent-configuration.md) has the per-agent settings and the concurrency cap, and [Exemplar Subagents](exemplar-subagents.md) has ideas for which few to start with.

## When to delegate

[Anthropic's rough signal](https://claude.com/blog/subagents-in-claude-code): ten or more files to explore, or three or more independent pieces of work. If you already know which file it is, do it yourself.

Two questions that don't get asked enough:

- Can its changes actually be isolated?
- Will its result arrive in time to matter?

And remember that parallelism can't remove serial work. If 40% of the job is serial, four workers finish about 1.8× faster than one, at best. ([Amdahl's law](https://en.wikipedia.org/wiki/Amdahl%27s_law): still undefeated.)

Skip the subagent when:

- The task is smaller than the handoff.
- Every worker needs the same changing context.
- The shared interface is unresolved.
- Integration costs exceed the parallel savings.
- No independent acceptance check exists.

If four subagents each read the same file, you've paid the same cost four times. And if you spin up one agent to decide which tests should be written at the same time as another agent is doing the implementation, how do you expect that to go? (Tests derived from the requirements, by someone who hasn't seen the implementation, are a different and good idea. [Exemplar Subagents](exemplar-subagents.md) has a few.)

If you can't say how you'd check the result, don't delegate the task. For code, that's an acceptance command. For a research worker, it's a report with file and line citations you can open and verify. Otherwise you can only hope.

### Fork or fresh

You have two ways to start a worker. A _fork_ copies your current conversation, so the worker inherits everything you've discussed. A _fresh_ subagent starts from only the brief.

Fork (the `/subtask` command) only when the task depends on decisions you can't restate compactly. Otherwise, write a brief and send a fresh subagent. It can run on a cheaper model, and it doesn't inherit your assumptions.

Each way of handing over context trades one thing for another:

| Strategy                                                      | Gain                 | Cost                      |
| ------------------------------------------------------------- | -------------------- | ------------------------- |
| Fresh worker (starts from the brief alone)                    | Clean focus          | Missing implicit facts    |
| Forked context (a copy of your conversation)                  | Inherits decisions   | Repeated context and cost |
| Durable brief (a saved assignment you send to a fresh worker) | Reusable, reviewable | Must be maintained        |

A durable brief pairs with a fresh worker instead of competing with it. All three [cost](caching-and-cost.md) something. Pick the cost you'd rather pay.

## Invoking a subagent

There are four ways, from least to most explicit:

- **Automatic**: The main agent happens to pick this particular subagent.
- **By name** (for example, "Use the code reviewer agent"): A strong hint, but _not_ a guarantee.
- **@-mention**: You type `@` and the agent's name. The agent is invoked, and the main agent writes the brief.
- **`claude --agent`**: The main agent _is_ this particular agent for the whole session.

A subagent's `description` is what automatic delegation reads, so write it well. But when delegation matters, use the by-name or @-mention rung. Automatic routing has failed outright in some releases. As in, agents that never got picked at all.

## Delegating well

Most subagent failures aren't model failures. The brief was vague, nobody owned the result, or the report said "done" and nobody checked. The delegation was the problem, not the delegate.

### Best practices

- **Add a non-use case when two agents would compete for the same task**: In each agent's `description`, say what it's _not_ for. Otherwise the main agent has to guess between them.
- **Never write "always use" everywhere**: Routing becomes a contest between instructions, and the loudest one wins.
- **Keep changing facts in the assignment**: The assignment is the task message you hand a worker each time. Commits, branches, and paths go stale in a reusable definition.
- **Fill in the worker contract**: A worker contract is the task contract (outcome, how far the agent may go, and what proves it) plus the delegation details. A blank field is unfinished planning:
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
- **One owner accepts the results**: Workers return evidence. The coordinator (the main agent, or a script that hands out the work) collects it and proposes what to accept. Final acceptance of anything consequential is yours. Most multi-agent failures trace back to work nobody owns.

### Getting reports you can trust

A worker's report is a claim, not evidence. Subagents report success confidently, even when they're wrong. The rule from [Verification and Evidence](verification-and-evidence.md) applies: distrust any evidence whose author and judge are the same process. The worker wrote the report, and it's also the one who'd be embarrassed if the report were bad.

So make the claim checkable:

- **Enforce the shape while the worker still has context**: Have the worker write its report to a file and validate that file with a script. Then add a `SubagentStop` [hook](hooks.md), a script the harness runs when a subagent is about to finish. If validation fails, the hook blocks the stop and tells the worker why, so the _same_ worker fixes its own report. For a script that coordinates workers, the `--json-schema` option of headless runs or the SDK's structured outputs (the SDK is Claude's library for running agents from your own code) make a whole run return schema-shaped data instead of prose.
- **Verify at four levels**: Each worker's output, the integrated result where the pieces meet, the delivery (what you shipped is what you claimed), and the workflow (nothing got skipped). Passing worker checks don't mean the combination passes.
- **Send a skeptic for the findings that drive decisions**: Another agent, with fresh context, whose job is to disprove the claim. [Agent reviewers](verification-and-evidence.md#agent-reviewers) covers how to set up a reviewer who disagrees instead of agreeing.

### Failure modes and anti-patterns

- **Hidden authority**: Telling an agent it shouldn't edit files doesn't make it a read-only agent. Permissions do. A worker can inherit shell access, network access, or credentials that it shouldn't have.
- **Vague delegation**: "Investigate everything" creates sprawling research and unclear results. Narrow the question. A vague "senior engineer" agent causes overlap and confusion for the same reason.
- **Duplicate effort**: Two workers exploring the same path double the cost for nothing.
- **Premature fan-out**: Your subagents are off implementing against an imagined interface, and then the main agent ends up rewriting everything. Resolve the shared decisions first.
- **A long persona instead of a worker contract**: Great, now you've spent a bunch of time dictating its tone. Focus on purpose, method, authority, shape, and a stopping condition.
- **The security expert with decades of experience**: The fictional résumé doesn't do as much as you think. Name the trigger and the deliverable.
- **Routing around a denial**: Spawning a new agent to get past something that was just denied. If the denial was right, you've bypassed it. If it was wrong, fix the rule.

## Skill or subagent?

You've got a recurring job. Maybe it's a code review, or a migration, or an investigation you keep running by hand. Should it be a skill or a subagent?

It looks like a fork in the road. It mostly isn't. The two stack, and the real work is deciding which layer carries what.

### The deciding question

Ask: _do I need reusable instructions, or do I need another execution context?_

A skill is knowledge: how to do the work. A subagent is a worker, with its own context, tools, and permissions. Here's the table I use:

| Need                                   | Mechanism                           |
| -------------------------------------- | ----------------------------------- |
| One-off instruction                    | **Prompt**                          |
| Reusable knowledge                     | **Skill**                           |
| Reusable procedure                     | **Skill**                           |
| Project-wide conventions               | **`CLAUDE.md` or `AGENTS.md`**      |
| Independent context                    | **Subagent**                        |
| Parallel reasoning                     | **Subagents**                       |
| Independent adversarial opinion        | **Subagent**                        |
| Huge investigation you want compressed | **Subagent**                        |
| Different model, tools, or permissions | **Subagent**                        |
| Deterministic repeated behavior        | **[Hook](hooks.md), script, or CI** |
| External capability                    | **Tool or MCP server**              |

An MCP server is a program that adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/). [Skills versus tools](skills.md#skills-versus-tools) covers that last row.

### Who owns what

Most designs end up using both. The method goes in the skill, and the limits on what a worker can do go in the agent definition.

| Layer            | Holds                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Skill            | The method, the evidence requirements, and the report format                                                            |
| Agent definition | Tools, model, the `maxTurns` cap on agentic turns (each one a model request plus its tool calls), memory, and isolation |
| Assignment       | The current revision, the writable paths, the objective, and where the report goes                                      |

Changing facts live in the assignment so the other two layers stay reusable. A note on "boundaries": a skill can say what a worker must not touch, but that's an instruction the model reads. The tools and permissions in an agent definition are enforced. [Configuring Subagents](subagent-configuration.md) covers the second row, and [Delegating well](#delegating-well) covers the third.

What about a forked skill, which is a skill whose body runs as a subagent's task? ([Configuring Skills](skill-configuration.md) explains how `context: fork` works.) With a forked skill, you write the task once. With a subagent, Claude writes a fresh brief for each situation. And only subagents can run several copies in parallel.

### Using a skill to codify your workflow

Here's where it gets fun. A skill can be the instructions the main agent uses to _coordinate_ a workflow, with the harness handling background tasks. The pattern that tends to work:

- **A non-forking orchestrator skill**: It coordinates the other workers. It sees your request, writes the briefs, and reconciles the reports. It doesn't fork because it needs your conversation.
- **Thin agent definitions**: Identity and tools. That's it. The report format lives in the shared skill.
- **One shared skill preloaded into every worker**: The common method lives in one place, so five agents don't drift into five versions of it.

Build the orchestrator _last_. Get two or three workers earning their keep with hand-written briefs first.

Okay, imagine we're migrating an app to React 19:

1. Migrate the shared foundation first, in one pass.
2. Run one worker per feature slice, each in its own [worktree](worktrees.md).
3. Have every worker produce the same report format, checked by a script.
4. Merge the slices one at a time, running the full suite after each.
5. Fold each report's list of patterns the skill _didn't_ cover back into the skill.

That last step is the whole point. The skill gets better every time you run it.

### Workflows with subagents

These are the shapes I reach for. The arrows show how work flows between many workers and one coordinator.

- **Parallel investigation** (`N readers → 1 writer`): Partition by question. The coordinator then implements in one pass, as a single agent holding the whole picture, so the code stays coherent. This is the best first pattern.
- **Planner, implementer, verifier**: The verifier gets the requirements and the final diff in fresh context, and may return no findings.
- **Independent review lenses** (`1 diff × N lenses`): Security, concurrency, coverage. Same revision, and no reviewer sees another's conclusion first.
- **Parallel implementation after contract freeze** (`freeze → fan out → merge`): Lock the interfaces between pieces before anyone builds against them. Then fan out with disjoint deliverables, and integrate in dependency order.
- **Batch migration** (`1 proven → N units`): Prove one unit first. Group by testable package, not by file. Keep lockfiles central: only the coordinator updates them, after the merges, so parallel workers don't conflict. Try a codemod, a script that rewrites code mechanically.
- **Competing hypotheses** (`N hypotheses → 1 evaluator`): Each seeks disconfirming evidence. Pick with an evaluator you fixed before the run (a test, a script, or a reviewer agent), so nobody chooses after seeing the results. Don't blend candidates.

When the fan-out is predictable enough to write down as code, [Dynamic Workflows](dynamic-workflows.md) covers scripts that orchestrate subagents for you. And when workers need to talk to each other mid-task, that's [Agent Teams](agent-teams.md).

## The cost of context

Subagents don't inherit their parent's noise, and they keep their own noise isolated. In a perfect world, the main agent hands over just what the subagent needs, and the subagent reports back just what the main agent needs.

But if each parallel subagent has to redo the same work, you're multiplying the token cost. Think about how information moves through your workflow.

And spawning has a price of its own. A subagent costs somewhere around 7.5k–44k tokens before it does anything at all.

### Context isolation is not environment isolation

A fresh conversation does _not_ get its own files, databases, ports, credentials, or browser profiles. Two subagents editing the same working directory are still editing the same working directory. [Worktrees](worktrees.md) (extra checkouts of the same Git repository, each in its own directory with its own files and branch) are how you fix that, and they're a deep rabbit hole.

A subagent buys you a clean head. It doesn't buy you a clean desk. Put the method in a skill, the boundaries in a definition, and today's facts in the assignment.
