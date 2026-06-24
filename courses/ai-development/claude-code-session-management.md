---
title: Claude Code Session Management
description: >-
  Manage Claude Code sessions across terminal, IDE, desktop, web, compaction,
  continuation, and remote workflows.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code](https://code.claude.com/docs/en/overview) sessions are working
memory plus tool state. Treat them as useful but temporary. Durable project
knowledge belongs in files such as `CLAUDE.md`, `.claude/rules/*.md`, skills,
tests, and scripts.

## Start with Orientation

For a new repository, begin with a read-only request:

```text
Read this repository and summarize the build, test, lint, and release commands.
Do not edit files. Cite the files you used.
```

That gives you a quick signal on whether Claude understands the project shape.
If it invents commands, fix the context before asking it to change code.

## Keep Sessions Bounded

Long sessions accumulate assumptions. When the task changes, start a new session
or compact deliberately. A good session has one goal, one verification path, and
one final diff.

Use continuation when you are still inside the same goal. Start fresh when you
are changing goals, reviewing unrelated code, or switching repositories.

## Surfaces

Claude Code is available in more places than the terminal: IDE integrations,
desktop, web, remote control workflows, and automation surfaces. The same
principle applies everywhere: the session can help you work, but the repository
files must remain the source of truth.

## Session Handoff

When you hand work between Claude Code and another tool, summarize the filesystem
state, not the chat:

```bash
git status --short
git diff --stat
git diff
```

The next tool should be able to continue from the branch, tests, and files. If it
needs the chat transcript to understand correctness, the work is not packaged
well enough yet.
