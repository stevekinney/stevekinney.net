---
title: Git Worktrees for Agentic Development
description: >-
  Use Git worktrees to isolate agent work, run parallel experiments, and keep
  reviewable diffs without losing repository history.
modified: 2026-06-24
date: 2025-07-29
---

[Git worktrees](https://git-scm.com/docs/git-worktree) let one repository have
multiple working directories checked out at different branches. They are useful
with agents because agents produce file changes, and file changes need isolation.

## Why Worktrees Help

Use worktrees when:

- You want to run two agent experiments in parallel.
- A cloud or command line agent should not touch your main working tree.
- You need a clean branch for review while local work continues elsewhere.
- You want to compare two implementation paths without stashing.

## Basic Commands

```bash
git worktree add ../project-feature feature/agent-experiment
git worktree list
git worktree remove ../project-feature
```

Run the agent from inside the worktree:

```bash
cd ../project-feature
claude
```

or:

```bash
agent
```

## Review Discipline

A worktree isolates files. It does not prove correctness. Before merging work
from any agent-created branch:

```bash
git status --short
git diff
bun run lint
bun run test:unit
```

Use worktrees to make parallel work reviewable, not to avoid review.
