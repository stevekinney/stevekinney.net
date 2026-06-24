---
title: Subagent Anti-Patterns
description: >-
  Avoid over-splitting work across subagents, losing ownership, duplicating
  context, and accepting unaudited parallel output.
modified: 2026-06-24
date: 2025-07-29
---

Subagents are useful when they reduce context pressure. They are harmful when
they create an illusion of rigor without a clear owner.

## Anti-Pattern: Splitting Tiny Work

Do not create a subagent to rename a function, update one test, or read one file.
The overhead is larger than the task.

Use a subagent when the work has a natural boundary: security review, test audit,
repository orientation, browser reproduction, or release checklist.

## Anti-Pattern: No Return Contract

Bad:

```text
Have a subagent look into this.
```

Better:

```text
Ask a read-only subagent to inspect authentication tests. Return confirmed gaps
only, with file references and the exact regression each test should cover.
```

Subagent output should be easy to accept, reject, or turn into a task.

## Anti-Pattern: Parallelizing Shared State

Two agents editing the same files at once will often fight. Parallelize research,
not overlapping writes. If multiple agents need to edit, give each one exclusive
files or sequence the work.

## Anti-Pattern: Treating Subagents as Review

A subagent can help review, but the main agent or human still owns the decision.
Run the tests, inspect the diff, and resolve conflicts in one place.

The best subagent output is narrow enough that it improves the main workflow
instead of becoming a second workflow.
