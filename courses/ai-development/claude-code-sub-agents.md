---
title: Claude Code Subagents
description: >-
  Use Claude Code subagents for isolated exploration, planning, implementation,
  background work, memory, and specialized tool access.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code subagents](https://code.claude.com/docs/en/sub-agents) are agents
with their own context, tools, model, permissions, and optional memory. They are
useful when one part of the task can be isolated from the main conversation.

I use them when isolation makes the main thread simpler, not when I want the task
to look more advanced than it is.

## Built-In Agents

Claude Code includes built-in agents such as Explore, Plan, and
general-purpose. Explore is useful for read-only investigation. Plan is useful
for design. The general-purpose agent can take on broader work when you need a
helper with tool access.

Pick the agent by job, not by novelty.

## Custom Agents

Project agents can live in `.claude/agents/`:

```md
---
name: regression-finder
description: Find the closest missing regression test for a described bug.
tools:
  - Read
  - Grep
  - Glob
model: sonnet
permissionMode: plan
---

Inspect the changed files and closest tests. Return missing coverage with file
references. Do not edit files.
```

Agent frontmatter can also control disallowed tools, MCP servers, hooks, maximum
turns, skills, effort, background behavior, and isolation.

## Background Subagents

Background subagents are useful for independent research. Current Claude Code
surfaces background subagent permission prompts in the main session, which makes
their actions easier to audit.

Give background agents a tight return contract:

```text
Return only confirmed findings, file references, and whether the main task
should stop.
```

## Agent Memory

Subagents can maintain memory. Use that for repeated specialist behavior, not for
facts that should be committed to the repository. If the memory affects future
correctness, move it into a rule, skill, test, or documentation file.
