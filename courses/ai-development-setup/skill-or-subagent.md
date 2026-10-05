---
title: Skill or Subagent?
description: 'Ask whether you need reusable instructions or another execution context, then split the method, the boundaries, and the assignment across the right layers.'
---

You've got a recurring job. Maybe it's a code review, or a migration, or an investigation you keep running by hand. Should it be a skill or a subagent?

It looks like a fork in the road. It mostly isn't. The two stack, and the real work is deciding which layer carries which concern.

## The deciding question

Ask: _do I need reusable instructions, or do I need another execution context?_

A [skill](skills.md) is knowledge: how to do the work. A [subagent](subagents.md) is a worker: a helper agent with its own context, tools, and permissions. Here's the table I use:

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

`CLAUDE.md` (for Claude Code) and `AGENTS.md` (for Codex) are the instruction files the harness, the program wrapped around the model, loads according to directory scope, with descendant Claude Code instructions discovered on demand. An MCP server is a program that adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/). [Skill or Tool?](skill-or-tool.md) covers that last row.

## Who owns what

Most designs end up using both. The method goes in the skill, and the limits on what a worker can do go in the agent definition.

| Layer            | Holds                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Skill            | The method, the evidence requirements, and the report format                                                            |
| Agent definition | Tools, model, the `maxTurns` cap on agentic turns (each one a model request plus its tool calls), memory, and isolation |
| Assignment       | The current revision, the writable paths, the objective, and where the report goes                                      |

The assignment is the task you hand over each time. Keep changing facts there so the other two layers stay reusable. A note on "boundaries": a skill can say what a worker must not touch, but that's an instruction the model reads. The tools and permissions in an agent definition are enforced. [Configuring Subagents](subagent-configuration.md) covers the second row, and [Delegating Well](delegating-well.md) covers the third.

What about a forked skill, which is a skill whose body runs as a subagent's task? ([Configuring Skills](skill-configuration.md) explains how `context: fork` works.) With a forked skill, you write the task once. With a subagent, Claude writes a fresh brief for each situation. And only subagents can run several copies in parallel.

## Using a skill to codify your workflow

Here's where it gets fun. A skill can be the set of instructions the main agent uses to _coordinate_ a workflow, with the harness handling background tasks and the rest.

The pattern that tends to work:

- **A non-forking orchestrator skill**: An orchestrator skill is one that coordinates other workers. It sees your request, writes the briefs, and reconciles the reports. It doesn't fork because it needs your conversation.
- **Thin agent definitions**: Identity and tools. That's it. The report format lives in the shared skill.
- **One shared skill preloaded into every worker** (loaded in full when the worker starts): The common method lives in one place, so five agents don't drift into five versions of it.

Build the orchestrator _last_. Get two or three workers earning their keep with hand-written briefs first.

Okay, imagine we're migrating an app to React 19:

1. Migrate the shared foundation first, in one pass.
2. Run one worker per feature slice, each in its own worktree (a separate checkout of the repository).
3. Have every worker produce the same report format, checked by a script.
4. Merge the slices one at a time, running the full suite after each.
5. Fold each report's list of patterns the skill _didn't_ cover back into the skill.

That last step is the whole point. The skill gets better every time you run it.

## Context strategy

Every way of handing a worker its context trades one thing for another:

| Strategy                                                      | Gain                 | Cost                      |
| ------------------------------------------------------------- | -------------------- | ------------------------- |
| Fresh worker (starts from the brief alone)                    | Clean focus          | Missing implicit facts    |
| Forked context (a copy of your conversation)                  | Inherits decisions   | Repeated context and cost |
| Durable brief (a saved assignment you send to a fresh worker) | Reusable, reviewable | Must be maintained        |

The first two are ways to start a worker. A durable brief is an assignment you've saved because it repeats, so it pairs with a fresh worker instead of competing with it. All three [cost](caching-and-cost.md) something. Pick the cost you'd rather pay.

## Workflows with subagents

These are the shapes I reach for. The arrows show how work flows, from many workers to one decider or the other way around. The coordinator is the main agent or script that hands out the work and decides what's accepted.

- **Parallel investigation** (`N readers → 1 writer`): Partition by question. The coordinator then implements in one pass, as a single agent holding the whole picture, so the code stays coherent. This is the best first pattern.
- **Planner, implementer, verifier**: The verifier gets the requirements and the final diff in fresh context, and may return no findings.
- **Independent review lenses** (`1 diff × N lenses`): Security, concurrency, coverage. Same revision, and no reviewer sees another's conclusion first.
- **Parallel implementation after contract freeze** (`freeze → fan out → merge`): Freeze the contract by agreeing on and locking the interfaces between pieces before anyone builds against them. Then fan out with disjoint deliverables, and integrate in dependency order.
- **Batch migration** (`1 proven → N units`): Prove one unit first. Group by testable package, not by file. Keep lockfiles central: only the coordinator updates them, after the merges, so parallel workers don't conflict. Try a codemod, a script that rewrites code mechanically.
- **Competing hypotheses** (`N hypotheses → 1 evaluator`): Each seeks disconfirming evidence. Pick with an evaluator you fixed before the run (a test, a script, or a reviewer agent), so nobody chooses after seeing the results. Don't blend candidates.

When the fan-out is predictable enough to write down as code, [Dynamic Workflows](dynamic-workflows.md) covers scripts that orchestrate subagents for you. And when workers need to talk to each other mid-task, that's [Agent Teams](agent-teams.md).

Put the method in a skill, the boundaries in a definition, and today's facts in the assignment.
