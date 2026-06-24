---
title: Cursor Checkpoints
description: >-
  Use Cursor checkpoints to inspect, compare, and recover from agent edits
  without confusing rollback with review.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com) creates checkpoints during agent work. A checkpoint
is a recoverable snapshot of the workspace state around an agent turn. It gives
you a practical escape hatch when an agent takes a wrong turn.

## What Checkpoints Are Good For

Use checkpoints to:

- Compare the current result with an earlier step.
- Restore a file or workspace state after a bad edit.
- Understand which prompt caused a change.
- Recover quickly from an agent loop.

They are especially useful during exploratory refactors because you can let the
agent try a path without committing to it.

## What Checkpoints Are Not

A checkpoint is not a code review, a test run, or a version control strategy.
Cursor can restore an earlier state, but it cannot tell you whether the earlier
state was correct.

Keep using [Git](https://git-scm.com/) for durable history:

```bash
git status --short
git diff
bun run lint
bun run test:unit
```

Checkpoints help you recover within an agent session. Commits help your team
understand the project history.

## A Practical Pattern

Before a risky agent task:

1. Start from a clean working tree when possible.
2. Ask Cursor for a plan before edits.
3. Let the agent implement one bounded unit.
4. Inspect the diff.
5. Run the verification command.
6. Commit only after the result is understandable without the chat transcript.

If the agent makes a broad, hard-to-review change, roll back to the checkpoint
and ask for a smaller unit of work.
