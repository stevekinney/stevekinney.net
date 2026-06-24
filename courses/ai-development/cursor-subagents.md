---
title: Cursor Subagents
description: >-
  Use Cursor subagents for isolated research, shell, browser, and specialized
  repository tasks without over-splitting the work.
modified: 2026-06-24
date: 2026-06-23
---

[Cursor subagents](https://cursor.com/docs/subagents) are specialized agents with
their own context. They can run in the editor, the command line interface, and
Cloud Agents.

The value is isolation. A subagent can inspect one concern deeply without
polluting the main agent's context with every intermediate detail.

## Built-In Subagents

Cursor includes built-in subagents such as Explore, Bash, and Browser. They are
useful for bounded tasks:

- Explore: inspect a repository or design space.
- Bash: run terminal-heavy investigation.
- Browser: inspect web or application behavior.

Use them when the task shape matches the tool. Do not split work just to make
the prompt look sophisticated.

## Custom Subagents

Custom subagents live in `.cursor/agents/`:

```md
---
name: test-auditor
description: Find missing regression coverage for a described bug.
model: auto
readonly: true
---

Inspect the changed files and closest tests. Report missing coverage with file
references. Do not edit files.
```

Cursor also supports compatible agent definitions from `.claude/agents` and
`.codex/agents`, which is useful in mixed-agent repositories.

## Foreground and Background Work

A foreground subagent blocks the main task until it returns. A background
subagent can continue while the main agent proceeds. Background work is useful
for independent research, but it needs a crisp return format:

```text
Return only: findings, file references, and whether the main task should stop.
```

Without a return contract, parallel work often creates more context than value.

## When Not to Use a Subagent

Do not use subagents for tiny edits, single-file fixes, or tasks where one
developer needs to keep the whole mental model in view. Subagents are a way to
reduce context pressure, not a way to avoid thinking.
