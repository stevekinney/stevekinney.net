---
title: Skills
description: 'A skill is reusable knowledge the agent loads on demand. Its anatomy, what separates it from a saved prompt or a tool, and what it costs.'
---

You've told the agent the same thing four times this week. How to run the migration. How to investigate a failed contract test. Which of the three release scripts is the real one. Each time, you retype it, and each time, it's slightly different.

You could put it all in `CLAUDE.md`. But then every session (one conversation with the agent) pays for it, whether or not the task has anything to do with migrations. A **skill** is the other answer.

## What a skill is

A skill is reusable knowledge about how to perform a recurring task. It should activate narrowly.

A skill lives in a folder. At the very least, that folder needs a `SKILL.md` file, which describes when to use the skill and how to do the work. Put the folder in `.claude/skills/` for a project, in `~/.claude/skills/` for yourself, or ship it in a plugin (a bundle of skills, hooks, and other pieces you install together). You invoke a skill by typing `/skill-name`, or the agent loads it on its own when the task matches the description. (Skills follow an [open standard](https://agentskills.io), and Claude Code's [skills documentation](https://code.claude.com/docs/en/skills) covers its own extensions.)

It's not totally wrong to think of a skill as a _saved prompt_, with two differences. The agent can decide on its own to load a skill into its context, which is usually what you want. And a skill can hold supporting detail that loads only when it's needed.

That saves you from shoving _everything_ into your instruction file: `CLAUDE.md` for Claude Code, `AGENTS.md` in Codex. The harness (the program wrapped around the model) loads those according to directory scope, with descendant Claude Code instructions discovered on demand. Write your descriptions well, and a skill lazy-loads instructions only when they're needed.

## What a skill isn't

A skill is _not_ a capability grant. It doesn't add any new tools to the harness. It can explain how to use a tool, and that tool could be a command-line program that happens to be on your machine. A skill's `allowed-tools` field can pre-approve tools you already have, so you aren't prompted ([Configuring Skills](skill-configuration.md) covers it), but that never overrides a deny rule.

A skill can _say_ a release requires passing tests. Your release infrastructure should _enforce_ it. We'll look at that gap between asking and enforcing in [The Enforcement Ladder](the-enforcement-ladder.md).

## Anatomy of a skill

A skill has up to five parts:

- **Name and description**: The discovery surface. This is what the agent sees when it's deciding whether the skill applies.
- **Main body**: The procedure the agent follows after the skill activates.
- **Reference files**: Extra detail that's read only when needed.
- **Scripts**: Code the agent runs for deterministic work, so it doesn't have to improvise.
- **Assets**: Templates the result is built from.

Here's what that looks like for a database migration skill:

```text
database-migration/
├── SKILL.md
├── references/
│   ├── postgres.md
│   └── mysql.md
├── scripts/
│   └── validate.sh
└── assets/
    └── report-template.md
```

The agent reads `SKILL.md` first. It only opens `postgres.md` if the migration is for Postgres. That's the whole trick.

## What makes a good skill

Here's what separates a good skill from a saved prompt. Most of it lives in the body. The trigger goes in the description, local evidence in reference files, and mechanical helpers in scripts. A deliverable template, if you need one, goes in assets.

- **Trigger**: The task it applies to, plus the near-misses where it should _not_ activate.
- **Procedure**: Decisions and ordered steps, _not_ just a list of virtues.
- **Local evidence**: Relevant examples, conventions, schemas, or documented constraints.
- **Mechanical helpers**: Existing commands or small scripts for repetitive, checkable work.
- **Deliverable**: A patch, reproduction, compatibility matrix, test report, or other inspectable result.
- **Boundaries**: What it must _not_ modify, what needs approval, and when it should stop.
- **Inputs**: What the skill expects to be handed before it starts.
- **Proof**: How success gets demonstrated, not just announced.
- **Retry safety**: Which steps are safe to run again if something falls over halfway through.

### Does this line change a decision?

Ask that of every line in the body.

"Handle errors properly" doesn't. The model isn't going to read that and think, "Oh, _properly_. Got it."

Match how much you prescribe to how fragile the task is:

- **An investigation**: Specify the evidence you want back.
- **Generated output**: Hand it a schema.
- **A destructive change**: Give it the exact command. This is _not_ the place for creative interpretation.

## What a skill costs

Skills load in stages, and every stage has a price tag. (Costs here are measured in _tokens_, the chunks of text a model reads and writes. [Prompt Caching and Cost](caching-and-cost.md) explains why they matter.)

- **Name and description**: Every model-invocable skill sits in the discovery listing whether or not it ever gets used. That's roughly 100 tokens for a typical short description, closer to 250 at the 1,024-character limit. Thirty typical skills is about 3,000 tokens before you've typed a word. In Claude Code, manual-only skills with `disable-model-invocation: true` stay out of the listing, so they cost nothing until invoked. The [invocation table](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill) distinguishes these cases; use `/context` to measure the actual listing after its budget is applied.
- **Body**: An inline skill's body loads into the caller when invoked and stays there across later turns, subject to compaction. With `context: fork`, the body becomes a separate worker's task instead, and the caller gets the worker's summarized result, not a session-long copy. [Running skills in a subagent](https://code.claude.com/docs/en/skills#run-skills-in-a-subagent) explains the distinction.
- **Reference files**: Free until something actually reads them.
- **Scripts**: You pay for their output, not their source.

Keep `SKILL.md` under 500 lines. If it's pushing past that, some of it probably wants to be a reference file.

## Skills versus instructions

The line between a skill and an instruction in `CLAUDE.md` is pretty clean:

- **Instruction**: "All changes to billing must run the contract tests."
- **Skill**: "How to investigate a failed billing contract test."

An instruction is a rule that's true all the time. A skill is a procedure for when something specific happens. See [User and Project Instructions](user-and-project-instructions.md) for the first kind.

## Skills versus tools

You want the agent to check a package registry before upgrading a dependency. Do you write a skill? Install an MCP server (a program that adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/))? Write a script? The question sounds like it has one right answer. It's really two questions mixed together: _can_ the agent do the thing, and does it know how to do it well?

Your harness comes with built-in **tools**: the actions the agent can take, like `WebFetch`, `WebSearch`, `Read`, `Write`, and `Bash`.

You can't _really_ add tools to the harness. That's only half-true, so bear with me. You can install a command-line program for the agent to call through `Bash`, or you can install an MCP server.

Honestly, this is mostly pedantic. A skill can include a script that `Bash` calls. So when this course says "tool," it means any action the agent can take: the built-ins, a command-line program run through `Bash`, or a tool an MCP server provides.

For our purposes, the distinction looks a little something like this:

- **Tool**: Query package registry data.
- **Skill**: Interpret version changes, reproduce them, and report compatibility risk.

A tool is something the harness _can do_. A skill is instructions about _how_ to do that given thing well. A tool without a skill gives the agent a capability and no judgment. A skill without a tool is advice the agent has no way to act on.

## Anatomy of a tool call

What happens when an agent "uses a tool" explains a bunch of behavior that otherwise seems arbitrary. There are four steps:

1. **Definition**: Every tool has a name, a description, and a JSON schema for its input (a machine-readable description of the arguments it accepts). These live up front with the system prompt (the harness's built-in instructions to the model), so every tool, built-in or added, costs tokens on every request, whether or not it ever gets called. MCP tools are the exception by default, as you'll see below.
2. **Call**: The model doesn't run anything. It emits a structured request: this tool, with these arguments.
3. **Execution**: The harness checks permissions and runs any [hooks](hooks.md) (scripts it runs automatically at set points), then runs the tool.
4. **Result**: The output is appended to the conversation as a tool result, and the model reads it when it decides its next step.

A few implications fall out of that:

- **The description _is_ the interface**: The model decides whether and how to call a tool based entirely on its name, description, and schema. A vague description means a tool that gets misused or never gets used. (Sound familiar? Same goes for a skill's description.)
- **Tool definitions sit in the cached prefix**: The provider caches the start of the conversation, and tool definitions are part of it. Adding or removing tools mid-session can invalidate your [prompt cache](caching-and-cost.md). That's why Claude Code defers MCP tool definitions behind tool search by default, loading each one on demand, which keeps their cost off every request.
- **The result is just more text in the context**: It costs tokens, it can get truncated, and it can contain instructions the model might follow. Content that arrives through a tool result is untrusted input. We'll look at what that means in [Blast radius](the-enforcement-ladder.md#blast-radius).

Install the tool for the capability. Write the skill for the judgment.

## Where to go next

The settings that control how a skill activates are in [Configuring Skills](skill-configuration.md). If you're wondering whether a recurring job should be a skill or a helper agent, [Skill or subagent?](subagents.md#skill-or-subagent) draws that line. And before you write one from scratch, [Exemplar Skills](exemplar-skills.md) is worth ten minutes.

If you can't say what the agent keeps getting wrong, don't write the skill yet.
