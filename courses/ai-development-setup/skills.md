---
title: Skills
description: 'A skill is reusable knowledge the agent loads on demand. Learn its anatomy, what separates it from a saved prompt, and what it costs in tokens.'
---

You've told the agent the same thing four times this week. How to run the migration. How to investigate a failed contract test. Which of the three release scripts is the real one. Each time, you retype it, and each time, it's slightly different.

You could put it all in `CLAUDE.md`. But then every session (one conversation with the agent) pays for it, whether or not the task has anything to do with migrations. A **skill** is the other answer.

## What a skill is

A skill says how to perform a recurring task. It should activate narrowly. It's reusable knowledge about how to act.

A skill lives in a folder. At the very least, that folder needs a `SKILL.md` file, which describes when to use the skill and how to do the work. Put the folder in `.claude/skills/` for a project, in `~/.claude/skills/` for yourself, or ship it in a plugin (a bundle of skills, hooks, and other pieces you install together). You invoke a skill by typing `/skill-name`, or the agent loads it on its own when the task matches the description. (Skills follow an [open standard](https://agentskills.io), and Claude Code's [skills documentation](https://code.claude.com/docs/en/skills) covers its own extensions.)

It's not totally wrong to think of a skill as a _saved prompt_. There are some nuances. For one, the agent can decide on its own to read up on a skill and add it to its context. That's usually what you want. And skills let you load supporting detail only when it's needed.

That saves you from shoving _everything_ into your instruction file, which is `CLAUDE.md` for Claude Code (or `AGENTS.md` in Codex) and which the harness (the program wrapped around the model) loads at the start of every session. If you write your descriptions well, a skill is a way to lazy-load instructions on an as-needed basis.

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

Here's what separates a good skill from something that's effectively a saved prompt. These are things the content does, and they live in the five parts above: the trigger goes in the description, the procedure, boundaries, inputs, proof, and retry safety go in the body, local evidence goes in reference files, mechanical helpers are scripts, and the deliverable is described in the body, with a template in assets if you need one.

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

Here's a good test for every line in the body: does it change a decision?

"Handle errors properly" doesn't. The model isn't going to read that and think, "Oh, _properly_. Got it."

Match how much you prescribe to how fragile the task is:

- **An investigation**: Specify the evidence you want back.
- **Generated output**: Hand it a schema.
- **A destructive change**: Give it the exact command. This is _not_ the place for creative interpretation.

And before you write one at all, the missing knowledge should be specific enough to actually write down. If you can't articulate what the agent keeps getting wrong, a skill isn't going to articulate it for you.

## What a skill costs

Skills load in stages, and every stage has a price tag. (Costs here are measured in _tokens_, the chunks of text a model reads and writes. [Prompt Caching and Cost](caching-and-cost.md) explains why they matter.)

- **Name and description**: Sent with _every_ request, at roughly 100 tokens for a typical short description (one at the 1,024-character limit is closer to 250), whether or not the skill ever gets used. Thirty typical skills is about 3,000 tokens of overhead before you've typed a word.
- **Body**: Loads when the skill is invoked and then sticks around for the rest of the session.
- **Reference files**: Free until something actually reads them.
- **Scripts**: You pay for their output, not their source.

Keep `SKILL.md` under 500 lines. If it's pushing past that, some of it probably wants to be a reference file.

## Skills versus instructions

The line between a skill and an instruction in `CLAUDE.md` is pretty clean:

- **Instruction**: "All changes to billing must run the contract tests."
- **Skill**: "How to investigate a failed billing contract test."

An instruction is a rule that's true all the time. A skill is a procedure for when something specific happens. See [User and Project Instructions](user-and-project-instructions.md) for the first kind.

## Where to go next

The settings that control how a skill activates are in [Configuring Skills](skill-configuration.md). If you're wondering whether what you have is a skill at all, [Skill or Tool?](skill-or-tool.md) draws the line between a skill and a tool, and [Skill or Subagent?](skill-or-subagent.md) draws the line between a skill and a helper agent. And before you write one from scratch, [Adapting Prior Art](adapting-prior-art.md) is worth ten minutes.

If you can't say what the agent keeps getting wrong, don't write the skill yet.
